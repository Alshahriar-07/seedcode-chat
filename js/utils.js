/* ============================================================
   Seed Code Chat — Utilities
   ============================================================ */

(function () {
  "use strict";

  const utils = {};

  /** Generate a reasonably unique id. */
  utils.uid = function (prefix) {
    const rand =
      typeof crypto !== "undefined" && crypto.getRandomValues
        ? crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
        : Math.random().toString(36).slice(2, 10);
    return (prefix || "id") + "-" + Date.now().toString(36) + "-" + rand;
  };

  /** Escape a string for safe insertion into HTML text. */
  utils.escapeHtml = function (str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  /** Debounce a function call. */
  utils.debounce = function (fn, delay) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delay);
    };
  };

  /** Throttle a function call (leading edge). */
  utils.throttle = function (fn, limit) {
    let waiting = false;
    return function (...args) {
      if (waiting) return;
      fn.apply(this, args);
      waiting = true;
      setTimeout(() => (waiting = false), limit);
    };
  };

  utils.clamp = function (value, min, max) {
    return Math.min(max, Math.max(min, value));
  };

  utils.sleep = function (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  /** Safe JSON parse. */
  utils.safeParse = function (text, fallback) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return fallback === undefined ? null : fallback;
    }
  };

  /** Format a timestamp as a compact relative date for the sidebar. */
  utils.formatDate = function (ts) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "now";
    if (minutes < 60) return minutes + "m";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "h";
    const days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    if (days < 7) return days + "d";
    const sameYear = d.getFullYear() === now.getFullYear();
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: sameYear ? undefined : "numeric",
    });
  };

  /** Full timestamp for export. */
  utils.formatFullDate = function (ts) {
    return new Date(ts).toLocaleString();
  };

  /** Truncate a string. */
  utils.truncate = function (str, max) {
    str = String(str || "");
    if (str.length <= max) return str;
    return str.slice(0, max - 1).trimEnd() + "…";
  };

  /** Extract a plain-text preview from markdown-ish content. */
  utils.previewText = function (content, max) {
    let text = String(content || "");
    text = text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_~#>|]/g, "")
      .replace(/\n+/g, " ")
      .trim();
    return utils.truncate(text, max);
  };

  /** Derive a conversation title from its first user message. */
  utils.deriveTitle = function (content, max) {
    max = max || window.SeedChatConfig.autoTitle.maxPreviewChars || 40;
    const preview = utils.previewText(content, max);
    return preview || "New chat";
  };

  utils.copyText = function (text) {
    const value = String(text == null ? "" : text);
    if (!value) return Promise.resolve(true);

    /* Synchronous legacy copy first: guaranteed inside the user gesture. */
    try {
      if (document && document.execCommand) {
        const ok = legacyCopy(value);
        if (ok) return Promise.resolve(true);
      }
    } catch (e) {
      /* fall through to the async clipboard API */
    }

    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value).then(
        function () {
          return true;
        },
        function () {
          return Promise.resolve(legacyCopy(value));
        }
      );
    }
    return Promise.resolve(legacyCopy(value));
  };

  function legacyCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  /** Trigger a download of text content. */
  utils.downloadText = function (filename, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  /** Create a DOM element from an HTML string. */
  utils.createElement = function (html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    return tpl.content.firstElementChild;
  };

  /** Convert an array-like / NodeList to array. */
  utils.toArray = function (list) {
    return Array.prototype.slice.call(list);
  };

  /** Detect reduced-motion preference. */
  utils.prefersReducedMotion = function () {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  };

  /** Focus an element and reveal it in scroll containers. */
  utils.focusAndReveal = function (el) {
    el.focus({ preventScroll: true });
    try {
      el.scrollIntoView({ block: "nearest", behavior: utils.prefersReducedMotion() ? "auto" : "smooth" });
    } catch (e) {
      el.scrollIntoView();
    }
  };

  /** Escape a string for use in a RegExp. */
  utils.escapeRegex = function (str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  /** Read a File as text. */
  utils.readFileAsText = function (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  utils.isOnline = function () {
    return typeof navigator.onLine === "boolean" ? navigator.onLine : true;
  };

  window.SeedChatUtils = utils;
})();
