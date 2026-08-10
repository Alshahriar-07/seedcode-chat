/* ============================================================
   Seed Code Chat — Supabase client
   -----------------------------------------------------------------
   Loaded AFTER the Supabase JS v2 UMD build (see page <head>
   / script tags) which exposes the global `supabase`.

   Only the public anon/publishable key is used here. Never ship a
   service_role key, secret key, or database password to the browser.
   ============================================================ */

(function () {
  "use strict";

  const SUPABASE_URL = "https://vxtjwhhrlnaknhghiswv.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_D82LGcL6jYtpA2hj2Kqedw_wLxuKavS";

  const supabaseLib = window.supabase;
  if (!supabaseLib || typeof supabaseLib.createClient !== "function") {
    console.error(
      "Seed Code Chat: Supabase JS v2 is not loaded. Add the UMD build before js/supabase.js."
    );
    window.SeedChatSupabase = null;
    return;
  }

  const client = supabaseLib.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  window.SeedChatSupabase = {
    url: SUPABASE_URL,
    key: SUPABASE_PUBLISHABLE_KEY,
    client: client,
    createClient: supabaseLib.createClient,
  };
})();
