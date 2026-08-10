/* ============================================================
   Seed Code Chat — Shared Navigation & Page Shell
   -----------------------------------------------------------------
   Every page (index / history / profile / settings / about /
   login / signup) renders the SAME sidebar chrome through this
   module so the visual system stays consistent. It also owns the
   common boot sequence (state load → theme → density → sidebar).

   Exposes:
     window.SeedChatNavigation.ready  (Promise — resolves after boot)
     window.SeedChatShell             (page helpers + links)
   ============================================================ */

(function () {
  "use strict";

  const state = window.SeedChatState;
  const utils = window.SeedChatUtils;
  const renderer = window.SeedChatRenderer;

  const LINKS = {
    cli: "https://seedcode-web.vercel.app/",
    github: "https://github.com/Alshahriar-07/seedcode-cli",
    portfolio: "https://alshahriarsayon.vercel.app/",
  };

  /* ---------------- Page helpers ---------------- */

  function pageName() {
    const file = (window.location.pathname.split("/").pop() || "").replace(/\.html$/i, "");
    const name = (file || "index").toLowerCase();
    if (name === "index") return "chat";
    return name;
  }

  function isChatPage() {
    return pageName() === "chat";
  }

  function navigate(path) {
    window.location.href = path;
  }

  function openSettings(section) {
    navigate("settings.html" + (section ? "?section=" + encodeURIComponent(section) : ""));
  }

  /* ---------------- Sidebar markup (shared by every page) ---------------- */

  function sidebarHTML() {
    return (
      '<div class="sidebar-brand">' +
      '<img class="brand-mark" src="assets/logo.png" alt="Seed Code" />' +
      '<div class="brand-name">Seed <span class="accent">Code</span> Chat</div>' +
      "</div>" +

      '<div class="sidebar-actions">' +
      '<button class="btn-new-chat" id="btn-new-chat" type="button">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>' +
      "New chat</button>" +
      '<div class="sidebar-search">' +
      '<span class="search-icon">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>' +
      '</span>' +
      '<input type="search" id="conv-search" placeholder="Search chats" autocomplete="off" aria-label="Search conversations" />' +
      "</div>" +
      "</div>" +

      '<nav class="sidebar-nav" id="sidebar-nav" aria-label="Main navigation">' +
      navItem("chat", "index.html", "chat") +
      navItem("history", "history.html", "clock") +
      navItem("profile", "profile.html", "user") +
      navItem("settings", "settings.html", "settings") +
      navItem("about", "about.html", "info") +
      "</nav>" +

      '<nav class="conv-list" id="conv-list" aria-label="Chat history"></nav>' +

      '<div class="sidebar-footer">' +
      '<a class="cli-link" href="' + LINKS.cli + '" target="_blank" rel="noopener" data-tooltip="Seed Code CLI website">' +
      '<span class="cli-link-icon">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 17 6-6-6-6"/><path d="M12 19h8"/></svg>' +
      '</span>' +
      '<span class="cli-link-body"><strong>Seed Code CLI</strong><span>Bring Seed Code to your terminal</span></span>' +
      '<svg class="cli-link-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>' +
      "</a>" +
      '<div class="provider-status" id="provider-status" data-tooltip="Active provider">' +
      '<span class="dot" id="provider-status-dot"></span>' +
      '<span class="ps-label" id="provider-status-label">No provider</span>' +
      "</div>" +
      '<div class="sidebar-user" id="sidebar-user" role="button" tabindex="0" aria-label="Open profile"></div>' +
      "</div>"
    );
  }

  function navItem(name, href, iconName) {
    const svg = {
      chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
      clock: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
      settings:
        '<circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />',
      info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    };
    return (
      '<a class="side-nav-item" data-nav="' + name + '" href="' + href + '">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (svg[iconName] || svg.chat) +
      "</svg><span>" + name.charAt(0).toUpperCase() + name.slice(1) + "</span></a>"
    );
  }

  function injectSidebar() {
    const slot = document.getElementById("sidebar-slot");
    if (!slot) return;
    slot.innerHTML = sidebarHTML();
    setActiveNav();
  }

  function setActiveNav() {
    const name = pageName();
    document.querySelectorAll(".side-nav-item").forEach((item) => {
      const active = item.getAttribute("data-nav") === name;
      item.classList.toggle("active", active);
      item.setAttribute("aria-current", active ? "page" : "false");
    });
  }

  /* ---------------- Drawer (mobile) ---------------- */

  function setSidebarOpen(open) {
    document.body.classList.toggle("sidebar-open", Boolean(open));
    const scrim = document.getElementById("scrim");
    if (!scrim) return;
    scrim.hidden = false;
    scrim.classList.toggle("show", Boolean(open));
    if (!open) {
      setTimeout(() => (scrim.hidden = true), 220);
    }
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  /* ---------------- Conversation opening ---------------- */

  function openConversation(id) {
    if (!state.findConversation(id)) return;
    if (isChatPage()) {
      state.setActiveConversation(id);
      state.rememberActiveConversation();
      renderer.renderChatArea();
      renderer.renderSidebar();
      renderer.renderHeaderTitle();
      setSidebarOpen(false);
      renderer.scrollToBottom(true);
    } else {
      navigate("index.html#/chat/" + encodeURIComponent(id));
    }
  }

  function renameConversation(id) {
    const conv = state.findConversation(id);
    if (!conv) return;
    const dialog = document.getElementById("dialog");
    const box = document.getElementById("dialog-box");
    if (!dialog || !box) return;
    box.innerHTML =
      '<div class="dialog-head"><h3>Rename chat</h3><button class="icon-btn" data-close aria-label="Close">' +
      renderer.icon("close") +
      "</button></div>" +
      '<div class="dialog-body"><input class="input" id="rename-input" value="' +
      utils.escapeHtml(conv.title || "") +
      '" aria-label="Conversation title" /></div>' +
      '<div class="dialog-foot"><button class="btn btn-ghost" data-cancel type="button">Cancel</button>' +
      '<button class="btn btn-primary" data-ok type="button">Save</button></div>';
    dialog.hidden = false;
    const input = box.querySelector("#rename-input");
    setTimeout(() => {
      if (input) {
        input.focus();
        input.select();
      }
    }, 30);

    const finish = (save) => {
      if (save && input) {
        const value = input.value.trim();
        if (value) {
          state.updateConversation(id, { title: value, updatedAt: Date.now() });
          renderer.renderSidebar();
          renderer.renderHeaderTitle();
        }
      }
      dialog.hidden = true;
      box.replaceChildren();
    };
    box.querySelector("[data-ok]").addEventListener("click", () => finish(true));
    box.querySelector("[data-cancel]").addEventListener("click", () => finish(false));
    box.querySelector("[data-close]").addEventListener("click", () => finish(false));
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") finish(true);
        if (e.key === "Escape") finish(false);
      });
    }
  }

  async function deleteConversation(id) {
    const conv = state.findConversation(id);
    if (!conv) return;
    const ui = window.SeedChatUI;
    const ok = ui && ui.confirm
      ? await ui.confirm({
          title: "Delete chat?",
          body: '"' + (conv.title || "Untitled chat") + '" will be permanently deleted.',
          okText: "Delete",
          danger: true,
        })
      : window.confirm("Delete this conversation?");
    if (ok) {
      state.removeConversation(id);
      renderer.renderSidebar();
      renderer.renderHeaderTitle();
      if (isChatPage()) renderer.renderChatArea();
    }
  }

  /* ---------------- User chip ---------------- */

  function userInitials(name) {
    return String(name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }

  function renderUserChip() {
    const chip = document.getElementById("sidebar-user");
    if (!chip) return;
    const auth = window.SeedChatAuth;
    const user = auth.getSession();
    if (user) {
      const avatarHtml = user.avatar
        ? '<img src="' + utils.escapeHtml(user.avatar) + '" alt="" />'
        : "<span>" + utils.escapeHtml(userInitials(user.name)) + "</span>";
      chip.innerHTML =
        '<div class="user-chip">' +
        '<div class="user-avatar">' + avatarHtml + "</div>" +
        '<div class="user-meta">' +
        '<span class="user-name">' + utils.escapeHtml(user.name) + "</span>" +
        '<span class="user-sub">' +
        utils.escapeHtml(user.username ? "@" + user.username : user.email) +
        "</span></div>" +
        '<button class="icon-btn user-logout" data-account-action="logout" aria-label="Log out" title="Log out">' +
        renderer.icon("alert") +
        "</button></div>";
    } else {
      chip.innerHTML =
        '<div class="user-chip user-chip-signin">' +
        '<div class="user-avatar">' + renderer.icon("spark") + "</div>" +
        '<div class="user-meta">' +
        '<span class="user-name">Sign in</span>' +
        '<span class="user-sub">Supabase account</span>' +
        "</div>" +
        '<button class="btn btn-sm btn-primary" data-account-action="login" type="button">Sign in</button>' +
        "</div>";
    }
  }

  /* ---------------- Wiring ---------------- */

  function wireShell() {
    const $ = (id) => document.getElementById(id);

    /* mobile drawer */
    const menuBtn = $("btn-menu");
    if (menuBtn) {
      menuBtn.addEventListener("click", () =>
        setSidebarOpen(!document.body.classList.contains("sidebar-open"))
      );
    }
    const scrim = $("scrim");
    if (scrim) scrim.addEventListener("click", () => setSidebarOpen(false));

    /* nav links — real pages; just close the drawer and let href work */
    const nav = $("sidebar-nav");
    if (nav) {
      nav.addEventListener("click", (e) => {
        const item = e.target.closest("a.side-nav-item");
        if (item) setSidebarOpen(false);
      });
    }

    /* new chat */
    const newBtn = $("btn-new-chat");
    if (newBtn) {
      newBtn.addEventListener("click", () => {
        if (isChatPage() && window.SeedChatUI) {
          window.SeedChatUI.newChat();
        } else {
          navigate("index.html");
        }
      });
    }

    /* header settings → dedicated settings page */
    const settingsBtn = $("btn-header-settings");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        if (window.SeedChatSettings) window.SeedChatSettings.open();
      });
    }

    /* provider status → settings → providers */
    const providerStatus = $("provider-status");
    if (providerStatus) {
      providerStatus.addEventListener("click", () => {
        if (window.SeedChatSettings) window.SeedChatSettings.open("providers");
      });
    }

    /* conversation search */
    const search = $("conv-search");
    if (search) {
      search.addEventListener(
        "input",
        utils.debounce((e) => {
          renderer.setSearchQuery(e.target.value);
          renderer.renderSidebar();
        }, 150)
      );
    }

    /* conversation list delegation */
    const convList = $("conv-list");
    if (convList) {
      convList.addEventListener("click", (e) => {
        const renameBtn = e.target.closest("[data-conv-rename]");
        const delBtn = e.target.closest("[data-conv-delete]");
        const item = e.target.closest("[data-conv-id]");
        if (renameBtn && item) {
          e.stopPropagation();
          renameConversation(item.getAttribute("data-conv-id"));
        } else if (delBtn && item) {
          e.stopPropagation();
          deleteConversation(item.getAttribute("data-conv-id"));
        } else if (item) {
          openConversation(item.getAttribute("data-conv-id"));
        }
      });
    }

    /* user chip → profile / login / logout */
    const userChip = $("sidebar-user");
    if (userChip) {
      userChip.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-account-action]");
        if (btn) {
          const action = btn.getAttribute("data-account-action");
          if (action === "logout") {
            window.SeedChatAuth.logout().then(() => {
              if (window.SeedChatUI) window.SeedChatUI.toast("Signed out", "ok");
              navigate("login.html");
            });
          } else {
            navigate(action === "login" ? "login.html" : "signup.html");
          }
          setSidebarOpen(false);
          return;
        }
        setSidebarOpen(false);
        navigate("profile.html");
      });
    }
  }

  /* ---------------- Boot ---------------- */

  const ready = boot();

  function boot() {
    injectSidebar();
    wireShell();
    renderUserChip();
    if (window.SeedChatAuth) window.SeedChatAuth.subscribe(renderUserChip);

    return state
      .load()
      .then(function () {
        const s = state.getState();
        if (window.SeedChatUI && window.SeedChatUI.applyTheme) {
          window.SeedChatUI.applyTheme(s.ui.theme);
        }
        if (window.SeedChatSettings && window.SeedChatSettings.applyDensity) {
          window.SeedChatSettings.applyDensity();
        }
        renderer.renderSidebar();
        state.subscribe("change", function () {
          renderer.renderSidebar();
          renderUserChip();
        });
      })
      .catch(function (e) {
        console.error("Seed Code Chat boot failed", e);
      });
  }

  /* ---------------- Public API ---------------- */

  window.SeedChatShell = {
    isChatPage,
    pageName,
    navigate,
    openSettings,
    closeSidebar,
    openConversation,
    links: LINKS,
  };

  window.SeedChatNavigation = {
    ready: ready,
  };
})();
