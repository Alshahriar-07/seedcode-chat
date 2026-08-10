/* ============================================================
   Seed Code Chat — Chat Engine
   Send · Stream · Stop · Regenerate · Edit · Copy
   ============================================================ */

(function () {
  "use strict";

  const state = window.SeedChatState;
  const utils = window.SeedChatUtils;
  const markdown = window.SeedChatMarkdown;
  const renderer = window.SeedChatRenderer;
  const router = window.SeedChatRouter;
  const providers = window.SeedChatProviders;

  const Chat = {};

  /* Pending composer attachments */
  const pendingAttachments = [];

  /* Streaming bookkeeping */
  let streamFrame = null;
  let streamEl = null;
  let statusChip = null;
  let streamAccum = "";
  let streamDirty = false;

  /* ---------------- Helpers ---------------- */

  function isGenerating() {
    const s = state.getState();
    return Boolean(s.generating && s.generating.conversationId);
  }

  function abortController() {
    return state.getState().generating ? state.getState().generating.abortController : null;
  }

  function getChatArea() {
    return document.getElementById("chat-area");
  }

  function appendToChat(el) {
    const scroll = document.getElementById("chat-scroll");
    if (!scroll) return;
    scroll.appendChild(el);
    renderer.scrollToBottom(true);
  }

  /* ---------------- Send ---------------- */

  function send(text) {
    const value = (text != null ? String(text) : "").trim();
    if (!value) return;
    if (isGenerating()) return;

    let conv = state.getActiveConversation();

    if (!conv) {
      conv = createConversation();
    }

    const userMsg = {
      id: utils.uid("msg"),
      role: "user",
      content: value,
      createdAt: Date.now(),
      status: "complete",
      attachments: pendingAttachments.slice(),
    };

    conv.messages.push(userMsg);

    if (!conv.title || conv.title === "New chat") {
      conv.title = utils.deriveTitle(value);
    }
    conv.updatedAt = Date.now();
    state.updateConversation(conv.id, { title: conv.title, updatedAt: conv.updatedAt });

    pendingAttachments.length = 0;
    window.SeedChatUI.clearAttachmentsUI();

    renderer.renderChatArea();
    renderer.renderSidebar();
    renderer.renderHeaderTitle();
    renderer.scrollToBottom(true);

    generate(conv);
  }

  function createConversation() {
    const now = Date.now();
    const conv = {
      id: utils.uid("conv"),
      title: "New chat",
      createdAt: now,
      updatedAt: now,
      provider: null,
      model: null,
      messages: [],
    };
    state.addConversation(conv);
    renderer.renderChatArea();
    renderer.renderSidebar();
    renderer.renderHeaderTitle();
    return conv;
  }

  /* ---------------- Generate / stream ---------------- */

  function generate(conv) {
    if (!conv) return;
    if (isGenerating()) return;

    const controller = new AbortController();
    state.setGenerating({ conversationId: conv.id, abortController: controller, streaming: true });

    streamAccum = "";
    streamDirty = false;
    streamEl = renderer.createStreamElement();
    appendToChat(streamEl);

    statusChip = renderer.appendStatusChip('<span class="typing-dots"><span></span><span></span><span></span></span> <span>Preparing…</span>');

    const modelAtStart = state.getState().activeModelId;
    let providerLabel = state.getActiveProvider() ? state.getActiveProvider().label : "";
    let streamStarted = false;

    const onChunk = (chunk) => {
      if (!streamStarted && streamEl) {
        streamStarted = true;
        renderer.revealStream(streamEl);
      }
      if (streamEl) streamAccum += chunk;
      streamDirty = true;
      if (!streamFrame) {
        streamFrame = requestAnimationFrame(flushStream);
      }
    };

    const onStatus = (status) => {
      if (!statusChip) return;
      if (status.phase === "primary") {
        providerLabel = status.provider.label;
        statusChip.innerHTML =
          '<span class="live-dot"></span> Generating with <span class="gs-provider">' +
          utils.escapeHtml(status.provider.label) +
          "</span>";
        updateStreamModelLabel(status.provider, status.model);
      } else if (status.phase === "switching") {
        statusChip.innerHTML =
          '<span class="live-dot"></span> ' +
          utils.escapeHtml(status.fromProvider.label) +
          " hit a limit — <strong>switching to fallback</strong>…";
      } else if (status.phase === "fallback") {
        providerLabel = status.provider.label;
        statusChip.innerHTML =
          '<span class="live-dot"></span> Generating with <span class="gs-provider">' +
          utils.escapeHtml(status.provider.label) +
          ' <span class="free-tag">FREE</span></span>';
        updateStreamModelLabel(status.provider, status.model);
      }
      renderer.scrollToBottom(true);
    };

    const generationOpts = Object.assign({}, state.getState().generation);

    router
      .run({
        messages: conv.messages,
        model: modelAtStart,
        generation: generationOpts,
        signal: controller.signal,
        onChunk,
        onStatus,
      })
      .then(function (result) {
        cancelStreamFrame();
        finalizeAssistant(conv, {
          content: streamAccum,
          provider: result.provider.label,
          model: result.model,
          status: "complete",
          usedFallback: result.usedFallback,
        });
        if (statusChip) {
          statusChip.innerHTML =
            '<span class="live-dot"></span> ' +
            utils.escapeHtml(result.provider.label) +
            (result.usedFallback ? " <span class=\"free-tag\">FREE FALLBACK</span>" : "");
          setTimeout(() => {
            if (statusChip && statusChip.parentNode) statusChip.remove();
            statusChip = null;
          }, 3000);
        }
        state.setGenerating({ conversationId: null, abortController: null, streaming: false });
        renderer.renderSidebar();
        renderer.scrollToBottom(true);
      })
      .catch(function (error) {
        cancelStreamFrame();
        state.setGenerating({ conversationId: null, abortController: null, streaming: false });
        if (error.kind === "aborted") {
          const activeProvider = state.getActiveProvider();
          if (streamAccum.trim()) {
            finalizeAssistant(conv, {
              content: streamAccum,
              provider: providerLabel || (activeProvider ? activeProvider.label : null),
              model: modelAtStart,
              status: "stopped",
            });
          } else {
            if (streamEl && streamEl.parentNode) streamEl.remove();
          }
          if (statusChip) {
            statusChip.innerHTML = '<span class="gs-provider" style="color:var(--muted)">Generation stopped</span>';
            setTimeout(() => statusChip && statusChip.remove(), 2000);
          }
        } else {
          const failed = error.usedAttempts && error.usedAttempts.length
            ? error.usedAttempts[error.usedAttempts.length - 1]
            : null;
          const providerLabelName = failed && failed.provider ? failed.provider.label : providerLabel || "the provider";
          renderGenerationError(conv, error, providerLabelName);
        }
        renderer.renderSidebar();
        renderer.scrollToBottom(true);
      });
  }

  function updateStreamModelLabel(providerConfig, model) {
    if (!streamEl) return;
    const span = streamEl.querySelector(".streaming-model");
    if (span) span.textContent = providerConfig.label + " · " + (model || "");
  }

  function flushStream() {
    streamFrame = null;
    if (!streamEl || !streamDirty) return;
    streamDirty = false;
    renderer.updateStreamElement(streamEl, markdown.render(streamAccum));
    renderer.scrollToBottom();
  }

  function cancelStreamFrame() {
    if (streamFrame) {
      cancelAnimationFrame(streamFrame);
      streamFrame = null;
    }
  }

  function finalizeAssistant(conv, info) {
    if (!conv || !streamEl) return;
    const msg = {
      id: utils.uid("msg"),
      role: "assistant",
      content: info.content,
      createdAt: Date.now(),
      status: info.status || "complete",
      provider: info.provider || null,
      model: info.model || null,
      usedFallback: Boolean(info.usedFallback),
    };
    conv.messages.push(msg);
    conv.provider = info.provider || conv.provider;
    conv.model = info.model || conv.model;
    conv.updatedAt = Date.now();
    state.updateConversation(conv.id, { provider: conv.provider, model: conv.model, updatedAt: conv.updatedAt });
    streamEl.classList.remove("msg-streaming");
    streamEl.querySelector("[data-markdown]").innerHTML = markdown.render(info.content);
    streamEl = null;
    renderer.scrollToBottom(true);
  }

  /* ---------------- Error rendering ---------------- */

  function renderGenerationError(conv, error, providerName) {
    if (streamEl) {
      streamEl.remove();
      streamEl = null;
    }
    const desc = providers.describeError(error, providerName);
    renderer.appendErrorCard(
      renderer.icon("alert") +
        '<div class="ec-body"><div class="ec-title">Could not generate a response</div>' +
        utils.escapeHtml(desc) +
        '<div class="ec-actions">' +
        '<button class="btn btn-sm" data-retry type="button">Retry</button>' +
        '<button class="btn btn-sm btn-ghost" data-open-settings type="button">Open Settings</button>' +
        "</div></div>"
    );
    document.querySelectorAll(".error-card [data-retry]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".error-card").forEach((c) => c.remove());
        regenerate(conv);
      });
    });
    document.querySelectorAll(".error-card [data-open-settings]").forEach((btn) => {
      btn.addEventListener("click", () => window.SeedChatSettings.open("providers"));
    });
  }

  /* ---------------- Stop ---------------- */

  function stopGeneration() {
    const controller = abortController();
    if (controller) {
      controller.abort();
    }
  }

  /* ---------------- Regenerate ---------------- */

  function regenerate(conv) {
    if (isGenerating()) return;
    if (!conv) conv = state.getActiveConversation();
    if (!conv || !conv.messages.length) return;

    const last = conv.messages[conv.messages.length - 1];
    if (last.role === "assistant") {
      conv.messages.pop();
    }

    state.updateConversation(conv.id, { updatedAt: Date.now() });
    renderer.renderChatArea();
    renderer.scrollToBottom(true);
    generate(conv);
  }

  /* ---------------- Edit message ---------------- */

  function startEditMessage(article, msg) {
    const conv = state.getActiveConversation();
    if (!conv) return;

    const bubble = article.querySelector(".user-bubble");
    const origHtml = bubble.innerHTML;

    const textarea = utils.createElement(
      '<div><textarea class="edit-box" aria-label="Edit message"></textarea>' +
        '<div class="edit-actions">' +
        '<button class="btn btn-sm" data-save type="button">Save &amp; send</button>' +
        '<button class="btn btn-sm btn-ghost" data-cancel type="button">Cancel</button>' +
        "</div></div>"
    );
    textarea.querySelector(".edit-box").value = msg.content || "";
    bubble.innerHTML = "";
    bubble.appendChild(textarea);

    const ta = textarea.querySelector(".edit-box");
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);

    function cancel() {
      bubble.innerHTML = origHtml;
      article.querySelector(".user-content").textContent = msg.content || "";
    }

    textarea.querySelector("[data-cancel]").addEventListener("click", cancel);
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Escape") cancel();
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        save();
      }
    });

    function save() {
      const newText = ta.value;
      if (!newText.trim()) {
        cancel();
        return;
      }
      msg.content = newText;
      /* drop any assistant messages that follow this edit point */
      const idx = conv.messages.indexOf(msg);
      if (idx >= 0) {
        conv.messages = conv.messages.slice(0, idx + 1);
      }
      conv.updatedAt = Date.now();
      state.updateConversation(conv.id, { messages: conv.messages, updatedAt: conv.updatedAt });
      renderer.renderChatArea();
      renderer.scrollToBottom(true);
      generate(conv);
    }

    textarea.querySelector("[data-save]").addEventListener("click", save);
  }

  /* ---------------- Copy ---------------- */

  function copyMessage(msg) {
    const text = msg.content || "";
    utils.copyText(text).then(function (ok) {
      if (ok) window.SeedChatUI.toast("Copied to clipboard", "ok");
      else window.SeedChatUI.toast("Copy failed", "error");
    });
  }

  /* Copy a code block's exact source (no fences, no language tag).
     Reads the plain text from the rendered <pre><code> node, which the
     highlighter stores as real text nodes — this survives streaming,
     regeneration, and markdown re-renders. */

  const copyFlashTimers = new WeakMap();

  function flashCopied(btn) {
    if (!btn.dataset.origHtml) btn.dataset.origHtml = btn.innerHTML;
    const timer = copyFlashTimers.get(btn);
    if (timer) {
      clearTimeout(timer);
      btn.innerHTML = btn.dataset.origHtml;
      btn.classList.remove("copied");
    }
    btn.innerHTML = renderer.icon("check") + "Copied";
    btn.classList.add("copied");
    btn.setAttribute("aria-live", "polite");
    copyFlashTimers.set(
      btn,
      setTimeout(() => {
        btn.innerHTML = btn.dataset.origHtml;
        btn.classList.remove("copied");
        copyFlashTimers.delete(btn);
      }, 1600)
    );
  }

  function copyCodeBlock(btn) {
    const block = btn.closest ? btn.closest(".code-block") : null;
    if (!block) return;
    const codeEl = block.querySelector("pre code");
    const text = codeEl ? codeEl.textContent || "" : "";
    utils.copyText(text).then(function (ok) {
      if (ok) {
        flashCopied(btn);
        window.SeedChatUI.toast("Code copied to clipboard", "ok");
      } else {
        window.SeedChatUI.toast("Copy failed", "error");
      }
    });
  }

  /* Delegated listener: covers code blocks rendered at any time —
     static messages, streamed responses, regenerations, edits. */
  document.addEventListener("click", function (e) {
    const btn = e.target && e.target.closest ? e.target.closest("[data-copy-code]") : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    copyCodeBlock(btn);
  });

  /* ---------------- Composer helpers ---------------- */

  function setComposer(text) {
    const ta = document.getElementById("composer-input");
    if (ta) {
      ta.value = text;
      window.SeedChatUI.autoGrow(ta);
      focusComposer();
    }
  }

  function focusComposer() {
    const ta = document.getElementById("composer-input");
    if (ta) ta.focus();
  }

  function addAttachment(name, content) {
    pendingAttachments.push({ name: name, content: content });
    window.SeedChatUI.renderAttachments(pendingAttachments);
  }

  function getPendingAttachments() {
    return pendingAttachments;
  }

  window.SeedChatChat = {
    send,
    generate,
    stopGeneration,
    regenerate,
    startEditMessage,
    copyMessage,
    setComposer,
    focusComposer,
    addAttachment,
    getPendingAttachments,
    isGenerating,
  };
})();
