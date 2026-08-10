/* ============================================================
   Seed Code Chat — History page (history.html)
   Renders every local conversation; clicking opens the chat.
   ============================================================ */

(function () {
  "use strict";

  const state = window.SeedChatState;
  const utils = window.SeedChatUtils;
  const renderer = window.SeedChatRenderer;
  const icon = renderer.icon;

  function renderHistory() {
    const convs = state
      .getState()
      .conversations.slice()
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    let html =
      '<div class="page-head">' +
      "<h1>History</h1>" +
      "<p>Every conversation is stored locally in this browser.</p>" +
      "</div>";

    if (!convs.length) {
      html +=
        '<div class="empty-state" style="border:1px solid var(--border);border-radius:var(--r-lg)">' +
        '<div class="es-icon">' + icon("chat") + "</div>" +
        "<h2>No conversations yet</h2>" +
        "<p>Start a new chat and it will appear here.</p>" +
        '<button class="btn btn-primary" id="hist-new-chat" type="button">' + icon("plus") + " New chat</button>" +
        "</div>";
    } else {
      html +=
        '<div class="history-list">' +
        convs
          .map(function (c) {
            const lastMsg = c.messages && c.messages[c.messages.length - 1];
            const preview = lastMsg
              ? utils.previewText(lastMsg.content, 110)
              : "Empty conversation";
            return (
              '<button class="history-card" data-conv-id="' + utils.escapeHtml(c.id) + '" type="button">' +
              '<span class="hc-icon">' + icon("chat") + "</span>" +
              '<span class="hc-body">' +
              '<span class="hc-title">' + utils.escapeHtml(c.title || "Untitled chat") + "</span>" +
              '<span class="hc-preview">' + utils.escapeHtml(preview) + "</span>" +
              "</span>" +
              '<span class="hc-meta">' +
              "<span>" + c.messages.length + " msg</span>" +
              "<span>" + utils.formatDate(c.updatedAt || c.createdAt) + "</span>" +
              "</span>" +
              "</button>"
            );
          })
          .join("") +
        "</div>";
    }

    const shell = document.getElementById("page-shell");
    if (shell) shell.innerHTML = html;

    const newBtn = document.getElementById("hist-new-chat");
    if (newBtn) {
      newBtn.addEventListener("click", () => {
        const shell2 = window.SeedChatShell;
        if (shell2) shell2.navigate("index.html");
      });
    }

    document.querySelectorAll(".history-card").forEach(function (card) {
      card.addEventListener("click", function () {
        const id = card.getAttribute("data-conv-id");
        const shell2 = window.SeedChatShell;
        if (shell2) shell2.navigate("index.html#/chat/" + encodeURIComponent(id));
      });
    });
  }

  function boot() {
    const nav = window.SeedChatNavigation;
    const ready = nav && nav.ready ? nav.ready : Promise.resolve();
    ready.then(() => {
      renderHistory();
      state.subscribe("change", function (s) {
        if (!s) return;
        const shell = document.getElementById("page-shell");
        if (shell) renderHistory();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
