/* ============================================================
   Seed Code Chat — Lightweight syntax highlighting
   Self-contained tokenizer (no external library). Good coverage
   for common languages, escapes all output before tokenizing.
   ============================================================ */

(function () {
  "use strict";

  const utils = window.SeedChatUtils;

  const LANG_ALIASES = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    mjs: "javascript",
    cjs: "javascript",
    py: "python",
    sh: "bash",
    shell: "bash",
    zsh: "bash",
    html: "html",
    xml: "html",
    svg: "html",
    md: "markdown",
    cpp: "cpp",
    cc: "cpp",
    h: "cpp",
    cs: "csharp",
    yml: "yaml",
    yaml: "yaml",
    go: "go",
    rs: "rust",
    swift: "swift",
    kt: "kotlin",
    gradle: "groovy",
  };

  const KEYWORDS = {
    javascript: "const let var function return if else for while do switch case break continue default new class extends super this import export from async await try catch finally throw typeof instanceof delete void yield static get set of in interface type enum implements constructor",
    python: "def return if elif else for while in not and or pass break continue class import from as try except finally raise with lambda yield global nonlocal assert del None True False self is",
    cpp: "return if else for while do switch case break continue goto struct union enum typedef int char float double long short signed unsigned void static const extern register volatile class new delete template typename namespace public private protected virtual override friend this bool string operator auto nullptr",
    c: "return if else for while do switch case break continue goto struct union enum typedef int char float double long short signed unsigned void static const extern register volatile auto",
    java: "return if else for while do switch case break continue default new class extends implements interface import package public private protected static final void int boolean byte short long float double char try catch throw throws finally instanceof this super null true false abstract",
    go: "func package import var const type struct interface map chan return if else for range go defer select switch case break continue fallthrough default nil true false",
    rust: "fn let mut pub use mod impl trait enum struct match if else for while loop return async await dyn self Self super crate break continue static const ref move unsafe where true false",
    csharp: "return if else for foreach while do switch case break continue default new class struct interface enum namespace using public private protected internal static void readonly const try catch finally throw as is base this override virtual abstract sealed true false",
    swift: "func var let if else guard for while repeat switch case default break continue return class struct enum protocol extension import public private internal fileprivate open static final lazy weak unowned try catch throw throws as is in true false nil self super",
    kotlin: "fun val var if else when for while do return class object interface enum data sealed import package public private internal protected override open inline suspend constructor init by this super true false null",
    bash: "if then elif else fi for while until do done case esac function return local export set unset eval exec echo cd exit true false in select",
    sql: "select from where insert into values update delete create table index view drop alter join inner left right full outer on group by order having limit offset as and or not null primary key foreign references distinct union all case when then else end between exists like in is asc desc",
    html: "",
    css: "",
    json: "",
    yaml: "",
    markdown: "",
    groovy: "def return if else for while do switch case break continue class import static new void null true false in",
    plain: "",
  };

  const BUILTIN_TYPES = {
    javascript: "String Number Boolean Array Object Function Promise Map Set Date RegExp Error Symbol WeakMap WeakSet BigInt Intl JSON Math console undefined null",
    cpp: "int char float double long short unsigned bool string void size_t auto",
    c: "int char float double long short unsigned void size_t bool",
    java: "String Integer Long Double Float Boolean Character Byte Short Object System Math List Map Set ArrayList HashMap HashSet Exception RuntimeException",
    python: "str int float bool list dict set tuple bytes NoneType Exception ValueError TypeError KeyError",
    go: "int int8 int16 int32 int64 uint uint8 uint16 uint32 uint64 float32 float64 string bool byte rune error",
    rust: "String Vec Option Result Box i8 i16 i32 i64 u8 u16 u32 u64 f32 f64 bool str Self",
    csharp: "string int long double float bool decimal object void char byte var List Dictionary IEnumerable Task Console DateTime",
    swift: "String Int Double Float Bool Array Dictionary Set Optional Character Void Any Self",
    kotlin: "String Int Long Double Float Boolean Char Byte Short Unit Any Nothing List MutableList Map Set",
    bash: "",
    sql: "",
    html: "",
    css: "",
    json: "",
    yaml: "",
    plain: "",
  };

  const LANG_MAP = {
    javascript: { comment: ["//", "/*", "#!"] },
    python: { comment: ["#"] },
    bash: { comment: ["#"] },
    cpp: { comment: ["//", "/*"] },
    c: { comment: ["//", "/*"] },
    java: { comment: ["//", "/*"] },
    go: { comment: ["//", "/*"] },
    rust: { comment: ["//", "/*"] },
    csharp: { comment: ["//", "/*"] },
    swift: { comment: ["//", "/*"] },
    kotlin: { comment: ["//", "/*"] },
    sql: { comment: ["--", "/*"] },
    yaml: { comment: ["#"] },
    markdown: { comment: [] },
    html: { comment: ["<!--"] },
    css: { comment: ["/*"] },
    json: { comment: [] },
    groovy: { comment: ["//", "/*"] },
    plain: { comment: [] },
  };

  function normalizeLang(lang) {
    if (!lang) return "plain";
    lang = String(lang).toLowerCase().trim();
    return LANG_ALIASES[lang] || lang;
  }

  function buildRegex(lang) {
    const keywords = (KEYWORDS[lang] || "").split(/\s+/).filter(Boolean).join("|");
    const types = (BUILTIN_TYPES[lang] || "").split(/\s+/).filter(Boolean).join("|");
    const cfg = LANG_MAP[lang] || LANG_MAP.plain;
    const hashComment = cfg.comment.indexOf("#") >= 0;
    const dashComment = cfg.comment.indexOf("--") >= 0;

    const parts = [
      // comments
      hashComment ? "(?<comment>#(?:[^\\n]*))" : null,
      dashComment ? "(?<comment>--(?:[^\\n]*))" : null,
      "(?<comment>/\\*(?:[\\s\\S]*?)\\*/)",
      "(?<comment>//(?:[^\\n]*))",
      // strings
      String.raw`(?<string>"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|\`(?:\\.|[^\`\\])*\`)`,
      // numbers
      "(?<number>\\b0[xX][0-9a-fA-F]+\\b|\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b)",
      // html tags & attributes
      "(?<tag></?[a-zA-Z][\\w-]*(?:\\s[^<>]*?)?/?>)",
      "(?<attr>[a-zA-Z-]+(?=\\s*=))",
      // keywords (case-insensitive for SQL)
      keywords
        ? "(?<keyword>\\b(?:" + keywords + (lang === "sql" ? "|" + keywords.toUpperCase() : "") + ")\\b)"
        : null,
      // types / builtins
      types ? "(?<type>\\b(?:" + types + ")\\b)" : null,
      // booleans
      "(?<bool>\\b(?:true|false|null|undefined|None|nil|True|False|NaN|Infinity)\\b)",
      // function calls
      "(?<func>[A-Za-z_$][\\w$]*(?=\\s*\\())",
      // property access (.name)
      "(?<property>\\.\\s*[A-Za-z_$][\\w$]*)",
      // operators
      "(?<operator>===|!==|==|!=|<=|>=|=>|->|&&|\\|\\||\\+=|-=|\\*=|/=|\\+\\+|--|::|\\?|:|\\+|-|\\*|/|%|=|<|>|!|&|\\|)",
      // punctuation
      "(?<punct>[()\\[\\]{};,.])",
    ].filter(Boolean);

    return new RegExp(parts.join("|"), "gm");
  }

  const TOKEN_CLASS = {
    comment: "tok-comment",
    string: "tok-string",
    number: "tok-number",
    keyword: "tok-keyword",
    type: "tok-type",
    bool: "tok-bool",
    func: "tok-func",
    property: "tok-property",
    operator: "tok-operator",
    tag: "tok-tag",
    attr: "tok-attr",
    punct: "tok-punct",
  };

  function highlightCode(code, lang) {
    const normalized = normalizeLang(lang);

    if (normalized === "plain" || normalized === "markdown") {
      return escapeOnly(code);
    }

    const regex = buildRegex(normalized);
    const out = [];
    let last = 0;

    for (const match of code.matchAll(regex)) {
      if (match.index > last) {
        out.push(utils.escapeHtml(code.slice(last, match.index)));
      }
      const group = match.groups;
      let cls = null;
      for (const key in group) {
        if (group[key] !== undefined) {
          cls = TOKEN_CLASS[key] || null;
          break;
        }
      }
      const text = match[0];
      if (cls) {
        out.push('<span class="' + cls + '">' + utils.escapeHtml(text) + "</span>");
      } else {
        out.push(utils.escapeHtml(text));
      }
      last = match.index + text.length;
    }

    if (last < code.length) {
      out.push(utils.escapeHtml(code.slice(last)));
    }

    return out.join("");
  }

  function escapeOnly(code) {
    return utils.escapeHtml(code);
  }

  function displayName(lang) {
    if (!lang) return "code";
    return String(lang).toLowerCase();
  }

  window.SeedChatHighlight = {
    highlight: highlightCode,
    displayName: displayName,
  };
})();
