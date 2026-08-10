"use strict";

/* ============================================================
   Seed Code Chat — GET /api/models
   ------------------------------------------------------------
   Fetches the OpenRouter model catalog using the current active
   key (managed by api-key-manager.js).

   On a key/quota/rate-limit failure (401/402/403/429) from the
   active key, the handler advances to the NEXT key and returns a
   clean error. The failed request is NOT retried.

   Uses global fetch. No external dependencies.
   ============================================================ */

var keyManager = require("./api-key-manager");

var BASE_URL = "https://openrouter.ai/api/v1";

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function extractErrorMessage(payload, status) {
  var message = "Request failed with status " + status + ".";
  if (!payload) return message;
  try {
    var parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
    if (parsed.error) {
      if (typeof parsed.error === "string") return parsed.error;
      if (parsed.error.message) return String(parsed.error.message);
    }
    if (parsed.message) return String(parsed.message);
  } catch (e) {
    /* not JSON — fall through to raw snippet */
  }
  var raw = String(payload);
  return raw ? raw.slice(0, 300) : message;
}

module.exports = async function modelsHandler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: { message: "Method not allowed. Use GET /api/models." } });
    return;
  }

  var apiKey = keyManager.getActiveApiKey();
  if (!apiKey) {
    sendJson(
      res,
      503,
      { error: { message: "All OpenRouter API keys are exhausted. Please try again later." } }
    );
    return;
  }

  var openRouter;
  try {
    openRouter = await fetch(BASE_URL + "/models", {
      headers: {
        Authorization: "Bearer " + apiKey,
        Accept: "application/json",
      },
    });
  } catch (e) {
    sendJson(res, 502, { error: { message: "Could not reach OpenRouter. Please try again." } });
    return;
  }

  if (!openRouter.ok) {
    var status = openRouter.status;
    var errorPayload = await openRouter.text().catch(function () {
      return "";
    });
    var message = extractErrorMessage(errorPayload, status);

    if (keyManager.isSwitchableStatus(status)) {
      keyManager.switchToNextApiKey();
    }

    sendJson(res, status >= 500 && status < 600 ? 502 : status, {
      error: { message: message },
    });
    return;
  }

  var data = await openRouter.json().catch(function () {
    return { data: [] };
  });
  sendJson(res, 200, data);
};