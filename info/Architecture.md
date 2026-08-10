# Seed Code Chat — Architecture

## 1. Architecture principle

Use a clean separation between presentation, application state, provider adapters, persistence, and optional backend services.

```text
Browser
  │
  ├── UI Layer
  │    ├── HTML
  │    ├── CSS
  │    └── JavaScript
  │
  ├── Chat State
  │    ├── conversations
  │    ├── messages
  │    ├── settings
  │    └── active provider/model
  │
  ├── Provider Router
  │    ├── OpenRouter
  │    ├── AeroLink
  │    └── Custom Provider
  │
  └── Persistence
       └── localStorage / IndexedDB

Optional/Recommended:
Browser → Backend Proxy → Provider APIs
```

## 2. Frontend structure

Recommended structure:

```text
/
├── index.html
├── assets/
│   ├── icons/
│   └── fonts/
├── css/
│   ├── base.css
│   ├── variables.css
│   ├── layout.css
│   ├── components.css
│   ├── chat.css
│   ├── settings.css
│   └── animations.css
├── js/
│   ├── app.js
│   ├── state.js
│   ├── router.js
│   ├── chat.js
│   ├── renderer.js
│   ├── storage.js
│   ├── settings.js
│   ├── providers.js
│   ├── fallback.js
│   └── utils.js
└── docs/
```

A single-file build may be produced later, but development should remain modular.

## 3. State architecture

Maintain one central application state.

```js
state = {
  activeConversationId,
  conversations: [],
  activeProvider,
  activeModel,
  generation: {
    temperature,
    maxTokens,
    streaming
  },
  ui: {
    sidebarOpen,
    settingsOpen,
    theme
  },
  providers: []
}
```

UI components subscribe to state changes rather than directly modifying unrelated DOM elements.

## 4. Provider abstraction

Every provider should expose a common interface:

```text
getModels()
sendMessage()
streamMessage()
validateCredentials()
getCapabilities()
```

The rest of the application should not care about provider-specific request formats.

## 5. Request flow

```text
User sends message
       ↓
Validate current state
       ↓
Provider Router
       ↓
Primary provider
       ↓
Streaming response
       ↓
Renderer
       ↓
Persist messages
```

If a recognized quota/rate-limit failure occurs:

```text
Primary provider
      ↓
Quota / Rate Limit
      ↓
Fallback Resolver
      ↓
OpenRouter Free Model
      ↓
Retry
```

## 6. Backend

A backend is recommended for production API-key protection, rate limiting, abuse prevention, and provider normalization.

However, the product must support the requested frontend-default configuration where two default API configurations can exist in client-side JavaScript. The implementation must clearly separate public/default configuration from private user credentials.

Never claim a frontend-exposed key is secret.

## 7. Extensibility

New providers must be addable by implementing one adapter instead of changing the chat UI, renderer, or state system.
