"use strict";

/* ============================================================
   Seed Code Chat — OpenRouter runtime key manager
   ------------------------------------------------------------
   Small backend-only layer that supplies the CURRENT runtime
   OpenRouter key and advances to the NEXT key after a retryable
   OpenRouter failure.

   Server-side environment keys (NEVER exposed to the browser):

     OPENROUTER_API_KEY_1 .. OPENROUTER_API_KEY_6

   One key is active per server process. Initial active key is
   slot 1. Retryable failures move the active slot forward and
   wrap around:

     KEY_1 -> KEY_2 -> .. -> KEY_6 -> KEY_1

   Retryable (switch) statuses:
     401, 402, 403, 429, 500, 502, 503, 504

   Never switch for request/model errors:
     400, 404, 422

   The actual key values are never logged and never sent to the
   client. This module contains NO request logic and NO retry
   loops — retries are driven locally by the caller (see api/chat.js)
   so concurrent requests never corrupt each other's sequence.
   ============================================================ */

var KEY_ENV_NAMES = [
  "OPENROUTER_API_KEY_1",
  "OPENROUTER_API_KEY_2",
  "OPENROUTER_API_KEY_3",
  "OPENROUTER_API_KEY_4",
  "OPENROUTER_API_KEY_5",
  "OPENROUTER_API_KEY_6",
];

var SWITCHABLE_STATUSES = [401, 402, 403, 429, 500, 502, 503, 504];

function loadKeys() {
  var keys = [];
  for (var i = 0; i < KEY_ENV_NAMES.length; i++) {
    var value = process.env[KEY_ENV_NAMES[i]];
    if (value && typeof value === "string" && value.trim()) {
      keys.push(value.trim());
    }
  }
  return keys;
}

var keys = loadKeys();
var activeSlot = 0;

function normalizeSlot(slot) {
  if (keys.length === 0) return 0;
  return ((slot % keys.length) + keys.length) % keys.length;
}

/* ------------------------------------------------------------
   Public API
   ------------------------------------------------------------ */

/* Number of configured server-side keys. */
function getKeyCount() {
  return keys.length;
}

/* The active key for the current server process, or null. */
function getActiveApiKey() {
  if (keys.length === 0) return null;
  return keys[activeSlot];
}

/* 0-based slot index currently active. */
function getActiveSlot() {
  return activeSlot;
}

/* Return the key at a slot without mutating state.
   Used by callers to build a per-request local retry sequence. */
function getKeyAt(slot) {
  if (keys.length === 0) return null;
  return keys[normalizeSlot(slot)];
}

/* Set (or adopt) the preferred active slot for this process. */
function setActiveSlot(slot) {
  if (keys.length > 0) activeSlot = normalizeSlot(slot);
  return getActiveApiKey();
}

/* Advance the preferred active slot by one (wraps). For callers
   that do not need a per-request local sequence. */
function switchToNextApiKey() {
  return setActiveSlot(activeSlot + 1);
}

/* True only for statuses that indicate the KEY itself is the
   problem (auth/credits/rate/server). Never true for 400/404/422. */
function isSwitchableStatus(status) {
  return SWITCHABLE_STATUSES.indexOf(Number(status)) >= 0;
}

/* Diagnostics only — slot numbers, never key material. */
function describe() {
  return {
    configured: keys.length,
    activeSlot: activeSlot + 1,
    switchableStatuses: SWITCHABLE_STATUSES.concat(),
  };
}

module.exports = {
  getKeyCount: getKeyCount,
  getActiveApiKey: getActiveApiKey,
  getActiveSlot: getActiveSlot,
  getKeyAt: getKeyAt,
  setActiveSlot: setActiveSlot,
  switchToNextApiKey: switchToNextApiKey,
  isSwitchableStatus: isSwitchableStatus,
  describe: describe,
};