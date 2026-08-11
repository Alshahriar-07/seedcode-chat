"use strict";

/* ============================================================
   Seed Code Chat — POST /api/chat
   ------------------------------------------------------------
   OpenRouter proxy backed by keyManager.js.

   Flow:
     client -> this handler -> current runtime key -> OpenRouter
             -> stream SSE back to client

   On a retryable key/quota/rate/server failure
   (401/402/403/429/500/502/503/504) BEFORE streaming begins, the
   handler advances to the NEXT key and retries the SAME request
   once per key (max 6). After the last key the request fails.

   Normal request/model errors (400/404/422) never switch keys.

   Each request keeps its OWN local retry sequence so concurrent
   requests never interfere with one another. Once streaming has
   started, keys are never switched and the stream is never
   restarted.

   Only OpenRouter. Uses global fetch. No external dependencies.
   ============================================================ */

var keyManager = require("./keyManager");

var BASE_URL = "https://openrouter.ai/api/v1";

/* ------------------------------------------------------------
   Small HTTP helpers
   ------------------------------------------------------------ */

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function cleanError(message) {
  return { error: { message: message } };
}

function extractErrorMessage(payload, status) {
  var message = "Request failed with status " + status + ".";
  if (!payload) return message;
  try {
    var parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
    if (parsed.error) {
      if (typeof parsed.error === "string") return parsed.error;
      if (parsed.error.message) return String(parsed.error.message);
      if (parsed.error.code) return String(parsed.error.code);
    }
    if (parsed.message) return String(parsed.message);
  } catch (e) {
    /* not JSON — fall through to raw snippet */
  }
  var raw = String(payload);
  return raw ? raw.slice(0, 300) : message;
}

function readJsonBody(req) {
  return new Promise(function (resolve, reject) {
    if (req.body && typeof req.body === "object") {
      resolve(req.body);
      return;
    }
    if (typeof req.body === "string") {
      try {
        resolve(JSON.parse(req.body));
      } catch (e) {
        reject(e);
      }
      return;
    }
    var raw = "";
    req.on("data", function (chunk) {
      raw += chunk;
    });
    req.on("end", function () {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function addCors(req, res) {
  var origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
}

/* ------------------------------------------------------------
   Handler
   ------------------------------------------------------------ */

module.exports = async function chatHandler(req, res) {
  addCors(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, cleanError("Method not allowed. Use POST /api/chat."));
    return;
  }

  var body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    sendJson(res, 400, cleanError("Request body must be valid JSON."));
    return;
  }

  var model = body && typeof body.model === "string" ? body.model : "";
  var messages = Array.isArray(body && body.messages) ? body.messages : [];

  if (!model) {
    sendJson(res, 422, cleanError("A model is required."));
    return;
  }
  if (!messages.length) {
    sendJson(res, 422, cleanError("At least one message is required."));
    return;
  }

  var keyCount = keyManager.getKeyCount();
  if (keyCount === 0) {
    sendJson(
      res,
      503,
      cleanError("All configured AI API keys are currently unavailable. Please try again later.")
    );
    return;
  }

  var controller = new AbortController();
  req.on("close", function () {
    controller.abort();
  });

  /* Each request walks its OWN local retry sequence starting from
     the manager's preferred key. Failure advances ONLY the local
     sequence, so concurrent requests can never corrupt one another.
     The preferred key is only re-pointed when a request SUCCEEDS,
     keeping a working key in place for subsequent requests.
     At most keyCount attempts (max 6) — no infinite retries. */
  var slot = keyManager.getActiveSlot();
  var attempts = 0;
  var openRouter = null;

  while (attempts < keyCount) {
    attempts += 1;

    var apiKey = keyManager.getKeyAt(slot);

    try {
      openRouter = await fetch(BASE_URL + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          Authorization: "Bearer " + apiKey,
          "HTTP-Referer": req.headers.origin || "https://seedcodechat.vercel.app",
          "X-Title": "Seed Code Chat",
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: typeof body.temperature === "number" ? body.temperature : 0.7,
          max_tokens: typeof body.max_tokens === "number" ? body.max_tokens : 4096,
          stream: true,
          ...(Array.isArray(body.transforms) ? { transforms: body.transforms } : {}),
        }),
        signal: controller.signal,
      });
    } catch (e) {
      sendJson(res, 502, cleanError("Could not reach OpenRouter. Please try again."));
      return;
    }

    if (openRouter.ok) {
      /* Success: keep this key and adopt it as the runtime preferred
         key so subsequent requests continue using it. */
      keyManager.setActiveSlot(slot);
      break;
    }

    var status = openRouter.status;
    var errorPayload = await openRouter.text().catch(function () {
      return "";
    });
    var message = extractErrorMessage(errorPayload, status);

    /* Request/model errors never switch keys — return clean error. */
    if (!keyManager.isSwitchableStatus(status)) {
      sendJson(res, status >= 500 && status < 600 ? 502 : status, cleanError(message));
      return;
    }

    /* Retryable key/quota/rate/server failure: advance only the
       local sequence and retry the SAME request with the next key.
       Streaming has not begun yet, so retrying is safe. */
    console.log("[AI] OpenRouter key slot failed: " + (slot + 1));
    slot = (slot + 1) % keyCount;
    console.log("[AI] Switching to key slot: " + (slot + 1));
  }

  /* Every configured key failed with retryable API failures. */
  if (!openRouter || !openRouter.ok) {
    sendJson(
      res,
      503,
      cleanError("All configured AI API keys are currently unavailable. Please try again later.")
    );
    return;
  }

  /* OpenRouter is responding — relay the SSE stream verbatim to the
     client. No transformation beyond forwarding the byte stream. */
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  if (typeof res.flushHeaders === "function") res.flushHeaders();

  try {
    var reader = openRouter.body.getReader();
    for (;;) {
      var chunk = await reader.read();
      if (chunk.done) break;
      res.write(chunk.value);
      if (typeof res.flush === "function") res.flush();
    }
  } catch (e) {
    controller.abort();
  } finally {
    try {
      res.end();
    } catch (e) {
      /* client already gone */
    }
  }
};