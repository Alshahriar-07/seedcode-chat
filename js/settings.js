/* ============================================================
   Seed Code Chat — Settings
   Dedicated /settings page with a sidebar nav.
   Sections: General · AI · Providers · Chat · Data & Privacy ·
             Account · About
   Provider detail (keys, models, fallback) lives in a modal.
   ============================================================ */

(function () {
  "use strict";

  const state = window.SeedChatState;
  const utils = window.SeedChatUtils;
  const storage = window.SeedChatStorage;
  const providers = window.SeedChatProviders;
  const renderer = window.SeedChatRenderer;
  const icon = renderer.icon;

  const Settings = {};

  const NAV = [
    { id: "general", label: "General" },
    { id: "ai", label: "AI" },
    { id: "providers", label: "Providers" },
    { id: "chat", label: "Chat" },
    { id: "data", label: "Data & Privacy" },
    { id: "account", label: "Account" },
    { id: "about", label: "About" },
  ];

  let currentSection = "general";

  /* ---------------- open / close ---------------- */

  function open(section) {
    if (window.SeedChatShell) window.SeedChatShell.openSettings(section);
  }

  function close() {
    if (window.SeedChatShell) window.SeedChatShell.navigate("index.html");
  }

  function isOpen() {
    return Boolean(
      window.SeedChatShell && window.SeedChatShell.pageName() === "settings"
    );
  }

  /* ---------------- Section switching ---------------- */

  function switchSection(section) {
    if (!NAV.find((n) => n.id === section)) section = "general";
    currentSection = section;
    updateNavState();
    render();
  }

  function updateNavState() {
    document.querySelectorAll("#settings-nav .sn-btn").forEach((btn) => {
      const active = btn.getAttribute("data-section") === currentSection;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-current", active ? "page" : "false");
    });
  }

  /* ---------------- Page shell ---------------- */

  function renderPage(section) {
    if (section) currentSection = section;
    const shell = document.getElementById("page-shell");
    if (!shell) return;

    shell.innerHTML =
      '<div class="settings-page">' +
      '<nav class="settings-page-nav" id="settings-nav" aria-label="Settings sections">' +
      '<div class="sp-nav-label">Settings</div>' +
      NAV.map(
        (n) =>
          '<button class="sn-btn" data-section="' + n.id + '" type="button">' +
          icon(sectionIcon(n.id)) + "<span>" + n.label + "</span></button>"
      ).join("") +
      "</nav>" +
      '<div class="settings-page-main">' +
      '<div class="settings-head"><h2>' + icon("settings") + "Settings</h2></div>" +
      '<div class="settings-body" id="settings-body"></div>' +
      "</div>" +
      "</div>";

    document.getElementById("settings-nav").addEventListener("click", (e) => {
      const btn = e.target.closest(".sn-btn");
      if (btn) switchSection(btn.getAttribute("data-section"));
    });

    updateNavState();
    render();
  }

  function sectionIcon(id) {
    switch (id) {
      case "general": return "settings";
      case "ai": return "spark";
      case "providers": return "route";
      case "chat": return "chat";
      case "data": return "db";
      case "account": return "shield";
      case "about": return "info";
      default: return "settings";
    }
  }

  function render() {
    const body = document.getElementById("settings-body");
    if (!body) return;
    switch (currentSection) {
      case "ai":
        body.innerHTML = renderAiSection();
        bindAiSection(body);
        break;
      case "providers":
        body.innerHTML = renderProvidersSection();
        bindProvidersSection(body);
        break;
      case "chat":
        body.innerHTML = renderChatSection();
        bindChatSection(body);
        break;
      case "data":
        body.innerHTML = renderDataSection();
        bindDataSection(body);
        break;
      case "account":
        body.innerHTML = renderAccountSection();
        bindAccountSection(body);
        break;
      case "about":
        body.innerHTML = renderAboutSection();
        break;
      case "general":
      default:
        body.innerHTML = renderGeneralSection();
        bindGeneralSection(body);
        break;
    }
  }

  /* ---------------- General ---------------- */

  function renderGeneralSection() {
    const s = state.getState();
    const theme = s.ui.theme;
    const density = s.ui.density || "standard";
    return (
      '<section class="settings-section">' +
      "<h3>Appearance</h3>" +
      settingRow("Theme", "Seed Code dark identity", '<div class="segmented" id="theme-seg">' +
        '<button class="seg-btn' + (theme === "dark" ? " active" : "") + '" data-theme="dark" aria-pressed="' + (theme === "dark") + '">Dark</button>' +
        '<button class="seg-btn' + (theme === "system" ? " active" : "") + '" data-theme="system" aria-pressed="' + (theme === "system") + '">System</button>' +
        "</div>") +
      settingRow("Message density", "Tighter spacing for longer threads.", '<select class="select" id="density-sel" aria-label="Message density">' +
        '<option value="standard"' + (density !== "compact" ? " selected" : "") + ">Standard</option>" +
        '<option value="compact"' + (density === "compact" ? " selected" : "") + ">Compact</option>" +
        "</select>") +
      "</section>" +
      '<section class="settings-section">' +
      "<h3>Language</h3>" +
      settingRow("Interface language", "The interface is currently English.", '<select class="select" aria-label="Language" disabled><option selected>English</option></select>') +
      "</section>"
    );
  }

  function bindGeneralSection(body) {
    body.querySelectorAll("[data-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.setTheme(btn.getAttribute("data-theme"));
        window.SeedChatUI.applyTheme(btn.getAttribute("data-theme"));
        body.querySelectorAll("[data-theme]").forEach((b) => {
          const active = b === btn;
          b.classList.toggle("active", active);
          b.setAttribute("aria-pressed", active ? "true" : "false");
        });
      });
    });
    const density = body.querySelector("#density-sel");
    if (density) {
      density.addEventListener("change", () => {
        state.setDensity(density.value);
        applyDensity();
      });
    }
  }

  /* ---------------- AI ---------------- */

  function renderAiSection() {
    const s = state.getState();
    const gen = s.generation;
    const activeProvider = state.getActiveProvider();
    const enabledProviders = s.providers.filter((p) => p.enabled);
    const models = activeProvider ? state.getProviderModels(activeProvider.id) : [];

    const providerOptions = enabledProviders.length
      ? '<select class="select" id="ai-provider" aria-label="Provider">' +
        enabledProviders
          .map((p) =>
            '<option value="' + utils.escapeHtml(p.id) + '"' + (p.id === s.activeProviderId ? " selected" : "") + ">" +
            utils.escapeHtml(p.label) + "</option>"
          )
          .join("") +
        "</select>"
      : '<div class="sr-desc" style="color:var(--warning)">No enabled provider. Configure one in Providers.</div>';

    const modelOptions = models.length
      ? '<select class="select" id="ai-model" aria-label="Model">' +
        models
          .map((m) =>
            '<option value="' + utils.escapeHtml(m.id) + '"' + (m.id === s.activeModelId ? " selected" : "") + ">" +
            utils.escapeHtml(m.name || m.id) + (m.free ? " (FREE)" : "") + "</option>"
          )
          .join("") +
        "</select>"
      : '<div class="sr-desc" style="color:var(--muted)">No models available for this provider.</div>';

    return (
      '<section class="settings-section">' +
      "<h3>Provider &amp; model</h3>" +
      settingRow("Provider", "Primary provider used for new messages.", providerOptions) +
      settingRow("Model", "The active model for this provider.", modelOptions) +
      "</section>" +
      '<section class="settings-section">' +
      "<h3>Generation</h3>" +
      rangeRow("Temperature", "Controls randomness. Lower is more focused, higher is more creative.", "temperature", 0, 2, 0.1, gen.temperature) +
      rangeRow("Max output tokens", "Maximum length of each response.", "max-tokens", 256, 16384, 256, gen.maxTokens) +
      settingRow("Stream responses", "Show the response as it is generated.", toggle("streaming", gen.streaming)) +
      "</section>" +
      '<section class="settings-section">' +
      "<h3>Fallback</h3>" +
      settingRow("Automatic fallback", "Retry with a fallback provider on quota / rate-limit failures.", toggle("auto-fallback", gen.autoFallback !== false)) +
      '<div class="setting-row"><div class="sr-info">' +
      '<div class="sr-title">Fallback rule</div>' +
      '<div class="sr-desc">Default routing is OpenRouter (free models only).</div></div>' +
      '<span class="tag brand">FREE ONLY</span></div>' +
      '<p style="font-size:var(--fs-12);color:var(--muted);margin-top:8px">' +
      "Fallback triggers only on quota, rate-limit, or provider-unavailable failures. It never silently switches to a paid model.</p>" +
      "</section>"
    );
  }

  function bindAiSection(body) {
    const providerSel = body.querySelector("#ai-provider");
    if (providerSel) {
      providerSel.addEventListener("change", () => {
        state.setActiveProvider(providerSel.value);
        render();
        window.SeedChatRenderer.renderModelSelector();
        window.SeedChatUI.toast("Provider switched", "ok");
      });
    }
    const modelSel = body.querySelector("#ai-model");
    if (modelSel) {
      modelSel.addEventListener("change", () => {
        const pr = state.getActiveProvider();
        state.setActiveModel(modelSel.value, pr ? pr.id : null);
        window.SeedChatRenderer.renderModelSelector();
        window.SeedChatUI.toast("Model switched", "ok");
      });
    }
    body.querySelector("#temperature").addEventListener("input", (e) => {
      const v = parseFloat(e.target.value);
      body.querySelector('[data-out="temperature"]').textContent = v.toFixed(1);
      state.updateGeneration({ temperature: v });
    });
    body.querySelector("#max-tokens").addEventListener("input", (e) => {
      const v = parseInt(e.target.value, 10);
      body.querySelector('[data-out="max-tokens"]').textContent = v >= 1000 ? (v / 1000).toFixed(1) + "k" : v;
      state.updateGeneration({ maxTokens: v });
    });
    body.querySelector("#streaming").addEventListener("change", (e) => {
      state.updateGeneration({ streaming: e.target.checked });
    });
    body.querySelector("#auto-fallback").addEventListener("change", (e) => {
      state.updateGeneration({ autoFallback: e.target.checked });
    });
  }

  /* ---------------- Providers ---------------- */

  function renderProvidersSection() {
    const s = state.getState();
    const activeId = s.activeProviderId;

    let html =
      '<section class="settings-section">' +
      "<h3>AI Providers</h3>" +
      '<p style="color:var(--muted);font-size:var(--fs-13);margin-bottom:12px">' +
      "Pick your primary provider and an optional free fallback. Keys are stored in your browser only and are never written to chat history.</p>";

    s.providers.forEach((p) => {
      const adapter = providers.getAdapter(p.provider);
      const hasKey = p.apiKeyRef ? storage.hasKey(p.apiKeyRef) : false;
      const online = p.enabled && hasKey;
      const badges = [];
      if (p.isDefault) badges.push('<span class="pc-primary">PRIMARY</span>');
      if (p.isFallback) badges.push('<span class="tag">FALLBACK</span>');
      html +=
        '<div class="provider-card' + (p.id === activeId ? " active" : "") + '" data-edit-provider="' + utils.escapeHtml(p.id) + '" role="button" tabindex="0">' +
        '<div class="pc-icon">' + icon(providers.getAdapterIcon(p.provider)) + "</div>" +
        '<div class="pc-info">' +
        '<div class="pc-name">' + utils.escapeHtml(p.label) + " " + badges.join(" ") + "</div>" +
        '<div class="pc-desc">' + utils.escapeHtml(adapter ? adapter.description : "") + "</div>" +
        "</div>" +
        '<div class="pc-status"><span class="tag ' + (online ? "online" : "offline") + '">' + (online ? "Ready" : p.enabled ? "Needs key" : "Disabled") + "</span></div>" +
        "</div>";
    });

    html +=
      '<button class="btn btn-ghost btn-block" id="btn-add-provider" type="button">' +
      icon("plus") + " Add provider</button>" +
      "</section>";

    return html;
  }

  function bindProvidersSection(body) {
    body.querySelectorAll("[data-edit-provider]").forEach((el) => {
      const openFn = () => openProviderDetail(el.getAttribute("data-edit-provider"));
      el.addEventListener("click", openFn);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openFn();
        }
      });
    });
    body.querySelector("#btn-add-provider").addEventListener("click", openAddProviderFlow);
  }

  /* ---------------- Chat ---------------- */

  function renderChatSection() {
    const gen = state.getState().generation;
    return (
      '<section class="settings-section">' +
      "<h3>Chat preferences</h3>" +
      settingRow("Enter to send", "Press Enter to send a message; Shift+Enter for a new line.", toggle("enter-send", gen.enterToSend !== false)) +
      settingRow("Auto-title conversations", "Name new chats from the first message.", toggle("auto-title", gen.autoTitle)) +
      "</section>" +
      '<section class="settings-section">' +
      "<h3>Message actions</h3>" +
      '<div class="setting-row"><div class="sr-info"><div class="sr-title">Copy &amp; regenerate</div>' +
      '<div class="sr-desc">Copy, edit, and regenerate controls appear when hovering a message.</div></div>' +
      '<span class="tag brand">ON</span></div>' +
      "</section>"
    );
  }

  function bindChatSection(body) {
    body.querySelector("#enter-send").addEventListener("change", (e) => {
      state.updateGeneration({ enterToSend: e.target.checked });
    });
    body.querySelector("#auto-title").addEventListener("change", (e) => {
      state.updateGeneration({ autoTitle: e.target.checked });
    });
  }

  /* ---------------- Data & Privacy ---------------- */

  function renderDataSection() {
    const s = state.getState();
    return (
      '<section class="settings-section">' +
      "<h3>Chat data</h3>" +
      '<div class="export-actions">' +
      '<button class="btn" data-export-json type="button">' + icon("download") + " Export all (JSON)</button>" +
      '<button class="btn" data-export-md type="button">' + icon("download") + " Export active chat (Markdown)</button>" +
      '<button class="btn btn-danger" data-delete-all type="button">' + icon("trash") + " Delete all chats</button>" +
      "</div>" +
      '<p style="font-size:var(--fs-12);color:var(--muted);margin-top:10px">' +
      s.conversations.length + " conversation" + (s.conversations.length === 1 ? "" : "s") + " stored locally." +
      "</p>" +
      "</section>" +
      '<section class="settings-section">' +
      "<h3>API keys</h3>" +
      '<div class="export-actions">' +
      '<button class="btn btn-danger" data-clear-keys type="button">' + icon("shield") + " Remove all stored keys</button>" +
      "</div>" +
      '<div class="storage-note">' + icon("warn") +
      "<span><strong>Browser storage is not a secret vault.</strong> Keys are kept in this browser only and never sent to chat history, logs, or unrelated providers. Default shared keys shipped with the app are public credentials.</span>" +
      "</div>" +
      "</section>"
    );
  }

  function bindDataSection(body) {
    body.querySelector("[data-export-json]").addEventListener("click", exportJson);
    body.querySelector("[data-export-md]").addEventListener("click", exportMarkdown);
    body.querySelector("[data-delete-all]").addEventListener("click", async () => {
      const ok = await window.SeedChatUI.confirm({
        title: "Delete all conversations?",
        body: "This permanently removes every conversation stored in this browser.",
        okText: "Delete all",
        danger: true,
      });
      if (ok) {
        state.getState().conversations = [];
        state.getState().activeConversationId = null;
        await storage.deleteAllConversations();
        window.SeedChatRenderer.renderChatArea();
        window.SeedChatRenderer.renderSidebar();
        window.SeedChatRenderer.renderHeaderTitle();
        window.SeedChatUI.toast("All conversations deleted", "ok");
      }
    });
    body.querySelector("[data-clear-keys]").addEventListener("click", async () => {
      const ok = await window.SeedChatUI.confirm({
        title: "Remove all stored API keys?",
        body: "Stored provider keys will be deleted from this browser. Default shared keys will be restored.",
        okText: "Remove keys",
        danger: true,
      });
      if (ok) {
        storage.clearKeys();
        providers.seedDefaults({});
        window.SeedChatUI.toast("Stored keys removed", "ok");
        render();
      }
    });
  }

  function exportJson() {
    const s = state.getState();
    const data = {
      app: "Seed Code Chat",
      version: window.SeedChatConfig.version,
      exportedAt: new Date().toISOString(),
      conversations: s.conversations,
    };
    utils.downloadText(
      "seed-code-chat-export.json",
      JSON.stringify(data, null, 2),
      "application/json"
    );
    window.SeedChatUI.toast("Export downloaded", "ok");
  }

  function exportMarkdown() {
    const conv = state.getActiveConversation();
    if (!conv) {
      window.SeedChatUI.toast("Open a conversation to export it", "warning");
      return;
    }
    let md = "# " + conv.title + "\n\n";
    conv.messages.forEach((m) => {
      if (m.role === "user") md += "## User\n\n" + m.content + "\n\n";
      else if (m.role === "assistant") md += "## Seed Code Chat\n\n" + m.content + "\n\n";
    });
    utils.downloadText(
      "chat-" + utils.uid("").slice(0, 6) + ".md",
      md,
      "text/markdown"
    );
    window.SeedChatUI.toast("Markdown export downloaded", "ok");
  }

  /* ---------------- Account ---------------- */

  function renderAccountSection() {
    const user = window.SeedChatAuth.getSession();
    if (!user) {
      return (
        '<section class="settings-section">' +
        "<h3>Account</h3>" +
        '<div class="setting-row"><div class="sr-info">' +
        '<div class="sr-title">Not signed in</div>' +
        '<div class="sr-desc">Sign in to manage your account and profile.</div></div>' +
        "</div>" +
        '<div class="export-actions">' +
        '<button class="btn btn-primary" id="acct-login" type="button">Sign in</button>' +
        '<button class="btn" id="acct-signup" type="button">Create account</button>' +
        "</div></section>"
      );
    }
    return (
      '<section class="settings-section">' +
      "<h3>Account</h3>" +
      '<div class="setting-row"><div class="sr-info">' +
      '<div class="sr-title">' + utils.escapeHtml(user.name) + "</div>" +
      '<div class="sr-desc">' + utils.escapeHtml(user.email) + "</div></div>" +
      '<span class="tag online">Signed in</span></div>' +
      '<div class="export-actions">' +
      '<button class="btn" id="acct-profile" type="button">' + icon("shield") + " View profile</button>" +
      '<button class="btn btn-danger" id="acct-logout" type="button">' + icon("alert") + " Log out</button>" +
      "</div></section>"
    );
  }

  function bindAccountSection(body) {
    const user = window.SeedChatAuth.getSession();
    const loginBtn = body.querySelector("#acct-login");
    const signupBtn = body.querySelector("#acct-signup");
    const profileBtn = body.querySelector("#acct-profile");
    const logoutBtn = body.querySelector("#acct-logout");
    if (loginBtn) loginBtn.addEventListener("click", () => window.SeedChatShell && window.SeedChatShell.navigate("login.html"));
    if (signupBtn) signupBtn.addEventListener("click", () => window.SeedChatShell && window.SeedChatShell.navigate("signup.html"));
    if (profileBtn) profileBtn.addEventListener("click", () => window.SeedChatShell && window.SeedChatShell.navigate("profile.html"));
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        window.SeedChatAuth.logout().then(() => {
          window.SeedChatUI.toast("Signed out", "ok");
          if (window.SeedChatShell) window.SeedChatShell.navigate("login.html");
        });
      });
    }
    if (!user) return;
  }

  /* ---------------- About ---------------- */

  function renderAboutSection() {
    const links = window.SeedChatShell ? window.SeedChatShell.links : {};
    return (
      '<div class="about-block">' +
      '<img class="about-logo-img" src="assets/logo.png" alt="Seed Code logo" />' +
      '<div class="about-name">Seed Code Chat</div>' +
      '<div class="about-ver">v' + window.SeedChatConfig.version + "</div>" +
      '<p class="about-desc">Designed &amp; Developed by <strong>Eagox Studio</strong>.<br />' +
      'Creator — <a href="' + links.portfolio + '" target="_blank" rel="noopener">Al Shahriar Sowan</a>.</p>' +
      '<p class="about-desc">A premium general-purpose AI chat assistant with a Seed Code identity. Conversations are stored locally in your browser and routed through the providers you configure.</p>' +
      '<div class="about-links">' +
      '<a class="btn btn-ghost" href="' + links.github + '" target="_blank" rel="noopener">' + icon("route") + " GitHub</a>" +
      '<a class="btn btn-ghost" href="' + links.portfolio + '" target="_blank" rel="noopener">' + icon("link") + " Portfolio</a>" +
      '<a class="btn btn-ghost" href="' + links.cli + '" target="_blank" rel="noopener">' + icon("terminal") + " Seed Code CLI</a>" +
      "</div>" +
      '<div class="credits">' +
      "<span>Default routing: OpenRouter (free models only)</span>" +
      "<span>OpenAI-compatible provider adapters · Vanilla JS · No framework</span>" +
      "<span>© " + new Date().getFullYear() + " Eagox Studio</span>" +
      "</div>" +
      "</div>"
    );
  }

  /* ---------------- Provider detail dialog ---------------- */

  function getProviderById(id) {
    return state.getState().providers.find((p) => p.id === id) || null;
  }

  function openProviderDetail(id) {
    const pc = getProviderById(id);
    if (!pc) return;
    const box = document.getElementById("provider-dialog-box");
    const dialog = document.getElementById("provider-dialog");
    box.innerHTML = renderProviderForm(pc);
    dialog.hidden = false;
    bindProviderForm(box, pc, id);
    focusFirstInput(box);
  }

  function renderProviderForm(pc) {
    const adapter = providers.getAdapter(pc.provider);
    const hasKey = pc.apiKeyRef ? storage.hasKey(pc.apiKeyRef) : false;
    return (
      '<div class="provider-form">' +
      '<div class="pf-head">' +
      '<div class="pc-icon">' + icon(providers.getAdapterIcon(pc.provider)) + "</div>" +
      "<div><h3>" + utils.escapeHtml(pc.label) + "</h3>" +
      '<div class="pf-sub">' + utils.escapeHtml(adapter.description) + "</div></div>" +
      "</div>" +
      '<div class="field"><label for="pf-label">Name</label>' +
      '<input class="input" id="pf-label" data-pf-label value="' + utils.escapeHtml(pc.label) + '" />' +
      "</div>" +
      '<div class="field"><label for="pf-key">API key</label>' +
      (adapter.hasKeyHint
        ? '<div class="field-hint">Keys look like <code>' + utils.escapeHtml((adapter.keyPrefix || "sk-") + "…") + "</code></div>"
        : '<div class="field-hint">Provide the API key issued by your endpoint.</div>') +
      '<div class="password-input">' +
      '<input class="input" id="pf-key" data-pf-key type="password" placeholder="' + (hasKey ? "•••••••••• (stored)" : "Enter API key") + '" autocomplete="off" />' +
      '<button class="eye-btn" data-toggle-key type="button" aria-label="Show or hide key">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>' +
      "</button></div>" +
      "</div>" +
      '<div class="field"><label for="pf-base">Base URL</label>' +
      '<input class="input" id="pf-base" data-pf-base value="' + utils.escapeHtml(pc.baseUrl || "") + '" placeholder="https://api.example.com/v1" />' +
      "</div>" +
      '<div class="field"><label>Models</label>' +
      '<div class="field-hint">Choose which models appear in the chat model selector. Leave \u201cUse all\u201d enabled to show the full provider catalog.</div>' +
      '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">' +
      '<label class="switch" style="margin-right:8px"><input type="checkbox" data-pf-useall' + (pc.modelIds ? "" : " checked") + ' /><span class="track"></span></label>' +
      '<span style="font-size:var(--fs-13)">Use all available models</span></div>' +
      '<div class="field-hint" style="display:flex;gap:8px;margin-bottom:8px">' +
      '<button class="btn btn-sm" data-pf-fetch type="button">' + icon("refresh") + " Fetch models</button>" +
      '<button class="btn btn-sm btn-ghost" data-pf-reset type="button">Reset list</button></div>' +
      '<input class="input" data-pf-filter placeholder="Filter models…" style="margin-bottom:8px" />' +
      '<div data-pf-modellist style="max-height:220px;overflow-y:auto"></div>' +
      (pc.provider === "custom"
        ? '<div style="display:flex;gap:6px;margin-top:8px"><input class="input" data-pf-custommodel placeholder="Add custom model id" /><button class="btn btn-sm" data-pf-addmodel type="button">Add</button></div>'
        : "") +
      "</div>" +
      '<div style="display:flex;gap:8px;margin-bottom:16px;align-items:center">' +
      '<label class="switch"><input type="checkbox" data-pf-enabled' + (pc.enabled ? " checked" : "") + ' /><span class="track"></span></label>' +
      '<span style="font-size:var(--fs-13)">Provider enabled</span></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-sm" data-pf-test type="button">' + icon("check") + " Test connection</button>" +
      (pc.isDefault
        ? '<button class="btn btn-sm" disabled>Primary</button>'
        : '<button class="btn btn-sm" data-pf-primary type="button">Set as primary</button>') +
      '<button class="btn btn-sm btn-ghost" data-pf-fallback type="button">' + (pc.isFallback ? "Unset fallback" : "Set as fallback") + "</button>" +
      "</div>" +
      '<div data-pf-testresult style="margin-top:10px"></div>' +
      '<div class="dialog-foot" style="padding:14px 0 0;border-top:1px solid var(--border)">' +
      '<button class="btn btn-danger btn-sm" data-pf-delete type="button">' + icon("trash") + " Remove provider</button>" +
      '<div style="flex:1"></div>' +
      '<button class="btn btn-ghost" data-pf-cancel type="button">Cancel</button>' +
      '<button class="btn btn-primary" data-pf-save type="button">Save</button>' +
      "</div>" +
      "</div>"
    );
  }

  function bindProviderForm(box, pc, id) {
    const dialog = document.getElementById("provider-dialog");

    /* toggle key visibility */
    box.querySelector("[data-toggle-key]").addEventListener("click", function () {
      const input = box.querySelector("[data-pf-key]");
      input.type = input.type === "password" ? "text" : "password";
    });

    /* close */
    box.querySelector("[data-pf-cancel]").addEventListener("click", () => {
      dialog.hidden = true;
    });
    box.querySelectorAll("[data-pf-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ok = await window.SeedChatUI.confirm({
          title: "Remove provider?",
          body: "Remove " + pc.label + " from your configuration? Stored API key will be deleted.",
          okText: "Remove",
          danger: true,
        });
        if (ok) {
          if (pc.apiKeyRef) storage.deleteKey(pc.apiKeyRef);
          state.getState().providers = state.getState().providers.filter((p) => p.id !== id);
          if (state.getState().activeProviderId === id) {
            const next = state.getState().providers.find((p) => p.enabled) || state.getState().providers[0];
            state.setActiveProvider(next ? next.id : null);
          }
          persistProviders();
          dialog.hidden = true;
          render();
          window.SeedChatRenderer.renderSidebar();
        }
      });
    });

    /* save */
    box.querySelector("[data-pf-save]").addEventListener("click", () => saveProviderForm(box, pc, id));

    /* test connection */
    box.querySelector("[data-pf-test]").addEventListener("click", async () => {
      await testProvider(box, pc);
    });

    /* primary / fallback */
    box.querySelectorAll("[data-pf-primary]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.getState().providers.forEach((p) => (p.isDefault = p.id === id));
        persistProviders();
        state.setActiveProvider(id);
        window.SeedChatUI.toast(pc.label + " set as primary", "ok");
        openProviderDetail(id);
      });
    });
    box.querySelectorAll("[data-pf-fallback]").forEach((btn) => {
      btn.addEventListener("click", () => {
        pc.isFallback = !pc.isFallback;
        persistProviders();
        openProviderDetail(id);
        window.SeedChatUI.toast(
          pc.isFallback ? "Fallback enabled for " + pc.label : "Fallback disabled",
          "ok"
        );
      });
    });

    /* model list */
    const useAll = box.querySelector("[data-pf-useall]");
    const modelListEl = box.querySelector("[data-pf-modellist]");

    function renderModelList(filter) {
      const useAllModels = useAll.checked;
      let models = providers.resolveModels(pc);
      if (!useAllModels && Array.isArray(pc.modelIds)) {
        models = pc.modelIds.map((m) => providers.modelFromId(m, pc.provider)).filter(Boolean);
      }
      if (filter) {
        const f = filter.toLowerCase();
        models = models.filter((m) => (m.id + " " + m.name).toLowerCase().includes(f));
      }
      if (!models.length) {
        modelListEl.innerHTML = '<div style="color:var(--muted);font-size:var(--fs-12)">No models loaded.</div>';
        return;
      }
      modelListEl.innerHTML = models
        .map((m) => {
          const checked = Array.isArray(pc.modelIds) && pc.modelIds.includes(m.id);
          const disabled = useAllModels ? " disabled" : "";
          const free = m.free ? ' <span class="mc-free">FREE</span>' : "";
          return (
            '<div class="model-chip">' +
            '<input type="checkbox" data-pf-mcheck value="' + utils.escapeHtml(m.id) + '"' + (checked ? " checked" : "") + disabled + ' />' +
            '<span class="mc-name" title="' + utils.escapeHtml(m.id) + '">' + utils.escapeHtml(m.name || m.id) + free + "</span>" +
            "<span>" + utils.escapeHtml(m.id) + "</span>" +
            "</div>"
          );
        })
        .join("");
    }

    renderModelList("");

    useAll.addEventListener("change", () => {
      if (useAll.checked) pc.modelIds = null;
      renderModelList(box.querySelector("[data-pf-filter]").value);
    });
    box.querySelector("[data-pf-filter]").addEventListener("input", (e) => {
      renderModelList(e.target.value);
    });
    modelListEl.addEventListener("change", (e) => {
      if (e.target.matches("[data-pf-mcheck]")) {
        const set = new Set(pc.modelIds || []);
        if (e.target.checked) set.add(e.target.value);
        else set.delete(e.target.value);
        pc.modelIds = Array.from(set);
      }
    });

    /* fetch models */
    box.querySelector("[data-pf-fetch]").addEventListener("click", async () => {
      const btn = box.querySelector("[data-pf-fetch]");
      const testEl = box.querySelector("[data-pf-testresult]");
      btn.disabled = true;
      btn.classList.add("is-loading");
      btn.innerHTML = '<span class="spinner" style="width:12px;height:12px"></span> Fetching…';
      try {
        const key = getKeyValue(box, pc);
        const live = await providers.fetchModels(pc, key || (pc.apiKeyRef ? storage.getKey(pc.apiKeyRef) : null));
        pc.liveModels = live;
        renderModelList(box.querySelector("[data-pf-filter]").value);
        window.SeedChatUI.toast("Loaded " + live.length + " models", "ok");
      } catch (err) {
        testEl.innerHTML =
          '<div class="gen-status error">' + icon("alert") + "<span>" + utils.escapeHtml("Could not fetch models: " + (err.message || err)) + "</span></div>";
      } finally {
        btn.disabled = false;
        btn.innerHTML = icon("refresh") + " Fetch models";
      }
    });

    box.querySelector("[data-pf-reset]").addEventListener("click", () => {
      pc.modelIds = null;
      pc.liveModels = null;
      renderModelList("");
    });

    /* custom model add */
    box.querySelectorAll("[data-pf-addmodel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const input = box.querySelector("[data-pf-custommodel]");
        const value = input.value.trim();
        if (!value) return;
        const set = new Set(pc.modelIds || []);
        set.add(value);
        pc.modelIds = Array.from(set);
        useAll.checked = false;
        input.value = "";
        renderModelList(box.querySelector("[data-pf-filter]").value);
      });
    });
  }

  function getKeyValue(box, pc) {
    const input = box.querySelector("[data-pf-key]");
    const typed = input ? input.value.trim() : "";
    if (typed) return typed;
    return pc.apiKeyRef ? storage.getKey(pc.apiKeyRef) : null;
  }

  async function testProvider(box, pc) {
    const testEl = box.querySelector("[data-pf-testresult]");
    testEl.innerHTML = '<div class="gen-status"><span class="spinner" style="width:13px;height:13px"></span> Testing connection…</div>';
    const key = getKeyValue(box, pc);
    const baseUrl = box.querySelector("[data-pf-base]").value.trim() || pc.baseUrl;
    const probe = Object.assign({}, pc, { baseUrl: baseUrl });
    const result = await providers.validateCredentials(probe, key);
    if (result.ok) {
      testEl.innerHTML =
        '<div class="gen-status">' + icon("check") + "<span>Connection successful.</span></div>";
    } else {
      testEl.innerHTML =
        '<div class="gen-status error">' + icon("alert") + "<span>" + utils.escapeHtml("Failed: " + result.error) + "</span></div>";
    }
  }

  function saveProviderForm(box, pc, id) {
    const label = box.querySelector("[data-pf-label]").value.trim() || pc.label;
    const baseUrl = box.querySelector("[data-pf-base]").value.trim() || pc.baseUrl;
    const keyValue = box.querySelector("[data-pf-key]").value.trim();
    const enabled = box.querySelector("[data-pf-enabled]").checked;

    pc.label = label;
    pc.baseUrl = baseUrl;
    pc.enabled = enabled;

    if (keyValue) {
      if (!pc.apiKeyRef) pc.apiKeyRef = utils.uid("k");
      storage.setKey(pc.apiKeyRef, keyValue);
    }
    if (!Array.isArray(pc.modelIds)) pc.modelIds = null;

    persistProviders();
    document.getElementById("provider-dialog").hidden = true;
    render();
    window.SeedChatRenderer.renderSidebar();
    window.SeedChatUI.toast("Provider saved", "ok");
  }

  function persistProviders() {
    const providersToSave = state.getState().providers.map((p) => ({
      id: p.id,
      provider: p.provider,
      label: p.label,
      baseUrl: p.baseUrl,
      apiKeyRef: p.apiKeyRef,
      enabled: p.enabled,
      isDefault: p.isDefault,
      isFallback: p.isFallback,
      freeOnly: p.freeOnly,
      modelIds: p.modelIds,
      createdAt: p.createdAt,
    }));
    storage.saveSettings({ providers: providersToSave });
    window.SeedChatRenderer.renderModelSelector();
    window.SeedChatRenderer.renderSidebar();
  }

  /* ---------------- Add provider flow ---------------- */

  function openAddProviderFlow() {
    const box = document.getElementById("provider-dialog-box");
    const dialog = document.getElementById("provider-dialog");
    box.innerHTML =
      '<div class="provider-form"><div class="pf-head">' +
      '<div class="pc-icon">' + icon("plus") + "</div>" +
      "<div><h3>Add provider</h3><div class=\"pf-sub\">Choose an AI provider to configure.</div></div>" +
      "</div>" +
      providers
        .listAdapters()
        .map((a) => {
          const existing = state.getState().providers.some((p) => p.provider === a.id);
          return (
            '<button class="provider-card" data-add-kind="' + a.id + '" type="button" style="margin-bottom:8px">' +
            '<div class="pc-icon">' + icon(a.icon) + "</div>" +
            '<div class="pc-info"><div class="pc-name">' + a.name + (existing ? ' <span class="tag">EXISTS</span>' : "") + "</div>" +
            '<div class="pc-desc">' + utils.escapeHtml(a.description) + "</div></div>" +
            '<div class="pc-status">' + icon("chevron") + "</div>" +
            "</button>"
          );
        })
        .join("") +
      '<div class="dialog-foot" style="padding:14px 0 0;border-top:1px solid var(--border)"><div style="flex:1"></div>' +
      '<button class="btn btn-ghost" data-pf-cancel type="button">Cancel</button></div></div>';
    dialog.hidden = false;

    box.querySelectorAll("[data-add-kind]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const kind = btn.getAttribute("data-add-kind");
        const pc = providers.buildConfig(kind);
        state.getState().providers.push(pc);
        openProviderDetail(pc.id);
      });
    });
    box.querySelector("[data-pf-cancel]").addEventListener("click", () => {
      dialog.hidden = true;
    });
  }

  /* ---------------- shared builders ---------------- */

  function settingRow(title, desc, control) {
    return (
      '<div class="setting-row"><div class="sr-info"><div class="sr-title">' + title + "</div>" +
      '<div class="sr-desc">' + desc + "</div></div>" + control + "</div>"
    );
  }

  function toggle(id, checked) {
    return (
      '<label class="switch"><input type="checkbox" id="' + id + '"' + (checked ? " checked" : "") + ' /><span class="track"></span></label>'
    );
  }

  function rangeRow(title, desc, id, min, max, step, value) {
    return (
      '<div class="setting-row"><div class="sr-info"><div class="sr-title">' + title + "</div>" +
      '<div class="sr-desc">' + desc + "</div></div>" +
      '<div class="range-row" style="min-width:220px;flex-direction:column;align-items:stretch">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">' +
      '<input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '" aria-label="' + title + '" />' +
      "<output data-out=\"" + id + "\">" + value + "</output></div>" +
      "</div></div>"
    );
  }

  function focusFirstInput(box) {
    const el = box.querySelector(".input, textarea");
    if (el) el.focus();
  }

  function applyDensity() {
    const density = state.getState().ui.density === "compact" ? "compact" : "";
    document.documentElement.dataset.density = density;
  }

  window.SeedChatSettings = {
    open,
    close,
    isOpen,
    render,
    renderPage,
    switchSection,
    openProviderDetail,
    persistProviders,
    applyDensity,
  };
})();
