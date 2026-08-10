/* ============================================================
   Seed Code Chat — Persistence
   IndexedDB for conversations, localStorage for settings & keys.

   Per Data_Model.md:
   - localStorage for small preferences
   - IndexedDB for larger chat histories
   ============================================================ */

(function () {
  "use strict";

  const CFG = window.SeedChatConfig.storage;
  const KEYS_STORE = "scc:keys";
  const SETTINGS_STORE = "scc:settings";

  const Storage = {};

  /* ---------------- IndexedDB ---------------- */

  let _dbPromise = null;

  function openDb() {
    if (_dbPromise) return _dbPromise;
    if (!("indexedDB" in window)) {
      _dbPromise = Promise.reject(new Error("IndexedDB is not supported"));
      return _dbPromise;
    }
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(CFG.dbName, CFG.dbVersion);
      req.onupgradeneeded = function (e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(CFG.conversationsStore)) {
          db.createObjectStore(CFG.conversationsStore, { keyPath: "id" });
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
    return _dbPromise;
  }

  function idbRequest(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function withStore(mode, fn) {
    return openDb().then((db) => {
      const tx = db.transaction(CFG.conversationsStore, mode);
      const store = tx.objectStore(CFG.conversationsStore);
      return fn(store, tx).then((result) => result);
    });
  }

  /** Fallback mirror of conversations in localStorage when IndexedDB is unavailable. */
  const LS_FALLBACK_KEY = "scc:conversations";

  function readFallback() {
    try {
      return JSON.parse(localStorage.getItem(LS_FALLBACK_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function writeFallback(convs) {
    try {
      localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(convs));
    } catch (e) {
      /* storage full or private mode — ignore */
    }
  }

  Storage.indexedDBSupported = function () {
    return "indexedDB" in window;
  };

  Storage.getAllConversations = function () {
    if (!Storage.indexedDBSupported()) return Promise.resolve(readFallback());
    return withStore("readonly", (store) => idbRequest(store.getAll())).then(
      (rows) => (rows || []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    );
  };

  Storage.getConversation = function (id) {
    if (!Storage.indexedDBSupported()) {
      return Promise.resolve(readFallback().find((c) => c.id === id) || null);
    }
    return withStore("readonly", (store) => idbRequest(store.get(id)));
  };

  Storage.putConversation = function (conversation) {
    if (!Storage.indexedDBSupported()) {
      const all = readFallback();
      const idx = all.findIndex((c) => c.id === conversation.id);
      if (idx >= 0) all[idx] = conversation;
      else all.push(conversation);
      writeFallback(all);
      return Promise.resolve();
    }
    return withStore("readwrite", (store) => idbRequest(store.put(conversation)));
  };

  Storage.deleteConversation = function (id) {
    if (!Storage.indexedDBSupported()) {
      writeFallback(readFallback().filter((c) => c.id !== id));
      return Promise.resolve();
    }
    return withStore("readwrite", (store) => idbRequest(store.delete(id)));
  };

  Storage.deleteAllConversations = function () {
    if (!Storage.indexedDBSupported()) {
      writeFallback([]);
      return Promise.resolve();
    }
    return withStore("readwrite", (store) => idbRequest(store.clear()));
  };

  /* ---------------- Settings (localStorage) ---------------- */

  Storage.loadSettings = function () {
    try {
      const raw = localStorage.getItem(SETTINGS_STORE);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      /* ignore corrupt settings */
    }
    return {};
  };

  Storage.saveSettings = function (settings) {
    try {
      localStorage.setItem(SETTINGS_STORE, JSON.stringify(settings));
    } catch (e) {
      /* ignore */
    }
  };

  /* ---------------- API key vault (localStorage) ----------------
     Keys are stored as opaque references. They never live inside
     conversation objects. The user is warned that browser storage is
     not a hardware-backed vault. */

  Storage.loadKeys = function () {
    try {
      const raw = localStorage.getItem(KEYS_STORE);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  };

  function persistKeys(vault) {
    try {
      localStorage.setItem(KEYS_STORE, JSON.stringify(vault));
    } catch (e) {
      /* ignore */
    }
  }

  Storage.setKey = function (ref, value) {
    const vault = Storage.loadKeys();
    vault[ref] = value;
    persistKeys(vault);
  };

  Storage.getKey = function (ref) {
    if (!ref) return null;
    const vault = Storage.loadKeys();
    return vault[ref] || null;
  };

  Storage.deleteKey = function (ref) {
    const vault = Storage.loadKeys();
    if (vault[ref]) delete vault[ref];
    persistKeys(vault);
  };

  /** True when a stored key value exists for the reference. */
  Storage.hasKey = function (ref) {
    return Boolean(ref && Storage.getKey(ref));
  };

  Storage.clearKeys = function () {
    try {
      localStorage.removeItem(KEYS_STORE);
    } catch (e) {
      /* ignore */
    }
  };

  window.SeedChatStorage = Storage;
})();
