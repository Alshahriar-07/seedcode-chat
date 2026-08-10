/* ============================================================
   Seed Code Chat — Supabase-backed account system
   -----------------------------------------------------------------
   Replaces the previous localStorage-only accounts with Supabase
   Auth. The exported surface stays the same (signup / login /
   logout / getSession / isAuthenticated / updateProfile /
   changeAvatar / subscribe) so the rest of the app is untouched.

   - Session state comes from supabase.auth (getSession +
     onAuthStateChange). It persists across refreshes via the
     Supabase client's own storage; we never create a fake local
     session and never store a password.
   - Profile data (display_name, username, avatar_url) lives in the
     `profiles` table keyed by the Supabase Auth user id.
   ============================================================ */

(function () {
  "use strict";

  const supabase =
    window.SeedChatSupabase && window.SeedChatSupabase.client
      ? window.SeedChatSupabase.client
      : null;

  const Auth = {};
  const listeners = [];

  /* Cached view of the signed-in user, shaped for the existing UI:
     { id, name, username, email, avatar, status, createdAt } */
  let cachedUser = null;
  let bootstrapPromise = null;
  let authListener = null;

  /* ---------------- Shaping ---------------- */

  function buildUser(authUser, profile) {
    const meta = (authUser && authUser.user_metadata) || {};
    const displayName =
      (profile && profile.display_name) ||
      meta.display_name ||
      meta.name ||
      (authUser ? authUser.email : "") ||
      "";
    return {
      id: authUser ? authUser.id : null,
      name: String(displayName),
      username: String((profile && profile.username) || meta.username || ""),
      email: authUser ? authUser.email || "" : "",
      avatar: (profile && profile.avatar_url) || meta.avatar_url || null,
      status: "Active",
      createdAt: authUser && authUser.created_at ? new Date(authUser.created_at).getTime() : null,
    };
  }

  /* ---------------- Session ---------------- */

  Auth.getSession = function () {
    return cachedUser;
  };

  Auth.isAuthenticated = function () {
    return Boolean(cachedUser);
  };

  /** Ensure the cached session is populated from Supabase at least once. */
  Auth.ensureSession = function () {
    if (!supabase) return Promise.resolve(null);
    if (!bootstrapPromise) {
      bootstrapPromise = refreshSession().catch(function (e) {
        console.error("Seed Code Chat: session restore failed", e);
        cachedUser = null;
        emit();
        return null;
      });
    }
    return bootstrapPromise;
  };

  function getAuthUser() {
    return supabase.auth.getUser().then(function (res) {
      return res.error ? null : res.data.user;
    });
  }

  async function loadProfile(userId) {
    if (!supabase || !userId) return null;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      return data || null;
    } catch (e) {
      return null;
    }
  }

  async function refreshSession() {
    if (!supabase) {
      cachedUser = null;
      emit();
      return cachedUser;
    }
    const { data } = await supabase.auth.getSession();
    const authUser = data && data.session ? data.session.user : null;
    if (!authUser) {
      cachedUser = null;
      emit();
      return cachedUser;
    }
    const profile = await loadProfile(authUser.id);
    cachedUser = buildUser(authUser, profile);
    emit();
    return cachedUser;
  }

  /** Set cached user from a fresh auth user object (used right after login/signup). */
  async function setUserFromAuth(authUser) {
    const profile = authUser ? await loadProfile(authUser.id) : null;
    cachedUser = authUser ? buildUser(authUser, profile) : null;
    emit();
    return cachedUser;
  }

  /* ---------------- Subscriptions ---------------- */

  Auth.subscribe = function (fn) {
    listeners.push(fn);
    return function () {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  };

  function emit() {
    const session = cachedUser;
    listeners.slice().forEach(function (fn) {
      try {
        fn(session);
      } catch (e) {
        /* subscriber errors must not break auth */
      }
    });
  }

  /* ---------------- Auth actions ---------------- */

  Auth.signup = async function (fields) {
    if (!supabase) {
      return { ok: false, error: "Supabase is not initialized on this page." };
    }
    const name = String(fields.name || "").trim();
    const username = String(fields.username || "").trim();
    const email = String(fields.email || "").trim().toLowerCase();
    const password = String(fields.password || "");

    if (!name || !email || !password) {
      return { ok: false, error: "Please fill in all required fields." };
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { ok: false, error: "Please enter a valid email address." };
    }
    if (password.length < 6) {
      return { ok: false, error: "Password must be at least 6 characters." };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username || null,
            display_name: name,
          },
        },
      });

      if (error) {
        const c = classifyError(error);
        return { ok: false, error: c.message, errorKind: c.kind };
      }

      const authUser = data && data.user;
      const sessionIssued = Boolean(data && data.session);

      /* Create / update the user's profiles row using the Auth user id. */
      if (authUser && authUser.id) {
        try {
          await supabase.from("profiles").upsert(
            {
              id: authUser.id,
              username: username || null,
              display_name: name,
              avatar_url: null,
            },
            { onConflict: "id" }
          );
        } catch (e) {
          /* A profile write failure must not block signup itself. */
          console.error("Seed Code Chat: profiles upsert failed", e);
        }
      }

      /* If a session was issued (no email confirmation), warm the cache. */
      if (sessionIssued) {
        await setUserFromAuth(authUser);
      }
      return {
        ok: true,
        user: cachedUser || (authUser ? buildUser(authUser, null) : null),
        sessionIssued: sessionIssued,
      };
    } catch (e) {
      return { ok: false, error: networkError(e) };
    }
  };

  Auth.login = async function (email, password) {
    if (!supabase) {
      return { ok: false, error: "Supabase is not initialized on this page." };
    }
    email = String(email || "").trim().toLowerCase();
    if (!email || !password) {
      return { ok: false, error: "Please enter your email and password." };
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: String(password || ""),
      });
      if (error) {
        const c = classifyError(error);
        return { ok: false, error: c.message, errorKind: c.kind };
      }
      await setUserFromAuth(data.user);
      return { ok: true, user: cachedUser };
    } catch (e) {
      return { ok: false, error: networkError(e) };
    }
  };

  Auth.logout = async function () {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        /* even on network failure we clear the local cache */
      }
    }
    cachedUser = null;
    emit();
  };

  Auth.updateProfile = async function (patch) {
    if (!supabase) return { ok: false, error: "Supabase is not initialized." };
    const authUser = await getAuthUser();
    if (!authUser) return { ok: false, error: "Not signed in." };

    const prev = cachedUser || {};
    const name =
      patch.name != null ? String(patch.name).trim() : prev.name || "";
    const username =
      patch.username != null ? String(patch.username).trim() : prev.username || "";
    const avatar =
      patch.avatar !== undefined
        ? patch.avatar
          ? String(patch.avatar)
          : null
        : prev.avatar || null;
    const email =
      patch.email != null ? String(patch.email).trim() : authUser.email || "";

    try {
      /* Update the profiles row (id = Auth user id). */
      await supabase.from("profiles").upsert(
        {
          id: authUser.id,
          username: username || null,
          display_name: name,
          avatar_url: avatar,
        },
        { onConflict: "id" }
      );

      /* Keep Auth user_metadata in sync so the user chip / session
         reflect the new display name and username immediately. */
      try {
        await supabase.auth.updateUser({
          data: {
            username: username || null,
            display_name: name,
          },
        });
      } catch (e) {
        /* metadata sync is best-effort */
      }

      /* Email change goes through Supabase Auth (sends a confirmation). */
      if (email && email !== authUser.email) {
        try {
          await supabase.auth.updateUser({ email: email });
        } catch (e) {
          return { ok: false, error: friendlyMessage(e) };
        }
      }

      await refreshSession();
      return { ok: true, user: cachedUser };
    } catch (e) {
      return { ok: false, error: networkError(e) };
    }
  };

  Auth.changeAvatar = async function (dataUrl) {
    return Auth.updateProfile({ avatar: dataUrl ? String(dataUrl) : null });
  };

  /* ---------------- Error classification ---------------- */

  /** Map a Supabase error to a friendly, user-safe message + kind.
      Kinds let the UI react (e.g. offer "resend confirmation"). */
  function classifyError(error) {
    if (!error) {
      return { kind: "unknown", message: "Something went wrong. Please try again." };
    }
    const msg = error.message ? String(error.message) : "";
    const code = error.code || "";
    const full = msg + " " + code;
    if (/invalid login credentials/i.test(full)) {
      return { kind: "invalid_credentials", message: "Incorrect email or password." };
    }
    if (/email not confirmed|email_not_confirmed/i.test(full)) {
      return {
        kind: "email_not_confirmed",
        message: "Please confirm your email before signing in. Check your inbox for the confirmation link.",
      };
    }
    if (/already registered|user already registered/i.test(full)) {
      return { kind: "email_exists", message: "An account with this email already exists." };
    }
    if (/weak password/i.test(full)) {
      return { kind: "weak_password", message: "Password must be at least 6 characters." };
    }
    if (/over_email_send_rate_limit|rate.limit|too many requests/i.test(full)) {
      return {
        kind: "rate_limit",
        message: "Too many attempts. Please wait a moment and try again.",
      };
    }
    if (/request limit/i.test(full)) {
      return { kind: "request_limit", message: "Signup limit reached. Please try again later." };
    }
    if (/signups not allowed|email_provider_disabled/i.test(full)) {
      return { kind: "signup_disabled", message: "Signups are currently disabled on this project." };
    }
    /* Never surface raw internal details to the user. */
    if (code || msg) {
      return {
        kind: "unknown",
        message: "We couldn't complete that request. Please try again.",
      };
    }
    return { kind: "unknown", message: "Something went wrong. Please try again." };
  }

  function friendlyMessage(error) {
    return classifyError(error).message;
  }

  function networkError(e) {
    if (e && e.message) return String(e.message);
    return "Could not reach Supabase. Check your connection and try again.";
  }

  /** Resend the signup confirmation email (used when login reports
      an unconfirmed email). Does NOT bypass confirmation. */
  Auth.resendConfirmation = async function (email) {
    if (!supabase) {
      return { ok: false, error: "Supabase is not initialized on this page." };
    }
    email = String(email || "").trim().toLowerCase();
    if (!email) return { ok: false, error: "Please enter your email first." };
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });
      if (error) {
        const c = classifyError(error);
        return { ok: false, error: c.message, errorKind: c.kind };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: networkError(e) };
    }
  };

  /* ---------------- Boot ---------------- */

  /** Remove the old localStorage-only auth artifacts so no stale
      fake session can leak into the Supabase-based system. */
  function clearLegacyLocalAuth() {
    try {
      localStorage.removeItem("scc:users");
      localStorage.removeItem("scc:session");
    } catch (e) {
      /* ignore */
    }
  }

  function boot() {
    if (!supabase) {
      console.warn("Seed Code Chat: Supabase client unavailable; auth is disabled.");
      return;
    }

    clearLegacyLocalAuth();

    /* Restore any persisted session and warm the cache. */
    Auth.ensureSession();

    /* Keep the cached user in sync across tabs, refreshes and token
       refresh events. */
    authListener = supabase.auth.onAuthStateChange(function (event, session) {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const authUser = session ? session.user : null;
        if (authUser) {
          setUserFromAuth(authUser);
          return;
        }
      }
      if (event === "SIGNED_OUT" || !session) {
        cachedUser = null;
        emit();
      }
    });
  }

  boot();

  window.SeedChatAuth = Auth;
})();
