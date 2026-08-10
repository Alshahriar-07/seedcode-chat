/* ============================================================
   Seed Code Chat — App bootstrap (chat page)
   Runs on index.html only. Navigation + shell boot is owned by
   navigation.js (shared by every page); this module initializes
   the chat-specific UI after the shell is ready.
   ============================================================ */

(function () {
  "use strict";

  const state = window.SeedChatState;
  const renderer = window.SeedChatRenderer;
  const ui = window.SeedChatUI;

  let booted = false;

  async function boot() {
    if (booted) return;
    booted = true;

    /* Shell boot (state load → theme → density → sidebar) */
    const nav = window.SeedChatNavigation;
    if (nav && nav.ready) await nav.ready;

    ui.init();

    /* Deep link from history.html: index.html#/chat/<id> */
    const match = window.location.hash.match(/^#\/chat\/([^/?]+)/);
    if (match) {
      const id = decodeURIComponent(match[1]);
      if (state.findConversation(id)) {
        state.setActiveConversation(id);
        state.rememberActiveConversation();
      }
    }

    renderer.renderModelSelector();
    renderer.renderChatArea();
    renderer.renderHeaderTitle();
    if (state.getActiveConversation()) {
      renderer.scrollToBottom(true);
    }

    /* Keep shell chrome in sync (never re-render the message list here,
       because that would wipe a live streaming message). */
    state.subscribe("change", function () {
      renderer.renderSidebar();
      renderer.renderHeaderTitle();
      renderer.renderModelSelector();
      syncComposerButtons();
    });

    state.subscribe("online", function (online) {
      const banner = document.getElementById("offline-banner");
      if (banner) banner.hidden = online;
    });

    /* prefetch live model catalogs in the background */
    prefetchModelCatalogs();

    /* close the mobile drawer when resizing to desktop */
    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) {
        document.body.classList.remove("sidebar-open");
      }
    });
  }

  function syncComposerButtons() {
    const sendBtn = document.getElementById("btn-send");
    const stopBtn = document.getElementById("btn-stop");
    const canStop = Boolean(
      state.getState().generating && state.getState().generating.conversationId
    );
    if (sendBtn) sendBtn.hidden = canStop;
    if (stopBtn) stopBtn.hidden = !canStop;
  }

  async function prefetchModelCatalogs() {
    const providers = window.SeedChatProviders;
    if (!providers || !providers.fetchModelsOnce) return;
    const all = providers.getAll();
    if (!Array.isArray(all)) return;
    for (const provider of all) {
      if (!provider || !provider.enabled) continue;
      try {
        await providers.fetchModelsOnce(provider.id);
      } catch (e) {
        /* non-fatal; static catalog remains available */
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
