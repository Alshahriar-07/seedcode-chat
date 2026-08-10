/* ============================================================
   Seed Code Chat — Central State + Pub/Sub
   Single source of truth. UI subscribes, never mutates directly
   outside of state actions.
   ============================================================ */

(function () {
  "use strict";

  const storage = window.SeedChatStorage;
  const config = window.SeedChatConfig;

  const defaultGeneration = Object.assign(
    { temperature: 0.7, maxTokens: 4096, streaming: true, autoFallback: true, enterToSend: true },
    config.generation
  );

  let _state = {
    activeConversationId: null,
    conversations: [],
    providers: [],
    activeProviderId: null,
    activeModelId: null,
    generation: Object.assign({}, defaultGeneration),
    ui: {
      sidebarOpen: false,
      settingsOpen: false,
      theme: "dark",
      density: "standard",
    },
    generating: {
      conversationId: null,
      abortController: null,
      streaming: false,
    },
    status: {
      mode: "idle", // idle | generating | error
      message: "",
    },
    online: true,
    ready: false,
  };

  const listeners = {};

  /** Subscribe to state changes. Returns an unsubscribe function. */
  function subscribe(event, fn) {
    (listeners[event] = listeners[event] || []).push(fn);
    return function () {
      listeners[event] = listeners[event].filter((f) => f !== fn);
    };
  }

  /** Emit an event to subscribers. */
  function emit(event, payload) {
    (listeners[event] || []).forEach(function (fn) {
      try {
        fn(payload);
      } catch (e) {
        /* a subscriber error must not break the state machine */
        console.error("State subscriber error:", e);
      }
    });
  }

  function getState() {
    return _state;
  }

  /** Mutate state and emit a generic 'change' event. */
  function setState(mutator) {
    mutator(_state);
    emit("change", _state);
    return _state;
  }

  /* ------------ Conversations ------------ */

  function getActiveConversation() {
    if (!_state.activeConversationId) return null;
    return _state.conversations.find((c) => c.id === _state.activeConversationId) || null;
  }

  function findConversation(id) {
    return _state.conversations.find((c) => c.id === id) || null;
  }

  function addConversation(conversation) {
    _state.conversations.unshift(conversation);
    _state.activeConversationId = conversation.id;
    _state.generating = { conversationId: null, abortController: null, streaming: false };
    emit("change", _state);
    return conversation;
  }

  function updateConversation(id, patch, persist) {
    const conv = findConversation(id);
    if (!conv) return null;
    Object.assign(conv, patch);
    if (persist !== false) {
      storage.putConversation(conv);
    }
    emit("conversation", { id, conversation: conv });
    emit("change", _state);
    return conv;
  }

  function removeConversation(id) {
    _state.conversations = _state.conversations.filter((c) => c.id !== id);
    if (_state.activeConversationId === id) {
      _state.activeConversationId = _state.conversations.length
        ? _state.conversations[0].id
        : null;
      _state.generating = { conversationId: null, abortController: null, streaming: false };
    }
    storage.deleteConversation(id);
    emit("change", _state);
  }

  function setActiveConversation(id) {
    if (id === _state.activeConversationId) return;
    _state.activeConversationId = id;
    emit("conversation", { id, conversation: findConversation(id) });
    emit("change", _state);
  }

  /* ------------ Providers ------------ */

  function getProvider(id) {
    return _state.providers.find((p) => p.id === id) || null;
  }

  function getActiveProvider() {
    return getProvider(_state.activeProviderId);
  }

  function getProviderModels(providerId) {
    const p = getProvider(providerId);
    if (!p) return [];
    return window.SeedChatProviders.resolveModels(p);
  }

  function setActiveModel(modelId, providerId) {
    if (providerId) _state.activeProviderId = providerId;
    _state.activeModelId = modelId;
    storage.saveSettings({
      activeProviderId: _state.activeProviderId,
      activeModelId: _state.activeModelId,
    });
    emit("model", { providerId: _state.activeProviderId, modelId });
    emit("change", _state);
  }

  function setActiveProvider(providerId) {
    const provider = getProvider(providerId);
    if (!provider) return;
    _state.activeProviderId = providerId;
    const models = getProviderModels(providerId);
    const keep = models.find((m) => m.id === _state.activeModelId);
    _state.activeModelId = keep ? keep.id : models.length ? models[0].id : null;
    storage.saveSettings({
      activeProviderId: _state.activeProviderId,
      activeModelId: _state.activeModelId,
    });
    emit("model", { providerId, modelId: _state.activeModelId });
    emit("change", _state);
  }

  /* ------------ Generation settings ------------ */

  function updateGeneration(patch) {
    _state.generation = Object.assign({}, _state.generation, patch);
    storage.saveSettings({ generation: _state.generation });
    emit("change", _state);
  }

  /* ------------ Generation status ------------ */

  function setGenerating(info) {
    _state.generating = Object.assign({}, _state.generating, info);
    if (info && info.conversationId) {
      _state.status.mode = "generating";
      _state.status.message = "";
    } else {
      _state.status.mode = "idle";
    }
    emit("change", _state);
  }

  function setStatus(status) {
    _state.status = status;
    emit("change", _state);
  }

  function setOnline(online) {
    if (_state.online === online) return;
    _state.online = online;
    emit("online", online);
    emit("change", _state);
  }

  /* ------------ UI ------------ */

  function setUi(patch) {
    _state.ui = Object.assign({}, _state.ui, patch);
    emit("change", _state);
  }

  function setTheme(theme) {
    setUi({ theme: theme });
    storage.saveSettings({ theme: theme });
  }

  function setDensity(density) {
    setUi({ density: density === "compact" ? "compact" : "standard" });
    storage.saveSettings({ density: _state.ui.density });
  }

  /* ------------ Load / save ------------ */

  async function load() {
    const settings = storage.loadSettings();
    const keys = storage.loadKeys();

    /* Providers: seed defaults on first run, then hydrate from settings */
    const seeded = window.SeedChatProviders.seedDefaults(keys);
    const saved = settings.providers;

    if (Array.isArray(saved) && saved.length) {
      _state.providers = saved
        .map(function (p) {
          return window.SeedChatProviders.mergeWithAdapter(p);
        })
        .filter(Boolean);
      /* ensure defaults exist even if settings were cleared of them */
      seeded.forEach(function (seed) {
        if (!_state.providers.find((p) => p.id === seed.id)) {
          _state.providers.push(seed);
        }
      });
    } else {
      _state.providers = seeded;
    }

    if (settings.generation) {
      _state.generation = Object.assign({}, defaultGeneration, settings.generation);
    }

    _state.ui.theme = settings.theme || "dark";
    _state.ui.density = settings.density === "compact" ? "compact" : "standard";
    _state.activeProviderId = settings.activeProviderId || null;
    _state.activeModelId = settings.activeModelId || null;

    /* Validate active provider/model against loaded providers */
    if (!getProvider(_state.activeProviderId)) {
      const primary =
        _state.providers.find((p) => p.isDefault && p.enabled) ||
        _state.providers.find((p) => p.enabled) ||
        _state.providers[0];
      _state.activeProviderId = primary ? primary.id : null;
    }
    const activeProvider = getActiveProvider();
    if (activeProvider) {
      const models = getProviderModels(activeProvider.id);
      if (!models.find((m) => m.id === _state.activeModelId)) {
        _state.activeModelId = models.length ? models[0].id : null;
      }
    } else {
      _state.activeModelId = null;
    }

    _state.conversations = await storage.getAllConversations();

    /* restore last opened conversation, otherwise prepare empty state */
    if (settings.lastConversationId) {
      const last = findConversation(settings.lastConversationId);
      if (last) _state.activeConversationId = last.id;
    }

    _state.online = typeof navigator.onLine === "boolean" ? navigator.onLine : true;
    _state.ready = true;
    emit("ready", _state);
    emit("change", _state);
  }

  /** Persist the last-opened conversation. */
  function rememberActiveConversation() {
    storage.saveSettings({ lastConversationId: _state.activeConversationId });
  }

  window.SeedChatState = {
    getState,
    subscribe,
    emit,
    setState,
    getActiveConversation,
    findConversation,
    addConversation,
    updateConversation,
    removeConversation,
    setActiveConversation,
    getProvider,
    getActiveProvider,
    getProviderModels,
    setActiveModel,
    setActiveProvider,
    updateGeneration,
    setGenerating,
    setStatus,
    setOnline,
    setUi,
    setTheme,
    setDensity,
    load,
    rememberActiveConversation,
  };
})();
