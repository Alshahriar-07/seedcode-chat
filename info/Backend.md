# Seed Code Chat — Backend

## Purpose

The backend is optional for a local/prototype frontend but strongly recommended for production.

Responsibilities:
- API proxying
- Provider normalization
- Rate limiting
- Abuse prevention
- Server-side secret storage
- Request validation
- Streaming relay
- Usage logging without storing unnecessary sensitive content

## Rule

The frontend must never assume that a provider API key is secret if it is shipped in JavaScript.

For user-supplied keys:
- Store locally only when the user explicitly chooses local storage.
- Prefer encrypted/server-side storage for authenticated production accounts.
- Never log raw keys.
- Never send a user's key to an unrelated provider.

## API shape

Conceptually:

```text
POST /api/chat
{
  provider,
  model,
  messages,
  generation
}
```

Response:
- streaming event stream where supported
- normalized errors
- provider metadata when useful

## Provider-specific details

Keep endpoint URLs, headers, authentication rules, and request transformations inside provider adapters.

Do not spread provider-specific conditionals across UI code.
