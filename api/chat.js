"use strict";

/* ============================================================
   Seed Code Chat — POST /api/chat
   ------------------------------------------------------------
   Simple OpenRouter proxy for a single API key.

   Flow:
     client -> this handler -> getActiveApiKey() -> OpenRouter
             -> stream SSE back to client

   On a key/quota/rate-limit failure (401/402/403/429) from the
   active key, the handler advances to the NEXT key and returns a
   clean error. The failed request is NOT retried.

   Only OpenRouter. Uses global fetch. No external dependencies.
   ============================================================ */

var keyManager = require("./api-key-manager");

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

  /* Every normal request uses ONLY the current active key. */
  var apiKey = keyManager.getActiveApiKey();
  if (!apiKey) {
    sendJson(
      res,
      503,
      cleanError("All OpenRouter API keys are exhausted. Please try again later.")
    );
    return;
  }

  var controller = new AbortController();
  req.on("close", function () {
    controller.abort();
  });

  var openRouter;
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

  if (!openRouter.ok) {
    var status = openRouter.status;
    var errorPayload = await openRouter.text().catch(function () {
      return "";
    });
    var message = extractErrorMessage(errorPayload, status);

    /* A key/quota/rate-limit failure on the ACTIVE key advances the
       active key to the next one. The failed request is NOT retried —
       the NEXT user request uses the new key. */
    if (keyManager.isSwitchableStatus(status)) {
      keyManager.switchToNextApiKey();
    }

    sendJson(res, status >= 500 && status < 600 ? 502 : status, cleanError(message));
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