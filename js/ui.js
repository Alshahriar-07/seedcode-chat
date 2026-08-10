/* ============================================================
   Seed Code Chat — UI controller
   Sidebar · Model menus · Composer · Toasts · Dialogs ·
   Keyboard · Search · Offline handling
   ============================================================ */

(function () {
  "use strict";

  const state = window.SeedChatState;
  const utils = window.SeedChatUtils;
  const renderer = window.SeedChatRenderer;
  const icon = renderer.icon;
  const settings = window.SeedChatSettings;
  const chat = window.SeedChatChat;

  const UI = {};

  let confirmResolve = null;
  let activeModelMenu = null;

  /* ==================== Toasts ==================== */

  UI.toast = function (message, kind) {
    const region = document.getElementById("toast-region");
    const el = utils.createElement(
      '<div class="toast" data-kind="' + (kind || "ok") + '" role="status">' +
        icon(kind === "error" ? "alert" : kind === "warning" ? "warn" : "check") +
        "<span></span></div>"
    );
    el.querySelector("span").textContent = message;
    region.appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 200);
    }, 2600);
  };

  /* ==================== Confirm dialog ==================== */

  UI.confirm = function (opts) {
    const dialog = document.getElementById("dialog");
    const box = document.getElementById("dialog-box");
    box.innerHTML =
      '<div class="dialog-head"><h3>' + utils.escapeHtml(opts.title || "Confirm") + "</h3>" +
      '<button class="icon-btn" data-close aria-label="Close">' + icon("close") + "</button></div>" +
      '<div class="dialog-body">' +
      '<div style="color:var(--text-2);font-size:var(--fs-14);line-height:1.55">' + utils.escapeHtml(opts.body || "") + "</div>" +
      "</div>" +
      '<div class="dialog-foot">' +
      '<button class="btn btn-ghost" data-cancel type="button">Cancel</button>' +
      '<button class="btn ' + (opts.danger ? "btn-danger" : "btn-primary") + '" data-ok type="button">' + utils.escapeHtml(opts.okText || "OK") + "</button>" +
      "</div>";
    dialog.hidden = false;

    return new Promise((resolve) => {
      confirmResolve = resolve;

      function finish(result) {
        dialog.hidden = true;
        confirmResolve = null;
        box.replaceChildren();
        resolve(result);
      }

      box.querySelector("[data-ok]").addEventListener("click", () => finish(true));
      box.querySelector("[data-cancel]").addEventListener("click", () => finish(false));
      box.querySelector("[data-close]").addEventListener("click", () => finish(false));
      box.addEventListener("keydown", (e) => {
        if (e.key === "Escape") finish(false);
      });
      dialog.addEventListener("mousedown", (e) => {
        if (e.target === dialog) finish(false);
      });
      const okBtn = box.querySelector("[data-ok]");
      setTimeout(() => okBtn.focus(), 30);
    });
  };

  /* ==================== Sidebar ==================== */

  /* Sidebar chrome (drawer, nav, user chip, conv list) is owned by
     js/navigation.js. This file only keeps chat-specific helpers. */

  function newChat() {
    const ta = document.getElementById("composer-input");
    if (ta) ta.value = "";
    UI.clearAttachmentsUI();
    if (window.SeedChatShell) window.SeedChatShell.closeSidebar();
    const conv = {
      id: utils.uid("conv"),
      title: "New chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      provider: null,
      model: null,
      messages: [],
    };
    state.addConversation(conv);
    renderer.renderChatArea();
    renderer.renderSidebar();
    renderer.renderHeaderTitle();
    chat.focusComposer();
  }

  /* ==================== Model menu ==================== */

  function closeModelMenu() {
    if (activeModelMenu) {
      activeModelMenu.remove();
      activeModelMenu = null;
    }
    document.querySelectorAll("[aria-expanded='true'][data-model-trigger]").forEach((b) => {
      b.setAttribute("aria-expanded", "false");
    });
  }

  function openModelMenu(anchor) {
    closeModelMenu();
    const s = state.getState();
    const p = state.getActiveProvider();
    if (!p) {
      UI.toast("No provider configured. Open Settings to add one.", "warning");
      settings.open("providers");
      return;
    }

    const menu = utils.createElement('<div class="menu picker-panel" role="listbox" aria-label="Model picker"></div>');
    menu.style.position = "fixed";
    menu.style.animation = "none";

    let html = "";

    /* providers */
    const enabledProviders = s.providers.filter((x) => x.enabled);
    if (enabledProviders.length > 1) {
      html += '<div class="menu-label">Provider</div>';
      enabledProviders.forEach((pr) => {
        const active = pr.id === p.id;
        html +=
          '<button class="picker-item' + (active ? " active" : "") + '" data-provider-id="' + utils.escapeHtml(pr.id) + '" type="button">' +
          '<span class="pi-meta"><span class="pi-name">' + utils.escapeHtml(pr.label) +
          (pr.isFallback ? ' <span class="free-tag">FALLBACK</span>' : "") +
          "</span></span>" +
          '<span class="pi-check">' + icon("check") + "</span></button>";
      });
      html += '<div class="menu-sep"></div>';
    }

    /* model search */
    html +=
      '<div class="picker-head"><div class="picker-search">' + icon("search") +
      '<input type="search" placeholder="Search models…" aria-label="Search models" /></div></div>';

    html += '<div class="picker-list">' + renderer.buildModelMenuHtml(state.getProviderModels(p.id), s.activeModelId, p) + "</div>";

    menu.innerHTML = html;
    document.body.appendChild(menu);

    /* position */
    const rect = anchor.getBoundingClientRect();
    const menuWidth = Math.min(400, window.innerWidth - 24);
    menu.style.width = menuWidth + "px";
    let left = Math.min(rect.left, window.innerWidth - menuWidth - 8);
    if (left < 8) left = 8;
    let top = rect.bottom + 6;
    const estHeight = 380;
    if (top + estHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - estHeight);
    }
    menu.style.left = left + "px";
    menu.style.top = top + "px";

    anchor.setAttribute("aria-expanded", "true");
    activeModelMenu = menu;

    /* interactions */
    menu.addEventListener("click", (e) => {
      const provBtn = e.target.closest("[data-provider-id]");
      if (provBtn) {
        state.setActiveProvider(provBtn.getAttribute("data-provider-id"));
        openModelMenu(anchor);
        return;
      }
      const modelBtn = e.target.closest("[data-model-id]");
      if (modelBtn) {
        const modelId = modelBtn.getAttribute("data-model-id");
        const pr = state.getActiveProvider();
        state.setActiveModel(modelId, pr ? pr.id : null);
        renderer.renderModelSelector();
        closeModelMenu();
        return;
      }
    });

    const search = menu.querySelector("input");
    const list = menu.querySelector(".picker-list");
    if (search) {
      search.addEventListener("input", () => {
        const q = search.value.toLowerCase();
        const pNow = state.getActiveProvider();
        let models = state.getProviderModels(pNow.id);
        if (q) {
          models = models.filter((m) => (m.id + " " + m.name).toLowerCase().includes(q));
        }
        list.innerHTML = renderer.buildModelMenuHtml(models, state.getState().activeModelId, pNow);
      });
      setTimeout(() => search.focus(), 30);
    }

    setTimeout(() => {
      document.addEventListener("mousedown", onDocMouseDown, { once: true });
      document.addEventListener("keydown", onDocKey, { once: true });
    }, 0);

    function onDocMouseDown(e) {
      if (!menu.contains(e.target) && !anchor.contains(e.target)) closeModelMenu();
    }
    function onDocKey(e) {
      if (e.key === "Escape") closeModelMenu();
    }
  }

  /* ==================== Composer ==================== */

  function autoGrow(ta) {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }

  function getComposerText() {
    return document.getElementById("composer-input").value;
  }

  function handleComposerKey(e) {
    const s = state.getState();
    const enterToSend = s.generation.enterToSend !== false;
    if (e.key === "Enter") {
      const sendShortcut = enterToSend ? !e.shiftKey : e.ctrlKey || e.metaKey;
      if (sendShortcut) {
        e.preventDefault();
        const text = getComposerText();
        if (text.trim() && !chat.isGenerating()) {
          document.getElementById("composer-input").value = "";
          autoGrow(document.getElementById("composer-input"));
          chat.send(text);
        }
      }
    }
  }

  /* ==================== Attachments ==================== */

  function renderAttachments(list) {
    const wrap = document.getElementById("composer-attachments");
    if (!list.length) {
      wrap.hidden = true;
      wrap.innerHTML = "";
      return;
    }
    wrap.hidden = false;
    wrap.innerHTML = list
      .map(
        (a, i) =>
          '<span class="attach-chip" data-i="' + i + '">' +
          icon("file") +
          '<span class="chip-name">' + utils.escapeHtml(a.name) + "</span>" +
          '<button type="button" aria-label="Remove attachment">' + icon("close") + "</button></span>"
      )
      .join("");
    wrap.querySelectorAll("[data-i]").forEach((chip) => {
      chip.querySelector("button").addEventListener("click", () => {
        chat.getPendingAttachments().splice(Number(chip.getAttribute("data-i")), 1);
        renderAttachments(chat.getPendingAttachments());
      });
    });
  }

  UI.clearAttachmentsUI = function () {
    renderAttachments([]);
  };

  async function handleFiles(files) {
    for (const file of Array.from(files || [])) {
      if (file.size > 1024 * 1024) {
        UI.toast("Skipped " + file.name + " (over 1 MB)", "warning");
        continue;
      }
      try {
        const content = await utils.readFileAsText(file);
        chat.addAttachment(file.name, content);
      } catch (e) {
        UI.toast("Could not read " + file.name, "error");
      }
    }
    document.getElementById("file-input").value = "";
  }

  /* ==================== Theme ==================== */

  UI.applyTheme = function (theme) {
    const resolve = (t) =>
      t === "system"
        ? window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : t;
    document.documentElement.dataset.theme = resolve(theme || state.getState().ui.theme);
  };

  /* ==================== Offline ==================== */

  function setOfflineBanner(offline) {
    let banner = document.getElementById("offline-banner");
    if (offline) {
      if (!banner) {
        banner = utils.createElement(
          '<div class="offline-banner" id="offline-banner" role="alert">' +
            icon("warn") + "<span>You're offline. Reconnect to continue chatting.</span></div>"
        );
        document.body.insertBefore(banner, document.body.firstChild);
      }
      banner.hidden = false;
    } else if (banner) {
      banner.hidden = true;
    }
  }

  /* ==================== Sidebar user chip ==================== */
  /* Rendered by js/navigation.js so the sidebar stays consistent
     across every page (index / history / profile / settings / about /
     login / signup). */

  /* ==================== Init ==================== */

  function init() {
    const $ = (id) => document.getElementById(id);

    /* Header settings → dedicated settings page (shell opens it) */
    $("btn-header-settings").addEventListener("click", () => settings.open());

    /* Model menus */
    $("model-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openModelMenu(e.currentTarget);
    });
    $("composer-model-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openModelMenu(e.currentTarget);
    });

    /* Composer */
    const ta = $("composer-input");
    ta.addEventListener("input", () => autoGrow(ta));
    ta.addEventListener("keydown", handleComposerKey);
    $("btn-send").addEventListener("click", () => {
      const text = getComposerText();
      if (text.trim() && !chat.isGenerating()) {
        ta.value = "";
        autoGrow(ta);
        chat.send(text);
      }
    });
    $("btn-stop").addEventListener("click", () => chat.stopGeneration());
    $("btn-attach").addEventListener("click", () => $("file-input").click());
    $("file-input").addEventListener("change", (e) => handleFiles(e.target.files));

    /* Keyboard shortcuts */
    document.addEventListener("keydown", (e) => {
      const target = e.target;
      const inInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        newChat();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        settings.open();
      }
      if (e.key === "Escape") {
        if (activeModelMenu) closeModelMenu();
        else if (document.getElementById("provider-dialog").hidden === false) {
          document.getElementById("provider-dialog").hidden = true;
        } else if (document.getElementById("dialog").hidden === false) {
          document.getElementById("dialog").hidden = true;
        } else if (settings.isOpen()) {
          settings.close();
        } else if (document.body.classList.contains("sidebar-open")) {
          if (window.SeedChatShell) window.SeedChatShell.closeSidebar();
        }
      }
      if (!inInput && e.key === "/") {
        e.preventDefault();
        $("conv-search").focus();
      }
    });

    /* online / offline */
    window.addEventListener("online", () => {
      state.setOnline(true);
      setOfflineBanner(false);
      UI.toast("Back online", "ok");
    });
    window.addEventListener("offline", () => {
      state.setOnline(false);
      setOfflineBanner(true);
    });

    /* system theme changes */
    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
      if (state.getState().ui.theme === "system") UI.applyTheme("system");
    });

    /* Close model menu on scroll of chat area */
    document.getElementById("chat-area").addEventListener("scroll", () => closeModelMenu(), { passive: true });

    /* Initialize attachments */
    renderAttachments([]);
  }

  window.SeedChatUI = {
    init,
    toast: UI.toast,
    confirm: UI.confirm,
    autoGrow,
    renderAttachments,
    clearAttachmentsUI: UI.clearAttachmentsUI,
    applyTheme: UI.applyTheme,
    newChat,
  };
})();
