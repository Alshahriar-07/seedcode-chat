/* ============================================================
   Seed Code Chat — Renderer
   Owns DOM output for: sidebar, chat area, messages, model menu.
   Streaming updates only touch the active message (Performance.md).
   ============================================================ */

(function () {
  "use strict";

  const state = window.SeedChatState;
  const utils = window.SeedChatUtils;
  const markdown = window.SeedChatMarkdown;
  const providers = window.SeedChatProviders;

  /* ---------------- Icons ---------------- */

  const I = {
    chat: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    spark: '<img class="seedcode-logo" src="assets/logo.png" alt="SeedCode" width="16" height="16" />',
    route: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M12 19h4.5a3.5 3.5 0 0 0 0-7H12"/></svg>',
    link: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    terminal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 17 6-6-6-6"/><path d="M12 19h8"/></svg>',
    copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    refresh: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>',
    edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
    trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
    rename: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    plus: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    send: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    stop: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    chevron: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    menu: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    settings: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>',
    attach: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.4 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
    alert: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
    warn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
    upload: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>',
    shield: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>',
    db: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
    home: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>',
    file: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5Z"/><path d="M14 2v6h6"/></svg>',
  };

  window.SeedChatIcons = I;

  function icon(name) {
    return I[name] || "";
  }

  /* ---------------- DOM refs ---------------- */

  const els = {
    convList: () => document.getElementById("conv-list"),
    chatScroll: () => document.getElementById("chat-scroll"),
    headerTitle: () => document.getElementById("header-title"),
    modelBtnName: () => document.getElementById("model-btn-name"),
    composerModelName: () => document.getElementById("composer-model-name"),
    providerStatusLabel: () => document.getElementById("provider-status-label"),
    providerStatusDot: () => document.getElementById("provider-status-dot"),
  };

  /* ---------------- Sidebar ---------------- */

  let lastSearchQuery = "";

  function setSearchQuery(query) {
    lastSearchQuery = query;
  }

  function renderSidebar() {
    const s = state.getState();
    const list = els.convList();
    if (!list) return;

    const query = lastSearchQuery.trim().toLowerCase();
    let conversations = s.conversations;

    if (query) {
      conversations = conversations.filter((c) =>
        (c.title || "").toLowerCase().includes(query)
      );
    }

    if (!conversations.length) {
      list.innerHTML =
        '<div class="conv-list-empty">' +
        (query
          ? icon("search") + "<span>No chats match \u201c" + utils.escapeHtml(query) + "\u201d</span>"
          : icon("chat") + "<span>No conversations yet.<br />Start a new chat to begin.</span>") +
        "</div>";
      return;
    }

    list.innerHTML = conversations
      .map(function (c) {
        const active = c.id === s.activeConversationId;
        const title = utils.escapeHtml(c.title || "Untitled chat");
        const date = utils.formatDate(c.updatedAt || c.createdAt);
        return (
          '<button class="conv-item' + (active ? " active" : "") + '" data-conv-id="' + utils.escapeHtml(c.id) + '" type="button" aria-current="' + (active ? "page" : "false") + '">' +
          '<span class="conv-icon">' + icon("chat") + "</span>" +
          '<span class="conv-title" title="' + title + '">' + title + "</span>" +
          '<span class="conv-actions">' +
          '<button class="icon-btn" data-conv-rename aria-label="Rename chat">' + icon("rename") + "</button>" +
          '<button class="icon-btn" data-conv-delete aria-label="Delete chat">' + icon("trash") + "</button>" +
          "</span>" +
          "</button>"
        );
      })
      .join("");

    renderProviderStatus();
  }

  /* ---------------- Provider status (sidebar footer) ---------------- */

  function renderProviderStatus() {
    const s = state.getState();
    const label = els.providerStatusLabel();
    const dot = els.providerStatusDot();
    if (!label || !dot) return;

    const p = state.getActiveProvider();
    if (!p) {
      label.textContent = "No provider configured";
      dot.className = "dot";
      return;
    }
    const model = s.activeModelId ? " · " + s.activeModelId : "";
    label.textContent = p.label + model;
    dot.className = "dot " + (p.enabled ? "online" : "");
  }

  /* ---------------- Header title ---------------- */

  function renderHeaderTitle() {
    const title = els.headerTitle();
    if (!title) return;
    const shell = window.SeedChatShell;
    if (shell && !shell.isChatPage()) {
      /* standalone pages keep their static header title */
      return;
    }
    const conv = state.getActiveConversation();
    if (conv) {
      title.textContent = conv.title || "Untitled chat";
      title.classList.remove("is-placeholder");
    } else {
      title.textContent = "Seed Code Chat";
      title.classList.add("is-placeholder");
    }
  }

  /* ---------------- Chat area ---------------- */

  function renderChatArea() {
    const scroll = els.chatScroll();
    if (!scroll) return;
    const conv = state.getActiveConversation();
    if (!conv) {
      renderWelcome(scroll);
      return;
    }
    renderMessages(scroll, conv);
  }

  function renderWelcome(scroll) {
    scroll.innerHTML =
      '<div class="welcome">' +
      '<img class="welcome-logo" src="assets/logo.png" alt="Seed Code logo" />' +
      '<h1>Seed <span class="accent">Code</span> Chat</h1>' +
      '<p class="w-sub">A premium general-purpose AI assistant. Ask anything — code, research, writing, ideas.</p>' +
      '<div class="welcome-suggestions">' +
      suggestion("spark", "Explain a concept", "Explain something in simple terms for me.") +
      suggestion("terminal", "Write some code", "Write a function that solves a coding problem.") +
      suggestion("edit", "Draft & refine", "Help me draft and polish a piece of writing.") +
      suggestion("search", "Research", "Summarize what you know about a topic.") +
      "</div>" +
      "</div>";
    scroll.querySelectorAll(".suggestion").forEach((btn) => {
      btn.addEventListener("click", () => {
        const text = btn.getAttribute("data-text");
        window.SeedChatChat.setComposer(text);
        window.SeedChatChat.focusComposer();
      });
    });
  }

  function suggestion(ic, title, desc) {
    return (
      '<button class="suggestion" type="button" data-text="' + utils.escapeHtml(desc) + '">' +
      icon(ic) +
      '<span><span class="s-t">' + title + "</span><span class=\"s-d\">" + desc + "</span></span>" +
      "</button>"
    );
  }

  function renderMessages(scroll, conv) {
    if (!conv.messages || !conv.messages.length) {
      scroll.innerHTML =
        '<div class="welcome"><div class="empty-state" style="border:0"><div class="es-icon">' +
        icon("chat") +
        "</div><h2>New conversation</h2><p>Type a message below to get started.</p></div></div>";
      return;
    }

    scroll.innerHTML = '<div class="message-list"></div>';
    const list = scroll.querySelector(".message-list");
    conv.messages.forEach((msg) => {
      list.appendChild(renderMessage(msg, conv));
    });
    scrollToBottom();
  }

  /* ---------------- Messages ---------------- */

  function renderMessage(msg, conv) {
    if (msg.role === "user") return renderUserMessage(msg);
    if (msg.role === "assistant") return renderAssistantMessage(msg, conv);
    return renderSystemMessage(msg);
  }

  function renderUserMessage(msg) {
    const article = utils.createElement(
      '<article class="message user" data-msg-id="' + utils.escapeHtml(msg.id) + '">' +
        '<div class="user-bubble"><div class="user-content"></div></div>' +
        '<div class="msg-actions">' +
        '<button class="icon-btn" data-action="copy" aria-label="Copy message">' + icon("copy") + "</button>" +
        '<button class="icon-btn" data-action="edit" aria-label="Edit message">' + icon("edit") + "</button>" +
        "</div>" +
        "</article>"
    );
    const contentEl = article.querySelector(".user-content");
    contentEl.textContent = msg.content || "";
    if (msg.attachments && msg.attachments.length) {
      const note = utils.createElement(
        '<div class="attach-note">' + icon("file") + "<span></span></div>"
      );
      note.querySelector("span").textContent = msg.attachments
        .map((a) => a.name)
        .join(", ");
      article.querySelector(".user-bubble").appendChild(note);
    }
    bindMessageActions(article, msg);
    return article;
  }

  function renderAssistantMessage(msg, conv) {
    const modelLabel = msg.provider
      ? utils.escapeHtml(msg.provider + (msg.model ? " · " + msg.model : ""))
      : "";
    const article = utils.createElement(
      '<article class="message assistant" data-msg-id="' + utils.escapeHtml(msg.id) + '">' +
        '<div class="msg-meta">' +
        '<div class="msg-avatar">' + icon("spark") + "</div>" +
        '<div class="msg-who">Seed Code Chat<span class="msg-model">' + modelLabel + "</span></div>" +
        '<div class="msg-actions">' +
        '<button class="icon-btn" data-action="copy" aria-label="Copy response">' + icon("copy") + "</button>" +
        '<button class="icon-btn" data-action="regenerate" aria-label="Regenerate response">' + icon("refresh") + "</button>" +
        "</div>" +
        "</div>" +
        '<div class="markdown" data-markdown></div>' +
        "</article>"
    );
    if (msg.content) {
      article.querySelector('[data-markdown]').innerHTML = markdown.render(msg.content);
    }
    bindMessageActions(article, msg, conv);
    return article;
  }

  function renderSystemMessage(msg) {
    const article = utils.createElement(
      '<article class="message system" data-msg-id="' + utils.escapeHtml(msg.id) + '">' +
        '<div class="gen-status">' + icon("info") + "<span></span></div>" +
        "</article>"
    );
    article.querySelector("span").textContent = msg.content || "";
    return article;
  }

  function bindMessageActions(article, msg, conv) {
    article.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.getAttribute("data-action");
        if (action === "copy") {
          window.SeedChatChat.copyMessage(msg);
        } else if (action === "edit") {
          window.SeedChatChat.startEditMessage(article, msg);
        } else if (action === "regenerate") {
          window.SeedChatChat.regenerate(conv);
        }
      });
    });
  }

  /* ---------------- Streaming support ---------------- */

  /** Create a placeholder assistant message DOM for streaming. */
  function createStreamElement() {
    const article = utils.createElement(
      '<article class="message assistant msg-streaming">' +
        '<div class="msg-meta">' +
        '<div class="msg-avatar">' + icon("spark") + "</div>" +
        '<div class="msg-who">Seed Code Chat<span class="msg-model streaming-model"></span></div>' +
        "</div>" +
        '<div class="seed-load" aria-hidden="true">' +
        '<span class="seed-load-ico"><img src="assets/seedcode.ico" alt="" /></span>' +
        '<span class="seed-load-text">Generating…</span>' +
        "</div>" +
        '<div class="markdown" data-markdown></div>' +
        "</article>"
    );
    return article;
  }

  /** First response token arrived — swap the loading icon for content. */
  function revealStream(el) {
    if (!el) return;
    const load = el.querySelector(".seed-load");
    if (load) {
      load.classList.add("done");
    }
    if (!el.classList.contains("has-stream")) {
      el.classList.add("has-stream");
    }
  }

  /** Force-remove the loading icon (stop / error / empty response). */
  function stopStreamLoader(el) {
    if (!el) return;
    const load = el.querySelector(".seed-load");
    if (load) load.classList.add("done");
  }

  /** Update streaming content. html provided as pre-rendered HTML. */
  function updateStreamElement(el, html) {
    const md = el.querySelector("[data-markdown]");
    if (md && md.innerHTML !== html) {
      md.innerHTML = html;
      scrollToBottom();
    }
  }

  /** Append a generation status chip into the chat area. */
  function appendStatusChip(html) {
    const scroll = els.chatScroll();
    if (!scroll) return;
    const chip = utils.createElement('<div class="gen-status">' + html + "</div>");
    scroll.appendChild(chip);
    scrollToBottom(true);
    return chip;
  }

  function appendErrorCard(html) {
    const scroll = els.chatScroll();
    if (!scroll) return;
    const card = utils.createElement('<div class="error-card">' + html + "</div>");
    scroll.appendChild(card);
    scrollToBottom(true);
    return card;
  }

  /* ---------------- Model selector ---------------- */

  function renderModelSelector() {
    const s = state.getState();
    const p = state.getActiveProvider();
    const models = p ? state.getProviderModels(p.id) : [];
    const label = p ? p.label : "No provider";
    const modelName = s.activeModelId || (models.length ? models[0].id : "—");

    const modelBtn = els.modelBtnName();
    const composerBtn = els.composerModelName();
    if (modelBtn) modelBtn.textContent = modelName;
    if (composerBtn) composerBtn.textContent = modelName;

    /* rebuild menu content for both triggers */
    const content = buildModelMenuHtml(models, s.activeModelId, p);

    document.querySelectorAll("[data-model-menu]").forEach((menu) => {
      menu.innerHTML = content;
    });

    renderProviderStatus();
  }

  function buildModelMenuHtml(models, activeModelId, providerConfig) {
    let html = "";
    if (providerConfig) {
      html +=
        '<div class="menu-label">' +
        utils.escapeHtml(providerConfig.label) +
        (providerConfig.freeOnly ? ' <span class="free-tag">FREE</span>' : "") +
        "</div>";
    }
    if (!models.length) {
      html +=
        '<div class="menu-item" style="color:var(--muted)">No models available. Open Settings → Providers to configure.</div>';
      return html;
    }
    models.forEach((m) => {
      const active = m.id === activeModelId;
      const free = m.free ? ' <span class="free-tag">FREE</span>' : "";
      const sub = m.contextWindow ? utils.formatNumber(m.contextWindow) + " tokens" : "Model";
      html +=
        '<button class="picker-item' + (active ? " active" : "") + '" data-model-id="' + utils.escapeHtml(m.id) + '" type="button">' +
        '<span class="pi-meta"><span class="pi-name">' + utils.escapeHtml(m.name || m.id) + free + '</span><span class="pi-sub">' + utils.escapeHtml(m.id) + " · " + sub + "</span></span>" +
        '<span class="pi-check">' + icon("check") + "</span>" +
        "</button>";
    });
    return html;
  }

  /* ---------------- Scroll ---------------- */

  /** Smart scrolling: never yank the view away while the user has
        scrolled up to read. force ignores that for navigation. */
  function scrollToBottom(force) {
    const area = document.getElementById("chat-area");
    if (!area) return;
    const nearBottom =
      area.scrollHeight - area.scrollTop - area.clientHeight < 140;
    if (!force && !nearBottom) return;
    requestAnimationFrame(() => {
      area.scrollTop = area.scrollHeight;
    });
  }

  /* ---------------- Public renderer ---------------- */

  window.SeedChatRenderer = {
    icon,
    renderSidebar,
    setSearchQuery,
    renderProviderStatus,
    renderHeaderTitle,
    renderChatArea,
    renderModelSelector,
    createStreamElement,
    updateStreamElement,
    revealStream,
    stopStreamLoader,
    appendStatusChip,
    appendErrorCard,
    scrollToBottom,
    buildModelMenuHtml,
  };

  utils.formatNumber = function (n) {
    n = Number(n) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(0) + "K";
    return String(n);
  };
})();
