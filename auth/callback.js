/* ============================================================
   Seed Code Chat — Auth callback logic (auth/callback.html)
   -----------------------------------------------------------------
   Standalone email-confirmation landing page.

   - Reads the Supabase callback payload (query params / hash).
   - Exchanges a PKCE `code` for a session when present.
   - Never silently redirects on error — expired / invalid /
     already-confirmed links get a clear message and a
     "Request a new confirmation email" action.
   ============================================================ */

(function () {
  "use strict";

  const supabase =
    window.SeedChatSupabase && window.SeedChatSupabase.client
      ? window.SeedChatSupabase.client
      : null;

  const redirectUrl =
    window.SeedChatSupabase && window.SeedChatSupabase.emailRedirectUrl
      ? window.SeedChatSupabase.emailRedirectUrl()
      : "/auth/callback.html";

  const statusEl = document.getElementById("cb-status");
  const contentEl = document.getElementById("cb-content");

  function showStatus(text) {
    if (statusEl) {
      statusEl.hidden = false;
      const label = document.getElementById("cb-status-text");
      if (label) label.textContent = text;
    }
    if (contentEl) contentEl.hidden = true;
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function icon(kind) {
    var svg = {
      check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
      clock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
      alert: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    };
    return svg[kind] || svg.alert;
  }

  function render(kind, title, copy, extra) {
    showStatus("");
    if (statusEl) statusEl.hidden = true;
    contentEl.innerHTML =
      '<div class="cb-icon ' + kind + '">' + icon(kind) + "</div>" +
      '<h2 class="cb-msg-title">' + esc(title) + "</h2>" +
      (copy ? '<p class="cb-msg-copy">' + esc(copy) + "</p>" : "") +
      (extra || "");
    contentEl.hidden = false;
  }

  function rememberEmail() {
    try {
      return localStorage.getItem("scc:remember") || "";
    } catch (e) {
      return "";
    }
  }

  /* ---------------- Expired / invalid link handling ---------------- */

  function resendBlock() {
    return (
      '<div class="cb-field">' +
      '<input type="email" id="cb-email" placeholder="you@example.com" value="' + esc(rememberEmail()) + '" autocomplete="email" aria-label="Email address" />' +
      "</div>" +
      '<div class="cb-actions">' +
      '<button class="cb-btn primary" id="cb-resend" type="button">Request a new confirmation email</button>' +
      '<button class="cb-btn ghost" id="cb-login" type="button">Go to sign in</button>' +
      "</div>" +
      '<p class="cb-error" id="cb-resend-error" hidden></p>'
    );
  }

  function bindResend() {
    const btn = document.getElementById("cb-resend");
    const err = document.getElementById("cb-resend-error");
    if (!btn) return;

    btn.addEventListener("click", async function () {
      const email = document.getElementById("cb-email").value.trim().toLowerCase();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        btn.disabled = false;
        if (err) {
          err.textContent = "Please enter a valid email address.";
          err.hidden = false;
        }
        return;
      }
      btn.disabled = true;
      btn.innerHTML = '<span class="cb-spinner-mini"></span>Sending…';
      if (err) err.hidden = true;

      const result = await resendConfirmation(email);

      if (result.ok) {
        render(
          "ok",
          "Confirmation email sent",
          "Check your inbox (and spam folder) for a fresh confirmation link, then click it."
        );
      } else {
        btn.disabled = false;
        btn.textContent = "Request a new confirmation email";
        if (err) {
          err.textContent = result.error;
          err.hidden = false;
        }
      }
    });

    const loginBtn = document.getElementById("cb-login");
    if (loginBtn) {
      loginBtn.addEventListener("click", function () {
        window.location.href = "../login.html";
      });
    }
  }

  async function resendConfirmation(email) {
    if (!supabase) {
      return { ok: false, error: "Supabase is not available on this page." };
    }
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) {
        return { ok: false, error: friendlyError(error) };
      }
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error:
          (e && e.message) || "Could not reach Supabase. Check your connection and try again.",
      };
    }
  }

  function friendlyError(error) {
    const msg = error && error.message ? String(error.message) : "";
    const code = error && error.code ? String(error.code) : "";
    const full = msg + " " + code;
    if (/over_email_send_rate_limit|rate.limit|too many requests/i.test(full)) {
      return "Too many requests. Please wait a moment and try again.";
    }
    if (/invalid login credentials/i.test(full)) {
      return "Incorrect email or password.";
    }
    if (/email not confirmed|email_not_confirmed/i.test(full)) {
      return "This email is not confirmed yet.";
    }
    if (/already registered|user already registered/i.test(full)) {
      return "An account with this email already exists.";
    }
    if (/signups not allowed/i.test(full)) {
      return "Signups are currently disabled on this project.";
    }
    if (msg) return msg;
    return "Something went wrong. Please try again.";
  }

