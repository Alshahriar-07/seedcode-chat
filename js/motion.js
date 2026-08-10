/* ============================================================
   Seed Code Chat — Motion system
   -----------------------------------------------------------------
   Owns the startup intro splash, app reveal, page enter/exit
   transitions, internal link transitions and modal open/close
   animations. Pure JS; all motion is CSS-driven (transform +
   opacity only). Respects prefers-reduced-motion.

   Integrates with the existing boot flow: the intro element is
   already present in each page's HTML (see <div id="sc-intro">).
   This module only orchestrates it and reveals the app.

   Exposes:
     window.SeedChatMotion.exitAndGo(path) — fade out, then navigate
   ============================================================ */

(function () {
  "use strict";

  var INTRO_KEY = "seedchat_intro_seen";

  /* ---------------- Preferences ---------------- */

  function hasSeenIntro() {
    try {
      return sessionStorage.getItem(INTRO_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function markIntroSeen() {
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch (e) {
      /* storage unavailable — intro simply replays next load */
    }
  }

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  var Motion = {};

  /* ==================== App reveal ==================== */

  /* Reveal the layout. The intro overlay covers the page, so the
     sidebar / header / main start hidden (see .sc-intro-active CSS)
     and transition into place when this runs. */
  function revealApp() {
    document.body.classList.remove("sc-intro-active");
    document.body.classList.add("app-ready");
  }

  /* ==================== Intro sequence ====================

     PHASE 1 — black screen           0ms → 250ms   (logo starts fading/scaling in)
     PHASE 2 — logo + brand           250ms → 850ms
     PHASE 3 — intro exits            1050ms → 1500ms
     The logo, name and tagline drive themselves via CSS keyframes;
     we only trigger the exit + app reveal at the right moment.   */

  function runIntro() {
    var intro = document.getElementById("sc-intro");
    var EXIT_MS = 1050;
    var CLEAN_MS = 1650;

    markIntroSeen();
    document.body.classList.add("sc-intro-active");

    if (!intro) {
      revealApp();
      return;
    }

    setTimeout(function () {
      intro.classList.add("hide");
      revealApp();
    }, EXIT_MS);

    setTimeout(function () {
      if (intro.parentNode) intro.parentNode.removeChild(intro);
    }, CLEAN_MS);
  }

  /* Intro already seen this session (or reduced motion): remove the
     overlay immediately so the page never flashes or blocks. */
  function skipIntro() {
    var intro = document.getElementById("sc-intro");
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    document.body.classList.add("app-ready");
  }

  /* ==================== Page enter / exit ==================== */

  /* Incoming page fade (used when the intro is skipped). */
  Motion.pageEnter = function () {
    document.body.classList.add("page-enter");
  };

  /* Outgoing page fade, then navigate. Everything goes through this
     so internal navigation always feels continuous. */
  Motion.exitAndGo = function (path) {
    var body = document.body;
    if (prefersReducedMotion() || body.classList.contains("page-exit")) {
      window.location.href = path;
      return;
    }
    body.classList.add("page-exit");
    setTimeout(function () {
      window.location.href = path;
    }, 240);
  };

  /* ==================== Internal link interception ==================== */

  function isInternalLink(a) {
    if (!a || !a.getAttribute) return false;
    if (a.target === "_blank") return false;
    if (a.hasAttribute("download")) return false;
    var href = a.getAttribute("href");
    if (!href) return false;
    if (/^(https?:|mailto:|tel:|javascript:|data:)/i.test(href)) return false;
    if (href.charAt(0) === "#") return false;
    return true;
  }

  function wireLinkTransitions() {
    document.addEventListener(
      "click",
      function (e) {
        if (e.defaultPrevented || e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
        if (!a || !isInternalLink(a)) return;
        e.preventDefault();
        Motion.exitAndGo(a.href);
      },
      true
    );
  }

  /* ==================== Modal open animation ====================

     .dialog-box is a persistent element, so its CSS animation only
     plays once at page load. Restart it each time a dialog becomes
     visible (hidden → false). The .dialog backdrop fades in via CSS. */

  function wireModalAnimations() {
    if (typeof MutationObserver === "undefined") return;
    var dialogs = document.querySelectorAll(".dialog");
    Array.prototype.forEach.call(dialogs, function (dlg) {
      var box = dlg.querySelector(".dialog-box");
      if (!box) return;
      new MutationObserver(function () {
        if (dlg.hidden === false) {
          box.style.animation = "none";
          void box.offsetWidth;
          box.style.animation = "";
        }
      }).observe(dlg, { attributes: true, attributeFilter: ["hidden"] });
    });
  }

  /* ==================== Message entrance ====================

     Marks the tail of a thread so the newest messages animate in
     (see .message.msg-anim CSS). History re-renders stay stable —
     this is only invoked from the send flow in chat.js. */

  Motion.animateLatestMessages = function (listEl, count) {
    if (!listEl || prefersReducedMotion()) return;
    var msgs = listEl.querySelectorAll(".message");
    var n = count || 1;
    var start = Math.max(0, msgs.length - n);
    for (var i = start; i < msgs.length; i++) {
      var el = msgs[i];
      if (!el || el.classList.contains("msg-streaming")) continue;
      el.classList.add("msg-anim");
      el.style.setProperty("--msg-i", String(i - start));
    }
  };

  /* ==================== Boot ==================== */

  function boot() {
    wireLinkTransitions();
    wireModalAnimations();

    if (prefersReducedMotion() || hasSeenIntro()) {
      markIntroSeen();
      skipIntro();
      /* Ensure the page fades in cleanly on repeat navigation even if
         the head marker script did not run. */
      if (!document.documentElement.classList.contains("sc-page-in")) {
        document.documentElement.classList.add("sc-page-in");
      }
    } else {
      runIntro();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.SeedChatMotion = Motion;
})();
