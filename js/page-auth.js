/* ============================================================
   Seed Code Chat — Auth page (login.html / signup.html)
   Shared local demo auth. Mode is read from the script's
   data-mode attribute ("login" | "signup").
   ============================================================ */

(function () {
  "use strict";

  const utils = window.SeedChatUtils;
  const renderer = window.SeedChatRenderer;
  const icon = renderer.icon;

  const isLogin = document.currentScript
    ? document.currentScript.getAttribute("data-mode") === "login"
    : document.body.getAttribute("data-page") === "login";

  function readRemembered() {
    try {
      return localStorage.getItem("scc:remember") || "";
    } catch (e) {
      return "";
    }
  }

  function renderAuth() {
    const remembered = readRemembered();
    const html =
      '<div class="auth-wrap">' +
      '<div class="auth-card">' +
      '<div class="auth-head">' +
      '<img class="auth-logo" src="assets/logo.png" alt="Seed Code logo" />' +
      "<h1>" + (isLogin ? "Welcome back" : "Create your account") + "</h1>" +
      "<p>" + (isLogin ? "Sign in to your Seed Code Chat account." : "An account managed through Supabase Auth.") + "</p>" +
      "</div>" +
      '<div class="auth-form" id="auth-form" novalidate>' +

      (isLogin ? "" :
        '<div class="field"><label for="au-name">Name</label>' +
        '<input class="input" id="au-name" placeholder="Your name" autocomplete="name" required /></div>') +

      (isLogin ? "" :
        '<div class="field"><label for="au-username">Username <span class="opt">optional</span></label>' +
        '<input class="input" id="au-username" placeholder="e.g. alshahriar" autocomplete="username" /></div>') +

      '<div class="field"><label for="au-email">Email</label>' +
      '<input class="input" id="au-email" type="email" placeholder="you@example.com" autocomplete="email" value="' + utils.escapeHtml(remembered) + '" required /></div>' +

      '<div class="field"><label for="au-password">Password</label>' +
      '<div class="password-input">' +
      '<input class="input" id="au-password" type="password" placeholder="••••••••" autocomplete="' + (isLogin ? "current-password" : "new-password") + '" required />' +
      '<button class="eye-btn" data-toggle-pw type="button" aria-label="Show or hide password">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>' +
      "</button></div></div>" +

      (isLogin ? "" :
        '<div class="field"><label for="au-confirm">Confirm password</label>' +
        '<input class="input" id="au-confirm" type="password" placeholder="••••••••" autocomplete="new-password" required /></div>') +

      '<div class="auth-extras">' +
      (isLogin
        ? '<label class="check-line"><input type="checkbox" id="au-remember" /> <span>Remember me</span></label>'
        : '<label class="check-line"><input type="checkbox" id="au-terms" /> <span>I agree to keep my data on this device only.</span></label>') +
      "</div>" +

      '<div class="form-error" id="auth-error" role="alert" hidden></div>' +

      '<button class="btn btn-primary btn-lg btn-block" id="auth-submit" type="button">' +
      (isLogin ? "Sign in" : "Create account") + "</button>" +

      '<div class="auth-switch">' +
      (isLogin
        ? 'New to Seed Code Chat? <a href="signup.html">Create an account</a>'
        : 'Already have an account? <a href="login.html">Sign in</a>') +
      "</div>" +

      '<div class="auth-note">' + icon("shield") +
      "<span>Authentication is powered by Supabase Auth. Your password is never stored on this device.</span>" +
      "</div>" +

      "</div></div></div>";

    const shell = document.getElementById("page-shell");
    if (shell) {
      shell.innerHTML = html;
      bindAuth(shell);
    }
  }

  function bindAuth(shell) {
    shell.querySelectorAll("[data-toggle-pw]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const input = shell.querySelector("#au-password");
        if (input) input.type = input.type === "password" ? "text" : "password";
      });
    });

    const submit = shell.querySelector("#auth-submit");
    const errorEl = shell.querySelector("#auth-error");

    function setError(msg, showResend) {
      if (!msg) {
        errorEl.hidden = true;
        errorEl.innerHTML = "";
        return;
      }
      errorEl.innerHTML =
        "<span>" + utils.escapeHtml(msg) + "</span>" +
        (showResend
          ? '<button class="btn btn-sm btn-block" id="auth-resend" style="margin-top:10px" type="button">Resend confirmation email</button>'
          : "");
      errorEl.hidden = false;
    }

    function setLoading(loading) {
      submit.disabled = loading;
      submit.classList.toggle("is-loading", loading);
      submit.innerHTML = loading
        ? '<span class="spinner" style="width:14px;height:14px"></span> ' + (isLogin ? "Signing in…" : "Creating…")
        : (isLogin ? "Sign in" : "Create account");
    }

    async function onSubmit() {
      setError("");
      const email = shell.querySelector("#au-email").value.trim();
      const password = shell.querySelector("#au-password").value;

      if (isLogin) {
        if (!email || !password) {
          setError("Please enter your email and password.");
          return;
        }
        const remember = shell.querySelector("#au-remember");
        if (remember && remember.checked) {
          try { localStorage.setItem("scc:remember", email); } catch (e) {}
        }
        setLoading(true);
        const result = await window.SeedChatAuth.login(email, password);
        setLoading(false);
        if (result.ok) {
          const firstName = result.user && result.user.name
            ? result.user.name.split(" ")[0]
            : (result.user && result.user.email ? result.user.email : "there");
          window.SeedChatUI.toast("Welcome back, " + firstName + "!", "ok");
          if (window.SeedChatShell) window.SeedChatShell.navigate("index.html");
        } else if (result.errorKind === "email_not_confirmed") {
          setError(result.error, true);
          const resendBtn = shell.querySelector("#auth-resend");
          if (resendBtn) {
            resendBtn.addEventListener("click", async () => {
              resendBtn.disabled = true;
              resendBtn.textContent = "Sending…";
              const r = await window.SeedChatAuth.resendConfirmation(email);
              if (r.ok) {
                setError("Confirmation email sent. Check your inbox (and spam folder), confirm your email, then sign in again.");
              } else {
                setError(r.error);
              }
            });
          }
        } else {
          setError(result.error);
        }
      } else {
        const name = shell.querySelector("#au-name").value.trim();
        const username = shell.querySelector("#au-username").value.trim();
        const confirm = shell.querySelector("#au-confirm").value;
        const terms = shell.querySelector("#au-terms");
        if (!name || !email || !password || !confirm) {
          setError("Please fill in all required fields.");
          return;
        }
        if (password !== confirm) {
          setError("Passwords do not match.");
          return;
        }
        if (terms && !terms.checked) {
          setError("Please accept the terms to continue.");
          return;
        }
        setLoading(true);
        const result = await window.SeedChatAuth.signup({ name: name, username: username, email: email, password: password });
        setLoading(false);
        if (result.ok) {
          const firstName = result.user && result.user.name
            ? result.user.name.split(" ")[0]
            : (result.user && result.user.email ? result.user.email : "there");
          try { localStorage.setItem("scc:remember", email); } catch (e) {}
          if (result.sessionIssued) {
            window.SeedChatUI.toast("Account created. Welcome, " + firstName + "!", "ok");
            if (window.SeedChatShell) window.SeedChatShell.navigate("index.html");
          } else {
            window.SeedChatUI.toast("Account created. Check your inbox to confirm your email.", "ok");
            if (window.SeedChatShell) window.SeedChatShell.navigate("login.html");
          }
        } else {
          setError(result.error);
        }
      }
    }

    submit.addEventListener("click", onSubmit);
    shell.querySelector("#au-password").addEventListener("keydown", (e) => {
      if (e.key === "Enter") onSubmit();
    });
    shell.querySelector("#au-email").addEventListener("keydown", (e) => {
      if (e.key === "Enter") onSubmit();
    });
  }

  function boot() {
    const nav = window.SeedChatNavigation;
    const ready = nav && nav.ready ? nav.ready : Promise.resolve();
    ready.then(renderAuth);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
