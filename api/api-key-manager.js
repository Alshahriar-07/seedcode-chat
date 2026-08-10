"use strict";

/* ============================================================
   Seed Code Chat — OpenRouter API Key Manager
   ------------------------------------------------------------
   This module manages exactly ONE thing: which OpenRouter
   server-side key is currently active.

   Keys come from Vercel environment variables:
     OPENROUTER_API_KEY_1 .. OPENROUTER_API_KEY_6

   Normal request flow (every request):

     POST /api/chat
       -> getActiveApiKey()
       -> OpenRouter
       -> stream response
       -> frontend

   No retries. No fallback chains. No trying all six keys.

   Switch flow — ONLY when the active key fails with
   401 / 402 / 403 / 429:

     KEY 1 -> KEY 2 -> KEY 3 -> KEY 4 -> KEY 5 -> KEY 6

   After KEY 6 is exhausted, getActiveApiKey() returns null and
   the backend returns a clean error.

   The failed request is NEVER retried with the next key. The
   switch simply makes the NEXT request use the next key.

   Keys are never logged and never sent to the client.
   ============================================================ */

var KEY_ENV = [
  "OPENROUTER_API_KEY_1",
  "OPENROUTER_API_KEY_2",
  "OPENROUTER_API_KEY_3",
  "OPENROUTER_API_KEY_4",
  "OPENROUTER_API_KEY_5",
  "OPENROUTER_API_KEY_6",
];

/* Only these status codes cause a key switch.
   400 / 404 / 422 are client/model errors and do NOT switch. */
var SWITCHABLE_STATUSES = [401, 402, 403, 429];

function loadConfiguredKeys() {
  return KEY_ENV.map(function (name) {
    var value = process.env[name];
    return value && typeof value === "string" ? value.trim() : "";
  }).filter(Boolean);
}

var configuredKeys = loadConfiguredKeys();
var currentIndex = 0;

/* ------------------------------------------------------------
   Public API
   ------------------------------------------------------------ */

function getActiveApiKey() {
  if (configuredKeys.length === 0) return null;
  if (currentIndex >= configuredKeys.length) return null;
  return configuredKeys[currentIndex];
}

function switchToNextApiKey() {
  currentIndex += 1;
  return getActiveApiKey();
}

function isSwitchableStatus(status) {
  return SWITCHABLE_STATUSES.indexOf(Number(status)) >= 0;
}

/* Diagnostics only — never contains an actual key. */
function describe() {
  return {
    configured: configuredKeys.length,
    activeIndex: currentIndex,
    switchableStatuses: SWITCHABLE_STATUSES.concat(),
  };
}

/* ------------------------------------------------------------
   Vercel serverless note
   ------------------------------------------------------------
   The active key is a simple in-memory variable. Vercel may run
   each request in a fresh or recycled function process, so this
   in-memory value is NOT guaranteed to persist between requests.

   This is intentional and kept as simple as possible per project
   rules: WORKING BACKEND > SOPHISTICATED KEY ROTATION. If durable
   rotation across requests is ever needed, add persistent state
   (e.g. Vercel KV) — deliberately outside the current scope.
   ------------------------------------------------------------ */

module.exports = {
  getActiveApiKey: getActiveApiKey,
  switchToNextApiKey: switchToNextApiKey,
  isSwitchableStatus: isSwitchableStatus,
  describe: describe,
};