/* ============================================================
   Seed Code Chat — Provider Adapters
   All provider-specific request logic lives here. The rest of
   the application only talks to this abstraction.

   Supported: OpenRouter, AeroLink, Custom
   ============================================================ */

(function () {
  "use strict";

  const config = window.SeedChatConfig;
  const storage = window.SeedChatStorage;

  const Providers = {};

  /* ------------------------------------------------------------
     Adapter metadata + logic
     ------------------------------------------------------------ */

  const adapters = {
    openrouter: {
      id: "openrouter",
      name: "OpenRouter",
      icon: "route",
      description: "Router with free & paid models. Default provider uses free models only.",
      authType: "bearer",
      defaultBaseUrl: "https://openrouter.ai/api/v1",
      keyPrefix: "sk-or-v1-",
      defaultModel: "",
      requiresKey: true,
      hasKeyHint: true,
      supportsFreeFilter: true,
    },
    aerolink: {
      id: "aerolink",
      name: "AeroLink",
      icon: "link",
      description: "Unified OpenAI-compatible gateway with managed keys and usage ledger.",
      authType: "bearer",
      defaultBaseUrl: "https://aerolink.lat/v1",
      keyPrefix: "aero_live_",
      defaultModel: "",
      requiresKey: true,
      hasKeyHint: true,
    },
    custom: {
      id: "custom",
      name: "Custom provider",
      icon: "terminal",
      description: "Bring your own OpenAI-compatible endpoint and API key.",
      authType: "bearer",
      defaultBaseUrl: "",
      keyPrefix: "",
      defaultModel: "",
      requiresKey: true,
      hasKeyHint: false,
      isCustom: true,
    },
  };

  Providers.getAdapter = function (providerId) {
    return adapters[providerId] || null;
  };

  Providers.listAdapters = function () {
    return config.providerOrder.map((id) => adapters[id]).filter(Boolean);
  };

  Providers.getAdapterIcon = function (providerId) {
    const a = adapters[providerId];
    return a ? a.icon : "spark";
  };

  /* ------------------------------------------------------------
     Default seeding (first run)
     ------------------------------------------------------------ */

  Providers.seedDefaults = function (existingKeys) {
    const vault = existingKeys || storage.loadKeys();

    function ensureKey(ref, value) {
      if (!vault[ref]) {
        storage.setKey(ref, value);
      }
      return ref;
    }

    const openrouterKeyRef = ensureKey(
      "k_openrouter_default",
      config.defaults.openrouter.apiKey
    );

    return [
      {
        id: "openrouter-default",
        provider: "openrouter",
        label: "OpenRouter (free models)",
        baseUrl: config.defaults.openrouter.baseUrl,
        apiKeyRef: openrouterKeyRef,
        enabled: true,
        isDefault: true,
        isFallback: false,
        modelIds: null,
        freeOnly: true,
      },
    ];
  };

  /** Merge a persisted provider config with adapter defaults. */
  Providers.mergeWithAdapter = function (cfg) {
    const adapter = adapters[cfg.provider];
    if (!adapter) return null;
    return {
      id: cfg.id,
      provider: cfg.provider,
      label: cfg.label || adapter.name,
      baseUrl: cfg.baseUrl || adapter.defaultBaseUrl,
      apiKeyRef: cfg.apiKeyRef || null,
      enabled: cfg.enabled !== false,
      isDefault: Boolean(cfg.isDefault),
      isFallback: Boolean(cfg.isFallback),
      freeOnly: Boolean(cfg.freeOnly),
      modelIds: cfg.modelIds || null,
      createdAt: cfg.createdAt || Date.now(),
    };
  };

  /** Build a fresh provider config for the add-provider flow. */
  Providers.buildConfig = function (providerId, opts) {
    const adapter = adapters[providerId];
    if (!adapter) return null;
    const baseUrl = opts && opts.baseUrl ? opts.baseUrl : adapter.defaultBaseUrl;
    return {
      id: opts && opts.id ? opts.id : window.SeedChatUtils.uid("prov"),
      provider: providerId,
      label: opts && opts.label ? opts.label : adapter.name,
      baseUrl: baseUrl,
      apiKeyRef: opts && opts.apiKeyRef ? opts.apiKeyRef : null,
      enabled: opts ? opts.enabled !== false : true,
      isDefault: Boolean(opts && opts.isDefault),
      isFallback: Boolean(opts && opts.isFallback),
      freeOnly: Boolean(opts && opts.freeOnly),
      modelIds: null,
      createdAt: Date.now(),
    };
  };

  /* ------------------------------------------------------------
     Model resolution
     ------------------------------------------------------------ */

  /** Return the effective model list for a provider config.
        - pinned list when modelIds set
        - otherwise static catalog merged with live-fetched models */
  Providers.resolveModels = function (providerConfig) {
    const adapter = adapters[providerConfig.provider];
    if (!adapter) return [];

    let models = [];
    if (Array.isArray(providerConfig.modelIds) && providerConfig.modelIds.length) {
      models = providerConfig.modelIds
        .map((id) => Providers.modelFromId(id, providerConfig.provider, adapter))
        .filter(Boolean);
    } else {
      /* merge static catalog + live catalog (live wins on metadata) */
      const byId = {};
      (config.staticModels[providerConfig.provider] || []).forEach((m) => {
        byId[m.id] = Object.assign({}, m, { provider: providerConfig.provider });
      });
      (providerConfig.liveModels || []).forEach((m) => {
        if (byId[m.id]) {
          byId[m.id] = Object.assign({}, byId[m.id], m);
        } else {
          byId[m.id] = Object.assign({}, m, { provider: providerConfig.provider });
        }
      });
      models = Object.values(byId);
    }

    if (providerConfig.provider === "openrouter") {
      return models.filter((m) => m.free);
    }
    return models;
  };

  Providers.modelFromId = function (id, providerId, adapter) {
    const a = adapter || adapters[providerId];
    if (!id) return null;
    const pretty = String(id)
      .split("/")
      .slice(-1)[0]
      .split(":")
      .shift()
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return {
      id: id,
      name: pretty || id,
      provider: providerId,
      free: false,
      contextWindow: 0,
      capabilities: [],
    };
  };

  /** Fetch the live model catalog for a provider config + key. */
  Providers.fetchModels = async function (providerConfig, apiKey, signal) {
    const adapter = adapters[providerConfig.provider];
    if (!adapter) return [];
    const baseUrl = providerConfig.baseUrl || adapter.defaultBaseUrl;
    if (!baseUrl) return [];

    const url = baseUrl.replace(/\/+$/, "") + "/models";
    const res = await fetch(url, {
      headers: {
        Authorization: "Bearer " + (apiKey || ""),
        Accept: "application/json",
      },
      signal: signal,
    });
    if (!res.ok) {
      throw new Error("Model list request failed (" + res.status + ")");
    }
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data.data) ? data.data : [];

    return list
      .map((m) => {
        const pricing = m.pricing || {};
        const idStr = String(m.id || "");
        const isFree =
          (m.is_free === true) ||
          idStr.indexOf(":free") >= 0 ||
          (pricing.prompt === 0) ||
          (pricing.prompt === "0") ||
          (pricing.prompt === "0.00") ||
          (typeof pricing.prompt === "string" && Number(pricing.prompt) === 0);
        return {
          id: m.id,
          name: m.name || String(m.id),
          provider: providerConfig.provider,
          free: isFree,
          contextWindow: m.context_length || m.contextWindow || 0,
          capabilities: Array.isArray(m.capabilities) ? m.capabilities : [],
        };
      })
      .sort((a, b) => (b.free === a.free ? 0 : b.free ? 1 : -1));
  };

  /* ------------------------------------------------------------
     Request construction (OpenAI-compatible)
     ------------------------------------------------------------ */

  function buildMessages(messageList) {
    return messageList
      .filter((m) => m && m.role && m.content != null)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));
  }

  function buildUrl(providerConfig) {
    const adapter = adapters[providerConfig.provider];
    const baseUrl = providerConfig.baseUrl || adapter.defaultBaseUrl;
    return baseUrl.replace(/\/+$/, "") + "/chat/completions";
  }

  function buildHeaders(providerConfig, apiKey) {
    const headers = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: "Bearer " + (apiKey || ""),
    };
    if (providerConfig.provider === "openrouter") {
      headers["HTTP-Referer"] = window.location.origin || "http://localhost";
      headers["X-Title"] = "Seed Code Chat";
    }
    return headers;
  }

  function buildBody(providerConfig, model, messages, generation) {
    const body = {
      model: model,
      messages: messages,
      temperature: generation.temperature,
      max_tokens: generation.maxTokens,
      stream: generation.streaming,
    };
    if (providerConfig.provider === "openrouter" && providerConfig.freeOnly) {
      body.transforms = ["middle-out"];
    }
    return body;
  }

  /* ------------------------------------------------------------
     Streaming + non-streaming send
     ------------------------------------------------------------ */

  /** Send a message; returns a promise.
        opts: { providerConfig, apiKey, model, messages, generation, signal,
                onChunk(content) }
        Resolves with the full text on success, rejects with an
        Error object that carries { kind } for classification. */
  Providers.sendMessage = function (opts) {
    const { providerConfig, apiKey, model, messages, generation, signal, onChunk } = opts;
    const adapter = adapters[providerConfig.provider];
    if (!adapter) return Promise.reject(err("unsupported", "Provider not supported"));
    if (!model) {
      return Promise.reject(
        err("validation", "No model selected for " + providerConfig.label + ".")
      );
    }

    const url = buildUrl(providerConfig);
    const body = buildBody(providerConfig, model, buildMessages(messages), generation);

    return fetch(url, {
      method: "POST",
      headers: buildHeaders(providerConfig, apiKey),
      body: JSON.stringify(body),
      signal: signal,
    }).then(async function (res) {
      if (!res.ok) {
        const payload = await readErrorBody(res).catch(() => null);
        throw buildError(res.status, payload, providerConfig.provider);
      }
      if (generation.streaming && res.body && typeof res.body.getReader === "function") {
        return readStream(res, signal, onChunk);
      }
      const data = await res.json().catch(() => null);
      const text = extractContent(data);
      if (onChunk) onChunk(text);
      return text;
    }).catch(function (fetchError) {
      /* A rejected fetch (CORS, DNS, connection reset, aborted request)
         carries no kind. Classify it so the fallback resolver can act and
         the user gets a readable message instead of the raw TypeError. */
      if (fetchError && fetchError.kind) throw fetchError;
      if (signal && signal.aborted) {
        throw err("aborted", "Generation stopped.");
      }
      const e = err(
        "network",
        "Could not reach " + providerConfig.label + ". Check your connection and try again."
      );
      e.status = 0;
      e.provider = providerConfig.provider;
      e.cause = fetchError;
      throw e;
    });
  };

  function readStream(res, signal, onChunk) {
    return new Promise((resolve, reject) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let full = "";

      function handleError(e) {
        if (signal && signal.aborted) {
          reject(err("aborted", "Generation stopped."));
        } else {
          reject(err("stream", "Stream interrupted. " + (e && e.message ? e.message : "")));
        }
      }

      function pump() {
        reader
          .read()
          .then(function ({ done, value }) {
            if (done) {
              resolve(full);
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            lines.forEach(parseLine);
            pump();
          })
          .catch(handleError);
      }

      function parseLine(line) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) return;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;
        let json;
        try {
          json = JSON.parse(payload);
        } catch (e) {
          return;
        }
        const choice = json.choices && json.choices[0];
        if (!choice) return;
        let delta = "";
        if (choice.delta) {
          delta = choice.delta.content || "";
        } else if (choice.message) {
          delta = choice.message.content || "";
        }
        if (choice.error) {
          reject(err("quota", "Provider returned an error during streaming."));
          return;
        }
        if (delta) {
          full += delta;
          if (onChunk) onChunk(delta);
        }
      }

      pump();
    });
  }

  function extractContent(data) {
    if (!data) return "";
    const choice = data.choices && data.choices[0];
    if (choice && choice.message && choice.message.content) return choice.message.content;
    if (choice && choice.text) return choice.text;
    return "";
  }

  function readErrorBody(res) {
    return res.text().then((t) => {
      try {
        return JSON.parse(t);
      } catch (e) {
        return { raw: t };
      }
    });
  }

  /* ------------------------------------------------------------
     Error classification
     ------------------------------------------------------------ */

  function err(kind, message) {
    const e = new Error(message);
    e.kind = kind;
    return e;
  }

  Providers.makeError = err;

  function buildError(status, payload, providerId) {
    const message = extractErrorMessage(payload, status);
    const kind = classifyStatus(status, payload);
    const e = new Error(message);
    e.kind = kind;
    e.status = status;
    e.payload = payload;
    e.provider = providerId;
    return e;
  }

  function extractErrorMessage(payload, status) {
    if (!payload) return "Request failed with status " + status + ".";
    if (payload.error) {
      if (typeof payload.error === "string") return payload.error;
      if (payload.error.message) return String(payload.error.message);
      if (payload.error.code) return String(payload.error.code);
    }
    if (payload.message) return String(payload.message);
    if (payload.raw) return String(payload.raw).slice(0, 300);
    return "Request failed with status " + status + ".";
  }

  function classifyStatus(status, payload) {
    if (status === 401 || status === 403) {
      /* A default shared key can be exhausted ("Insufficient balance").
         Treat balance/credit exhaustion as a quota failure so the
         fallback resolver can move to the next provider. */
      const msg = (extractErrorMessage(payload, status) || "").toLowerCase();
      if (
        msg.indexOf("balance") >= 0 ||
        msg.indexOf("insufficient") >= 0 ||
        msg.indexOf("credit") >= 0 ||
        msg.indexOf("quota") >= 0
      ) {
        return "quota";
      }
      return "auth";
    }
    if (status === 429) return "rate_limit";
    if (status === 402 || status === 409) return "quota";
    if (status >= 500) return "unavailable";
    if (status === 400) return "content";
    if (status === 404) return "model";
    return "error";
  }

  /** Determine whether a provider error is fallback-worthy. */
  Providers.isFallbackWorthy = function (error) {
    if (!error) return false;
    const kind = error.kind;
    return (
      kind === "rate_limit" ||
      kind === "quota" ||
      kind === "unavailable" ||
      kind === "timeout" ||
      kind === "network" ||
      kind === "stream" ||
      kind === "model" ||
      /* An auth failure on a bundled default provider (shared key) should
         not kill the chat — fall back to the next enabled provider.
         User-configured providers never silently fall back on auth. */
      (kind === "auth" && error.providerIsDefault)
    );
  };

  /** Human-friendly, context-first error message for the UI. */
  Providers.describeError = function (error, providerLabel) {
    const name = providerLabel || "the provider";
    if (!error) return "Something went wrong.";
    switch (error.kind) {
      case "auth":
        return name + " could not authenticate. Check the API key or test the connection again.";
      case "rate_limit":
        return name + " is rate-limiting requests. Wait a moment and try again.";
      case "quota":
        return name + " has exhausted its quota for this session.";
      case "unavailable":
        return name + " is temporarily unavailable.";
      case "model":
        return "The selected model is not available on " + name + ".";
      case "timeout":
        return name + " took too long to respond.";
      case "network":
        return "Network error while reaching " + name + ". Check your connection.";
      case "stream":
        return "The response was interrupted. You can retry or regenerate.";
      case "validation":
        return error.message;
      case "aborted":
        return "Generation stopped.";
      default:
        return error.message || "Something went wrong with " + name + ".";
    }
  };

  /* ------------------------------------------------------------
     Credential validation
     ------------------------------------------------------------ */

  Providers.validateCredentials = async function (providerConfig, apiKey, model) {
    const adapter = adapters[providerConfig.provider];
    if (!adapter) return { ok: false, error: "Unknown provider" };
    const baseUrl = providerConfig.baseUrl || adapter.defaultBaseUrl;
    if (!baseUrl) return { ok: false, error: "Base URL is required for custom providers." };
    if (!apiKey) return { ok: false, error: "An API key is required." };

    const useModel = model || adapter.defaultModel || "";
    const body = {
      model: useModel,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 8,
      stream: false,
    };

    try {
      const res = await fetch(
        baseUrl.replace(/\/+$/, "") + "/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + apiKey,
          },
          body: JSON.stringify(body),
        }
      );
      if (res.ok) return { ok: true };
      const payload = await readErrorBody(res).catch(() => null);
      return { ok: false, error: extractErrorMessage(payload, res.status) };
    } catch (e) {
      return { ok: false, error: e && e.message ? e.message : "Could not reach provider" };
    }
  };

  window.SeedChatProviders = Providers;
})();
