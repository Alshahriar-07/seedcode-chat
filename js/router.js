/* ============================================================
   Seed Code Chat — Provider Router / Fallback Resolver
   Default: OpenRouter (free models only)
   ============================================================ */

(function () {
  "use strict";

  const state = window.SeedChatState;
  const providers = window.SeedChatProviders;

  const Router = {};

  /**
   * Build the ordered list of provider configs to attempt.
   * Primary is the active provider; fallbacks follow.
   */
  Router.buildAttempts = function () {
    const all = state.getState().providers.filter((p) => p.enabled);
    const active = state.getActiveProvider();

    const primary =
      active && active.enabled
        ? active
        : all.find((p) => p.isDefault && p.enabled) || all[0];

    if (!primary) return [];

    const autoFallback = state.getState().generation.autoFallback !== false;

    /* Preferred fallbacks: providers explicitly marked isFallback */
    let fallbacks = autoFallback ? all.filter((p) => p.id !== primary.id && p.isFallback) : [];

    /* Fall back to any other enabled provider when none is marked */
    if (autoFallback && !fallbacks.length) {
      fallbacks = all.filter((p) => p.id !== primary.id);
    }

    return [primary].concat(fallbacks);
  };

  /**
   * Pick the best model for an attempt.
   * Free-only fallback (e.g. OpenRouter) is restricted to free models.
   */
  Router.pickModel = function (providerConfig, preferredModelId) {
    const models = providers.resolveModels(providerConfig);

    if (providerConfig.freeOnly) {
      /* Free-only fallback may NEVER select a paid model. */
      const free = models.filter((m) => m.free);
      const keepFree = free.find((m) => m.id === preferredModelId);
      return keepFree ? keepFree.id : free.length ? free[0].id : null;
    }

    if (preferredModelId && models.find((m) => m.id === preferredModelId)) {
      return preferredModelId;
    }
    return models.length ? models[0].id : null;
  };

  /**
   * Run a generation with automatic fallback.
   *
   * opts:
   *   messages    - full message list for the API request
   *   model       - preferred model id
   *   generation  - { temperature, maxTokens, streaming }
   *   signal      - external AbortSignal (user stop)
   *   onChunk     - (text) partial content
   *   onStatus    - ({ phase, label, provider, model, error }) status updates
   *
   * Resolves: { text, provider, model, usedFallback, attempts }
   * Rejects only when every attempt failed or the user aborted.
   */
  Router.run = async function (opts) {
    const attempts = Router.buildAttempts();
    if (!attempts.length) {
      const e = new Error("No enabled provider is configured. Open Settings to add one.");
      e.kind = "validation";
      throw e;
    }

    const usedAttempts = [];
    let lastError = null;
    let attemptIndex = 0;

    for (const providerConfig of attempts) {
      attemptIndex += 1;
      const model = Router.pickModel(providerConfig, opts.model);

      if (!model) {
        lastError = new Error(
          providerConfig.label + " has no available model. Configure one in Settings."
        );
        lastError.kind = "validation";
        usedAttempts.push({ provider: providerConfig, status: "no-model" });
        continue;
      }

      const apiKey = providerConfig.apiKeyRef
        ? window.SeedChatStorage.getKey(providerConfig.apiKeyRef)
        : null;

      if (!apiKey) {
        lastError = new Error(providerConfig.label + " has no API key configured.");
        lastError.kind = "auth";
        usedAttempts.push({ provider: providerConfig, status: "no-key" });
        continue;
      }

      const controller = new AbortController();
      let timedOut = false;
      const timeoutMs = window.SeedChatConfig.generation.requestTimeoutMs || 30000;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      const onAbort = () => controller.abort();
      if (opts.signal) {
        if (opts.signal.aborted) {
          clearTimeout(timeoutId);
          const e = new Error("Generation stopped.");
          e.kind = "aborted";
          throw e;
        }
        opts.signal.addEventListener("abort", onAbort);
      }

      let text = "";
      const isFallback = attemptIndex > 1;

      if (opts.onStatus) {
        opts.onStatus({
          phase: isFallback ? "fallback" : "primary",
          provider: providerConfig,
          model: model,
        });
      }

      usedAttempts.push({ provider: providerConfig, model: model, status: "attempted" });

      try {
        text = await providers.sendMessage({
          providerConfig,
          apiKey,
          model,
          messages: opts.messages,
          generation: opts.generation,
          signal: controller.signal,
          onChunk: opts.onChunk,
        });
        clearTimeout(timeoutId);
        if (opts.signal) opts.signal.removeEventListener("abort", onAbort);
        return {
          text,
          provider: providerConfig,
          model,
          usedFallback: isFallback,
          attempts: usedAttempts,
        };
      } catch (e) {
        clearTimeout(timeoutId);
        if (opts.signal) opts.signal.removeEventListener("abort", onAbort);
        if (timedOut) {
          /* stalled provider: convert abort into a fallback-worthy timeout */
          const t = new Error(providerConfig.label + " took too long to respond.");
          t.kind = "timeout";
          t.status = 0;
          t.provider = providerConfig.provider;
          e = t;
        } else if (e.kind === "aborted") {
          throw e;
        }

        lastError = e;
        e.providerIsDefault = Boolean(providerConfig.isDefault);
        usedAttempts[usedAttempts.length - 1].status = "failed";
        usedAttempts[usedAttempts.length - 1].error = e;

        const shouldFallback = providers.isFallbackWorthy(e);
        const hasNext = attemptIndex < attempts.length;

        if (!shouldFallback || !hasNext) {
          e.usedAttempts = usedAttempts;
          throw e;
        }

        /* notify UI that we are switching */
        if (opts.onStatus) {
          opts.onStatus({
            phase: "switching",
            provider: attempts[attemptIndex],
            fromProvider: providerConfig,
            reason: e.kind,
          });
        }
      }
    }

    lastError.usedAttempts = usedAttempts;
    throw lastError;
  };

  /** Resolve the human label for an attempt result. */
  Router.describeResult = function (result) {
    if (!result) return "";
    const label = result.provider ? result.provider.label : "";
    const model = result.model || "";
    if (result.usedFallback) return "Fell back to " + label + " · " + model;
    return label + " · " + model;
  };

  window.SeedChatRouter = Router;
})();
