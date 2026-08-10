/* ============================================================
   Seed Code Chat — Profile page (profile.html)
   Loads the user's profile from the Supabase `profiles` table by
   the authenticated user id. Displays display name, username,
   email, avatar; edits update the profiles row.
   ============================================================ */

(function () {
  "use strict";

  const utils = window.SeedChatUtils;
  const renderer = window.SeedChatRenderer;
  const icon = renderer.icon;

  function initials(name) {
    return String(name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }

  function supabaseClient() {
    return window.SeedChatSupabase && window.SeedChatSupabase.client
      ? window.SeedChatSupabase.client
      : null;
  }

  /** Resolve the current user: auth session + profiles row merged. */
  async function loadUser() {
    const auth = window.SeedChatAuth;
    if (auth && auth.ensureSession) await auth.ensureSession();
    const session = auth ? auth.getSession() : null;
    if (!session) return null;

    const supabase = supabaseClient();
    let profile = null;
    if (supabase) {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .eq("id", session.id)
          .maybeSingle();
        profile = data || null;
      } catch (e) {
        /* fall back to the session cache */
      }
    }

    return {
      id: session.id,
      name: (profile && profile.display_name) || session.name || "",
      username: (profile && profile.username) || session.username || "",
      email: session.email || "",
      avatar: (profile && profile.avatar_url) || session.avatar || null,
      status: "Active",
      createdAt: session.createdAt,
    };
  }

  async function renderProfile() {
    const shell = document.getElementById("page-shell");
    if (!shell) return;

    const user = await loadUser();

    if (!user) {
      shell.innerHTML =
        '<div class="empty-state" style="border:1px solid var(--border);border-radius:var(--r-lg)">' +
        '<div class="es-icon">' + icon("shield") + "</div>" +
        "<h2>Sign in required</h2>" +
        "<p>Sign in to view and manage your profile.</p>" +
        '<div class="page-actions-row">' +
        '<button class="btn btn-primary" id="prof-go-login" type="button">Sign in</button>' +
        '<button class="btn btn-ghost" id="prof-go-signup" type="button">Create account</button>' +
        "</div>" +
        "</div>";
      const goLogin = shell.querySelector("#prof-go-login");
      const goSignup = shell.querySelector("#prof-go-signup");
      if (goLogin) goLogin.addEventListener("click", () => window.SeedChatShell.navigate("login.html"));
      if (goSignup) goSignup.addEventListener("click", () => window.SeedChatShell.navigate("signup.html"));
      return;
    }

    const joined = user.createdAt
      ? new Date(user.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "—";
    const avatarHtml = user.avatar
      ? '<img src="' + utils.escapeHtml(user.avatar) + '" alt="Profile avatar" />'
      : "<span>" + utils.escapeHtml(initials(user.name)) + "</span>";

    shell.innerHTML =
      '<div class="profile-page">' +
      '<div class="page-head"><h1>Profile</h1><p>Your Seed Code Chat account.</p></div>' +

      '<div class="profile-card card">' +
      '<div class="profile-main">' +
      '<div class="avatar-xl" id="profile-avatar">' + avatarHtml + "</div>" +
      '<div class="profile-info">' +
      "<h2>" + utils.escapeHtml(user.name) + "</h2>" +
      (user.username ? '<div class="profile-uname">@' + utils.escapeHtml(user.username) + "</div>" : "") +
      '<div class="profile-meta">' +
      '<span class="tag online">' + icon("check") + utils.escapeHtml(user.status || "Active") + "</span>" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<dl class="profile-details">' +
      "<dt>Email</dt><dd>" + utils.escapeHtml(user.email) + "</dd>" +
      "<dt>Username</dt><dd>" + utils.escapeHtml(user.username || "—") + "</dd>" +
      "<dt>Account type</dt><dd>Supabase account</dd>" +
      "<dt>Joined</dt><dd>" + utils.escapeHtml(joined) + "</dd>" +
      "</dl>" +
      "</div>" +

      '<div class="page-subhead"><h2>Edit profile</h2></div>' +
      '<div class="profile-card card">' +
      '<div class="field-row">' +
      '<div class="field"><label for="pf-name">Display name</label>' +
      '<input class="input" id="pf-name" value="' + utils.escapeHtml(user.name) + '" autocomplete="name" /></div>' +
      '<div class="field"><label for="pf-username">Username</label>' +
      '<input class="input" id="pf-username" value="' + utils.escapeHtml(user.username || "") + '" autocomplete="username" /></div>' +
      "</div>" +
      '<div class="field"><label for="pf-email">Email</label>' +
      '<input class="input" id="pf-email" type="email" value="' + utils.escapeHtml(user.email) + '" autocomplete="email" /></div>' +
      '<div class="field-row">' +
      '<div class="field"><label>Change avatar</label>' +
      '<div class="avatar-actions">' +
      '<button class="btn" id="prof-choose-avatar" type="button">' + icon("upload") + " Choose image</button>" +
      (user.avatar ? '<button class="btn btn-ghost" id="prof-remove-avatar" type="button">Remove</button>' : "") +
      '<input type="file" id="prof-avatar-input" class="visually-hidden" accept="image/png,image/jpeg,image/webp,image/gif" />' +
      "</div></div>" +
      '<div class="field"><label>&nbsp;</label>' +
      '<button class="btn btn-primary btn-block" id="prof-save" type="button">Save changes</button>' +
      "</div>" +
      "</div>" +
      '<div class="form-error" id="prof-error" role="alert" hidden></div>' +
      "</div>" +

      '<div class="profile-danger card">' +
      '<div class="pr-info">' +
      "<h3>Session</h3>" +
      "<p>Sign out of this device. Your Supabase session will end here.</p>" +
      "</div>" +
      '<button class="btn btn-danger" id="prof-logout" type="button">' + icon("alert") + " Log out</button>" +
      "</div>" +
      "</div>";

    bindProfile(shell, user);
  }

  function bindProfile(shell, user) {
    const avatarInput = shell.querySelector("#prof-avatar-input");
    const errorEl = shell.querySelector("#prof-error");
    let newAvatar = null;

    function setError(msg) {
      if (!errorEl) return;
      if (msg) {
        errorEl.textContent = msg;
        errorEl.hidden = false;
      } else {
        errorEl.hidden = true;
        errorEl.textContent = "";
      }
    }

    shell.querySelector("#prof-choose-avatar").addEventListener("click", () => avatarInput.click());
    avatarInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 512 * 1024) {
        setError("Avatar image must be under 512 KB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        newAvatar = String(reader.result || "");
        const wrap = shell.querySelector("#profile-avatar");
        wrap.innerHTML = '<img src="' + utils.escapeHtml(newAvatar) + '" alt="Profile avatar" />';
        setError(null);
      };
      reader.onerror = () => setError("Could not read that image.");
      reader.readAsDataURL(file);
    });

    const removeBtn = shell.querySelector("#prof-remove-avatar");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        newAvatar = "";
        const wrap = shell.querySelector("#profile-avatar");
        wrap.innerHTML = "<span>" + utils.escapeHtml(initials(user.name)) + "</span>";
        setError(null);
      });
    }

    shell.querySelector("#prof-save").addEventListener("click", async () => {
      const name = shell.querySelector("#pf-name").value.trim();
      const username = shell.querySelector("#pf-username").value.trim();
      const email = shell.querySelector("#pf-email").value.trim();
      if (!name || !email) {
        setError("Display name and email are required.");
        return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        setError("Please enter a valid email address.");
        return;
      }
      const patch = { name: name, username: username, email: email };
      if (newAvatar !== null) patch.avatar = newAvatar === "" ? null : newAvatar;
      const result = await window.SeedChatAuth.updateProfile(patch);
      if (result.ok) {
        window.SeedChatUI.toast("Profile updated", "ok");
        renderProfile();
      } else {
        setError(result.error);
      }
    });

    shell.querySelector("#prof-logout").addEventListener("click", () => {
      window.SeedChatAuth.logout().then(() => {
        window.SeedChatUI.toast("Signed out", "ok");
        if (window.SeedChatShell) window.SeedChatShell.navigate("login.html");
      });
    });
  }

  function boot() {
    const nav = window.SeedChatNavigation;
    const ready = nav && nav.ready ? nav.ready : Promise.resolve();
    ready.then(() => {
      renderProfile();
      if (window.SeedChatAuth && window.SeedChatAuth.subscribe) {
        window.SeedChatAuth.subscribe(renderProfile);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
