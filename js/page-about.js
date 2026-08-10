/* ============================================================
   Seed Code Chat — About page (about.html)
   Static product + CLI information.
   ============================================================ */

(function () {
  "use strict";

  const utils = window.SeedChatUtils;
  const renderer = window.SeedChatRenderer;
  const icon = renderer.icon;

  function renderAbout() {
    const links = window.SeedChatShell ? window.SeedChatShell.links : {};

    const html =
      '<div class="about-page">' +
      '<div class="about-hero">' +
      '<img class="about-logo-img" src="assets/logo.png" alt="Seed Code logo" />' +
      "<h1>Seed <span class=\"accent\">Code</span> Chat</h1>" +
      '<p class="about-tagline">Plant ideas. Grow code.</p>' +
      '<div class="about-creds">' +
      '<div class="about-cred">Designed &amp; Developed by <strong>Eagox Studio</strong></div>' +
      '<div class="about-cred">Creator — <a href="' + (links.portfolio || "#") + '" target="_blank" rel="noopener">Al Shahriar Sowan</a></div>' +
      "</div>" +
      "</div>" +

      '<div class="about-section">' +
      "<h2>Product</h2>" +
      "<p>Seed Code Chat is a premium, general-purpose AI assistant with a Seed Code identity. " +
      "Ask anything — code, research, writing, ideas. Conversations are stored locally in your browser, " +
      "and responses are routed through the providers you configure, with automatic fallback so you keep moving.</p>" +
      "</div>" +

      '<div class="about-grid">' +
      '<div class="card">' +
      "<h3>Technology</h3>" +
      '<ul class="about-list">' +
      "<li>Vanilla JavaScript — no framework</li>" +
      "<li>OpenAI-compatible provider adapters</li>" +
      "<li>Streaming responses with auto fallback</li>" +
      "<li>IndexedDB + localStorage persistence</li>" +
      "<li>Self-contained markdown &amp; syntax highlighter</li>" +
      "</ul>" +
      "</div>" +
      '<div class="card">' +
      "<h3>Providers</h3>" +
      '<ul class="about-list">' +
      "<li>OpenRouter — primary (free models)</li>" +
      "<li>AeroLink</li>" +
      "<li>Custom OpenAI-compatible endpoints</li>" +
      "</ul>" +
      "</div>" +
      "</div>" +

      '<div class="cli-card">' +
      '<div class="cli-card-icon">' + icon("terminal") + "</div>" +
      '<div class="cli-card-body">' +
      "<h3>Seed Code CLI</h3>" +
      "<p>Bring Seed Code to your terminal. The beautiful AI coding assistant, built for the shell you live in.</p>" +
      "</div>" +
      '<div class="cli-card-actions">' +
      '<a class="btn" href="' + (links.cli || "#") + '" target="_blank" rel="noopener">Explore CLI</a>' +
      '<a class="btn btn-primary" href="' + (links.cli || "#") + '" target="_blank" rel="noopener">Get Seed Code CLI</a>' +
      "</div>" +
      "</div>" +

      '<div class="about-links">' +
      '<a class="btn btn-ghost" href="' + (links.github || "#") + '" target="_blank" rel="noopener">' + icon("route") + " GitHub</a>" +
      '<a class="btn btn-ghost" href="' + (links.portfolio || "#") + '" target="_blank" rel="noopener">' + icon("link") + " Portfolio</a>" +
      '<a class="btn btn-ghost" href="' + (links.cli || "#") + '" target="_blank" rel="noopener">' + icon("terminal") + " Seed Code CLI</a>" +
      "</div>" +

      '<div class="about-foot">' +
      '<span>Seed Code Chat v' + utils.escapeHtml(window.SeedChatConfig.version) + "</span>" +
      '<span>© ' + new Date().getFullYear() + " Eagox Studio</span>" +
      "</div>" +
      "</div>";

    const shell = document.getElementById("page-shell");
    if (shell) shell.innerHTML = html;
  }

  function boot() {
    const nav = window.SeedChatNavigation;
    const ready = nav && nav.ready ? nav.ready : Promise.resolve();
    ready.then(renderAbout);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
