# Seed Code Chat — API Key Handling

## Default keys

The requested initial configuration may contain:
- one OpenRouter default API configuration restricted to free models

Because these are shipped to a browser, assume they are publicly recoverable.

They must therefore be treated as public/shared credentials, not secrets.

## Production recommendation

For a deployed production system:

```text
Browser
  ↓
Seed Code Backend
  ↓
Provider API
```

Keep service-owned secrets on the backend.

## User API keys

A user can configure:
- OpenRouter
- AeroLink
- other supported custom providers

The UI should provide:
- password-style input
- show/hide button
- test connection
- save
- remove
- active/inactive toggle

Do not display a complete stored key after saving.

## Local storage

If local storage is supported, explicitly tell the user that browser storage is not equivalent to a hardware-backed secret vault.

Never write API keys to console logs, analytics, crash reports, or chat history.
