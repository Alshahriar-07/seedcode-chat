/* ============================================================
   Seed Code Chat — Settings page (settings.html)
   Mounts the settings UI (from settings.js) into the page shell,
   honoring an optional ?section= deep link.
   ============================================================ */

(function () {
  "use strict";

  function getSection() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("section") || undefined;
    } catch (e) {
      return undefined;
    }
  }

  function boot() {
    const nav = window.SeedChatNavigation;
    const ready = nav && nav.ready ? nav.ready : Promise.resolve();
    ready.then(() => {
      const settings = window.SeedChatSettings;
      if (settings && settings.renderPage) {
        settings.renderPage(getSection());
      }
      if (window.SeedChatAuth && window.SeedChatAuth.subscribe) {
        window.SeedChatAuth.subscribe(() => {
          if (settings && settings.render) settings.render();
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
