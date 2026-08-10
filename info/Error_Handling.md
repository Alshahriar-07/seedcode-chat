# Seed Code Chat — Error Handling

## Error categories

- Network error
- Authentication error
- Invalid API key
- Rate limit
- Quota exhausted
- Provider unavailable
- Model unavailable
- Unsupported capability
- Request validation error
- Streaming interruption

## User-facing behavior

Example:

```text
OpenRouter is temporarily unavailable.
Trying your fallback model…
```

For an invalid user API key:

```text
This provider could not authenticate.
Check the API key or test the connection again.
```

Never expose raw secrets or unnecessary stack traces.

## Retry

Automatic retry should be limited and controlled.

Fallback should only happen for recognized transient/quota/provider failures.
