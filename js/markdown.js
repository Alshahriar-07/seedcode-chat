/* ============================================================
   Seed Code Chat — Safe Markdown renderer
   Everything is escaped first; only whitelisted tags produced by
   this module can appear. No raw HTML from model/user content
   ever reaches the DOM (Security.md: never render unsanitized HTML).
   ============================================================ */

(function () {
  "use strict";

  const utils = window.SeedChatUtils;
  const highlight = window.SeedChatHighlight;

  /* ---------------- URL sanitization ---------------- */

  function sanitizeUrl(url) {
    if (!url) return null;
    let u = String(url).trim();
    u = u.replace(/[\u0000-\u001f<>"']/g, "");
    if (/\s/.test(u)) return null;
    const lower = u
      .toLowerCase()
      .replace(/&#x([0-9a-f]+);/g, "")
      .replace(/&#([0-9]+);/g, "")
      .replace(/&amp;/g, "&");
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml|avif|bmp);/i.test(u)) {
      return u;
    }
    if (/^(javascript|vbscript|data|file):/i.test(lower)) return null;
    if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(lower) || lower.startsWith("/") || lower.startsWith("./") || lower.startsWith("../")) {
      return u;
    }
    if (/^(mailto|tel|sms|https?|ftp):/i.test(lower)) return u;
    return u;
  }

  /* ---------------- Inline parsing ---------------- */

  /** Match a balanced parenthesized URL starting at text[i]=='('.
        Returns { url, consumed } where consumed includes the closing ')'.
        Handles parens inside URLs and optional quoted titles. */
  function matchBalancedUrl(text, openIndex) {
    let depth = 0;
    let j = openIndex;
    while (j < text.length) {
      const ch = text[j];
      if (ch === "(") depth += 1;
      else if (ch === ")") {
        depth -= 1;
        if (depth === 0) {
          let target = text.slice(openIndex + 1, j).trim();
          const titleMatch = /^(.*?)\s+(?:"[^"]*"|'[^']*')$/.exec(target);
          if (titleMatch) target = titleMatch[1];
          return { url: target, consumed: j - openIndex + 1 };
        }
      } else if (ch === "\n") {
        break;
      }
      j += 1;
    }
    return null;
  }

  const INLINE_REGEXES = [
    { re: /^`([^`]+)`/, type: "code" },
    { re: /^\*\*([\s\S]+?)\*\*(?!\*)/, type: "strong" },
    { re: /^__([\s\S]+?)__(?!_)/, type: "strong" },
    { re: /^~~([\s\S]+?)~~/, type: "del" },
    { re: /^\*([^*\n]+)\*/, type: "em" },
    { re: /^_([^_\n]+)_/, type: "em" },
  ];

  const SPECIAL_CHARS = /[*_`[\]\\]/;

  function inline(src) {
    let out = "";
    let rest = String(src == null ? "" : src);

    while (rest.length) {
      /* escape character */
      if (rest[0] === "\\" && rest.length > 1) {
        out += utils.escapeHtml(rest[1]);
        rest = rest.slice(2);
        continue;
      }

      /* inline code */
      if (rest[0] === "`") {
        const m = /^`([^`]+)`/.exec(rest);
        if (m) {
          out += "<code>" + utils.escapeHtml(m[1]) + "</code>";
          rest = rest.slice(m[0].length);
          continue;
        }
      }

      /* image or link with balanced URL */
      if (rest[0] === "!" && rest[1] === "[") {
        const handled = renderInlineLink(rest, 1, true);
        if (handled) {
          out += handled.html;
          rest = rest.slice(handled.consumed);
          continue;
        }
      }
      if (rest[0] === "[") {
        const handled = renderInlineLink(rest, 0, false);
        if (handled) {
          out += handled.html;
          rest = rest.slice(handled.consumed);
          continue;
        }
      }

      /* bold / italic / strikethrough */
      let matched = false;
      for (const p of INLINE_REGEXES) {
        const m = p.re.exec(rest);
        if (m) {
          matched = true;
          const inner = inline(m[1]);
          switch (p.type) {
            case "strong": out += "<strong>" + inner + "</strong>"; break;
            case "em": out += "<em>" + inner + "</em>"; break;
            case "del": out += "<del>" + inner + "</del>"; break;
          }
          rest = rest.slice(m[0].length);
          break;
        }
      }
      if (matched) continue;

      /* consume a run of non-special characters */
      let i = 0;
      while (i < rest.length && !SPECIAL_CHARS.test(rest[i])) i += 1;
      if (i === 0) i = 1;
      out += utils.escapeHtml(rest.slice(0, i));
      rest = rest.slice(i);
    }

    return out;
  }

  /** Render a [label](url) or ![alt](url) at the current position. */
  function renderInlineLink(rest, labelOffset, isImage) {
    if (rest[labelOffset] !== "[") return null;
    const closeBracket = rest.indexOf("]", labelOffset + 1);
    if (closeBracket < 0) return null;
    const label = rest.slice(labelOffset + 1, closeBracket);
    const openParen = closeBracket + 1;
    if (rest[openParen] !== "(") return null;

    const urlMatch = matchBalancedUrl(rest, openParen);
    if (!urlMatch) return null;

    const consumed = openParen + urlMatch.consumed;
    const rawUrl = urlMatch.url;

    if (isImage) {
      const src = sanitizeUrl(rawUrl);
      const alt = utils.escapeHtml(label || "image");
      return {
        html: src
          ? '<img src="' + src + '" alt="' + alt + '" loading="lazy" />'
          : alt,
        consumed: consumed,
      };
    }
    const href = sanitizeUrl(rawUrl);
    const text = inline(label);
    return {
      html: href
        ? '<a href="' + href + '" rel="noopener noreferrer nofollow" target="_blank">' + text + "</a>"
        : text,
      consumed: consumed,
    };
  }

  /* ---------------- Block parsing ---------------- */

  function renderMarkdown(md) {
    const source = String(md == null ? "" : md).replace(/\r\n?/g, "\n");
    const blocks = [];
    let cur = null;

    function flushText() {
      if (cur && cur.lines.length) {
        blocks.push(cur);
      }
      cur = { type: "text", lines: [] };
    }

    flushText();

    const lines = source.split("\n");
    let i = 0;
    let inFence = false;
    let fenceLang = "";
    let fenceBuf = [];

    const pushCode = (code, lang) => {
      blocks.push({ type: "code", lang: lang, code: code });
    };

    while (i < lines.length) {
      const line = lines[i];

      /* fenced code */
      const fenceMatch = /^\s*```([\w+#.-]*)\s*$/.exec(line);
      if (fenceMatch) {
        if (!inFence) {
          inFence = true;
          fenceLang = fenceMatch[1] || "";
          fenceBuf = [];
        } else {
          inFence = false;
          pushCode(fenceBuf.join("\n"), fenceLang);
        }
        i += 1;
        continue;
      }
      if (inFence) {
        fenceBuf.push(line);
        i += 1;
        continue;
      }

      const trimmed = line.trim();

      /* blank line */
      if (!trimmed) {
        flushText();
        i += 1;
        continue;
      }

      /* heading */
      const headMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
      if (headMatch) {
        flushText();
        blocks.push({ type: "heading", level: headMatch[1].length, text: headMatch[2] });
        i += 1;
        continue;
      }

      /* horizontal rule */
      if (/^(---+|\*\*\*+|___+)$/.test(trimmed)) {
        flushText();
        blocks.push({ type: "hr" });
        i += 1;
        continue;
      }

      /* indented code (4+ spaces) */
      if (/^ {4,}/.test(line)) {
        flushText();
        const codeLines = [line.replace(/^ {4}/, "")];
        while (i + 1 < lines.length && /^(?: {4,}|\s*$)/.test(lines[i + 1]) && !/^\s*```/.test(lines[i + 1])) {
          i += 1;
          codeLines.push(lines[i].replace(/^ {4}/, ""));
        }
        pushCode(codeLines.join("\n"), "");
        i += 1;
        continue;
      }

      /* blockquote */
      if (trimmed.startsWith(">")) {
        flushText();
        const quoteLines = [];
        while (i < lines.length && lines[i].trim().startsWith(">")) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
          i += 1;
        }
        blocks.push({ type: "quote", lines: quoteLines });
        continue;
      }

      /* list */
      if (isListLine(line)) {
        flushText();
        const items = [];
        while (i < lines.length && lines[i].trim() && isListLine(lines[i])) {
          items.push(parseListLine(lines[i]));
          i += 1;
        }
        blocks.push({ type: "list", items: items });
        continue;
      }

      /* table */
      if (isTableStart(lines, i)) {
        flushText();
        const table = collectTable(lines, i);
        i = table.nextIndex;
        blocks.push({ type: "table", rows: table.rows, hasHeader: table.hasHeader });
        continue;
      }

      cur.lines.push(line);
      i += 1;
    }

    if (inFence) {
      pushCode(fenceBuf.join("\n"), fenceLang);
    }
    flushText();

    return blocks.map(renderBlock).join("\n");
  }

  /* ---------------- list helpers ---------------- */

  function isListLine(line) {
    return /^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(line);
  }

  function parseListLine(line) {
    const indent = line.match(/^\s*/)[0].length;
    const ul = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (ul) {
      const task = /^(?:\[([ xX])\]\s+)?(.*)$/.exec(ul[1]);
      return { indent: indent, ordered: false, text: task[2], checked: task[1] === "x" || task[1] === "X", checkedDefined: Boolean(task[1]) };
    }
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    return { indent: indent, ordered: true, text: ol[1], checked: null, checkedDefined: false };
  }

  function renderList(items) {
    let html = "";
    const stack = [];

    function closeTo(targetIndent) {
      while (stack.length && stack[stack.length - 1].indent > targetIndent) {
        const top = stack.pop();
        html += "</" + top.tag + ">";
      }
    }

    items.forEach(function (item, idx) {
      const level = item.indent;
      const start = stack.length ? stack[stack.length - 1].indent : -1;

      if (!stack.length) {
        html += item.ordered ? "<ol>" : "<ul>";
        stack.push({ tag: item.ordered ? "ol" : "ul", indent: level });
      } else if (level > start) {
        closeTo(level - 1);
        html += item.ordered ? "<ol>" : "<ul>";
        stack.push({ tag: item.ordered ? "ol" : "ul", indent: level });
      } else if (level < start) {
        closeTo(level);
      } else if (stack.length && stack[stack.length - 1].tag !== (item.ordered ? "ol" : "ul")) {
        closeTo(level - 1);
        html += item.ordered ? "<ol>" : "<ul>";
        stack.push({ tag: item.ordered ? "ol" : "ul", indent: level });
      }

      const checkbox = item.checkedDefined
        ? '<input type="checkbox" disabled' + (item.checked ? " checked" : "") + " aria-label=\"checkbox\" /> "
        : "";
      html += "<li>" + checkbox + inline(item.text) + "</li>";
    });

    while (stack.length) {
      html += "</" + stack.pop().tag + ">";
    }
    return html;
  }

  /* ---------------- table helpers ---------------- */

  function isTableStart(lines, i) {
    if (!/^\s*\|/.test(lines[i]) && !/^\s*[^\s|]+\|/.test(lines[i])) return false;
    const next = lines[i + 1];
    if (!next) return false;
    const cells = next.split("|").filter((c) => c.trim().length);
    return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c.trim()));
  }

  function collectTable(lines, i) {
    const rows = [];
    let j = i;
    while (j < lines.length && lines[j].trim() && (lines[j].includes("|") || /^\s*$/.test(lines[j]))) {
      const cells = lines[j]
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      if (cells.length) rows.push(cells);
      j += 1;
    }
    let hasHeader = false;
    const clean = [];
    rows.forEach(function (row, idx) {
      const isSeparator = row.length && row.every((c) => /^:?-+:?$/.test(c));
      if (isSeparator && idx > 0) hasHeader = true;
      if (!isSeparator) clean.push(row);
    });
    return { rows: clean, hasHeader: hasHeader, nextIndex: j };
  }

  /* ---------------- block rendering ---------------- */

  function renderCodeBlock(lang, code) {
    const safeLang = highlight.displayName(lang);
    const html = highlight.highlight(code, lang);
    return (
      '<div class="code-block">' +
      '<div class="code-head">' +
      '<span class="lang-label">' + utils.escapeHtml(safeLang || "code") + "</span>" +
      '<button class="copy-btn" type="button" data-copy-code aria-label="Copy code">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
      "Copy</button>" +
      "</div>" +
      "<pre><code>" + html + "</code></pre>" +
      "</div>"
    );
  }

  function renderBlock(block) {
    switch (block.type) {
      case "code":
        return renderCodeBlock(block.lang, block.code);
      case "heading": {
        const tag = "h" + Math.min(block.level, 6);
        return "<" + tag + ">" + inline(block.text) + "</" + tag + ">";
      }
      case "hr":
        return "<hr />";
      case "quote": {
        const inner = block.lines
          .map((l) => {
            const nested = renderMarkdown(l);
            return nested;
          })
          .join("\n");
        return "<blockquote>" + inner + "</blockquote>";
      }
      case "list":
        return renderList(block.items);
      case "table": {
        const hasHeader = block.hasHeader && block.rows.length > 1;
        let html = "<table>";
        if (hasHeader) {
          html += "<thead><tr>";
          block.rows[0].forEach((c) => (html += "<th>" + inline(c) + "</th>"));
          html += "</tr></thead><tbody>";
          block.rows.slice(1).forEach((row) => {
            html += "<tr>";
            row.forEach((c) => (html += "<td>" + inline(c) + "</td>"));
            html += "</tr>";
          });
          html += "</tbody>";
        } else {
          html += "<tbody>";
          block.rows.forEach((row) => {
            html += "<tr>";
            row.forEach((c) => (html += "<td>" + inline(c) + "</td>"));
            html += "</tr>";
          });
          html += "</tbody>";
        }
        return html + "</table>";
      }
      case "text":
      default: {
        const text = block.lines.join("\n");
        return "<p>" + inline(text).replace(/\n/g, "<br />") + "</p>";
      }
    }
  }

  window.SeedChatMarkdown = {
    render: renderMarkdown,
    sanitizeUrl: sanitizeUrl,
  };
})();