/* ---------------- Main handler ---------------- */

  function isExpiredLike(errorCode, description) {
    const hay =
      String(errorCode || "") + " " + String(description || "");
    return (
      /otp_expired/i.test(hay) ||
      /token.*expired/i.test(hay) ||
      /link is invalid or has expired/i.test(hay) ||
      /confirmation.*expired/i.test(hay) ||
      /invalid.*otp|expired.*otp/i.test(hay)
    );
  }

  function showExpired() {
    render(
      "expired",
      "Email confirmation link expired",
      "The link you opened has expired or is no longer valid. Request a fresh confirmation link to continue.",
      resendBlock()
    );
    bindResend();
  }

  function showFailed(description) {
    render(
      "bad",
      "We couldn\u2019t verify your email",
      description ||
        "The confirmation link is invalid. Request a new one or sign in again.",
      resendBlock()
    );
    bindResend();
  }

  function showGeneric(description) {
    render(
      "bad",
      "We couldn\u2019t verify your email",
      description ||
        "Something went wrong while confirming your email. Request a new confirmation link or sign in again.",
      resendBlock()
    );
    bindResend();
  }

  async function getSession() {
    try {
      const { data } = await supabase.auth.getSession();
      return data && data.session ? data.session : null;
    } catch (e) {
      return null;
    }
  }

  /** Create/update the user's profiles row once they hold a confirmed
      session. Never fails the confirmation if the insert is blocked. */
  async function ensureProfile(user) {
    if (!supabase || !user || !user.id) return;
    const meta = (user.user_metadata || {});
    try {
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          username: meta.username || null,
          display_name: meta.display_name || meta.name || null,
          avatar_url: null,
        },
        { onConflict: "id" }
      );
    } catch (e) {
      /* Auth is confirmed — a profiles insert failure must NOT block
         sign-in. (Requires an INSERT policy where
         profiles.id = auth.uid().) */
      console.error("Seed Code Chat: profiles upsert on callback failed", e);
    }
  }

  async function confirmSuccess(user) {
    showStatus("Your email is confirmed — signing you in…");
    await ensureProfile(user);
    setTimeout(function () {
      window.location.replace("../index.html");
    }, 900);
  }

  async function handle() {
    if (!supabase) {
      render(
        "bad",
        "Service unavailable",
        "Supabase is not available on this page. Please close it and try again."
      );
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const errorCode = params.get("error_code") || "";
    const error = params.get("error") || "";
    const errorDescription =
      params.get("error_description") || params.get("errorDescription") || "";

    /* 1) Auth error carried by the URL — never silent-redirect here. */
    if (error || errorCode) {
      if (isExpiredLike(errorCode, error + " " + errorDescription)) {
        showExpired();
      } else {
        showGeneric(
          errorDescription || "The verification link could not be processed."
        );
      }
      return;
    }

    showStatus("Verifying your email…");

    /* supabase-js may already have exchanged a PKCE code during
       initialization. Never assume — check for a live session first. */
    const liveSession = await getSession();
    if (liveSession) {
      confirmSuccess(liveSession.user);
      return;
    }

    /* 2) PKCE callback: exchange the code for a session explicitly. */
    if (code && supabase.auth.exchangeCodeForSession) {
      const exchange = await supabase.auth
        .exchangeCodeForSession(code)
        .catch(function (e) {
          return { error: e };
        });

      if (exchange && exchange.error) {
        /* The library may have already consumed the code; re-check. */
        const after = await getSession();
        if (after) {
          confirmSuccess(after.user);
          return;
        }
        const exp =
          String(exchange.error.message || "") +
          " " +
          String(exchange.error.code || "");
        if (/expired|invalid|otp/i.test(exp)) {
          showExpired();
        } else {
          showGeneric(friendlyError(exchange.error));
        }
        return;
      }
    }

    /* 3) Confirmed via any other path (implicit hash, etc.). */
    const finalSession = await getSession();
    if (finalSession) {
      confirmSuccess(finalSession.user);
      return;
    }

    /* 4) Nothing to verify — a stale / hand-typed callback URL. */
    render(
      "bad",
      "Verification link invalid",
      "This link is missing the verification code. Sign in and request a new confirmation email if needed.",
      resendBlock()
    );
    bindResend();
  }

  showStatus("Verifying your email…");
  handle();
})();