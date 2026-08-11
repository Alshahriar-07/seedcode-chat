/* ============================================================
   Seed Code Chat — Configuration
   Default (public/shared) API configurations.

   IMPORTANT: Per project security rules, keys shipped in
   client-side JavaScript are treated as PUBLIC / SHARED
   credentials, NOT secrets. A production deployment should
   move service-owned keys behind the backend proxy.
   ============================================================ */

window.SeedChatConfig = {
  version: "1.0.0",

  /* Public/shared default credentials (see New folder/api_key.txt) */
  defaults: {
    openrouter: {
<<<<<<< HEAD
      apiKey: "OPENROUTER_API_KEY",
=======
      apiKey: "OPENROUTER_API_KEY_1",
>>>>>>> 32867d11ea58653ad31d445386f215529bd92f80
      baseUrl: "https://openrouter.ai/api/v1",
      model: "",
    },
  },

  /* Provider adapters registered in providers.js */
  providerOrder: ["openrouter", "aerolink", "custom"],

  /* Static model catalog fallback used when /models cannot be fetched.
     IDs are verified to be broadly available on each gateway. */
  staticModels: {
    openrouter: [
      { id: "openrouter/free", name: "OpenRouter auto (free)", free: true, contextWindow: 128000 },
      { id: "google/gemma-4-31b-it:free", name: "Gemma 4 31B (free)", free: true, contextWindow: 128000 },
      { id: "google/gemma-4-26b-a4b-it:free", name: "Gemma 4 26B (free)", free: true, contextWindow: 128000 },
      { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nemotron 3 Super 120B (free)", free: true, contextWindow: 131072 },
      { id: "nvidia/nemotron-3-nano-30b-a3b:free", name: "Nemotron 3 Nano 30B (free)", free: true, contextWindow: 131072 },
      { id: "nvidia/nemotron-nano-12b-v2-vl:free", name: "Nemotron Nano 12B (free)", free: true, contextWindow: 131072 },
    ],
    aerolink: [],
    custom: [],
  },

  /* Conversation auto-title generation */
  autoTitle: {
    enabled: true,
    maxPreviewChars: 40,
  },

  /* Generation defaults */
  generation: {
    temperature: 0.7,
    maxTokens: 4096,
    streaming: true,
    autoTitle: true,
    autoFallback: true,
    enterToSend: true,
    requestTimeoutMs: 30000,
  },

  storage: {
    dbName: "seed-code-chat",
    dbVersion: 1,
    conversationsStore: "conversations",
  },
};
