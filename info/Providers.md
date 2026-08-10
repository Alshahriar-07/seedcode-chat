# Seed Code Chat — Provider System

## Supported providers

Initial provider catalog:

1. OpenRouter
2. AeroLink
3. Custom provider

## Provider object

Each provider should have metadata:

```js
{
  id,
  name,
  icon,
  description,
  authType,
  models,
  capabilities,
  enabled
}
```

## Model object

```js
{
  id,
  name,
  provider,
  free,
  contextWindow,
  capabilities
}
```

## Default routing

```text
OpenRouter
     │
     ├── success → use response
     │
     └── quota/rate limit/unavailable
                     ↓
              OpenRouter
                     ↓
                FREE models
```

Only models explicitly marked/verified as free should be selected by the automatic OpenRouter fallback.

Do not silently switch to a paid OpenRouter model.

## User provider

Settings → Providers → Add Provider

Prefer a guided flow:

```text
Choose Provider
      ↓
Choose authentication method
      ↓
API key input
      ↓
Fetch/choose models
      ↓
Test connection
      ↓
Save
```

For known providers, show predefined forms. Do not ask users to manually type provider names or model IDs.

## Provider priority

Allow users to choose:
- Primary provider
- Fallback provider
- Disabled providers

But the default installation should retain OpenRouter (free models only) as the primary provider.

## Failure classification

Fallback-worthy:
- Quota exceeded
- Rate limit
- Provider temporarily unavailable
- Provider timeout
- Service unavailable

Usually not fallback-worthy:
- Invalid prompt/content rejection
- malformed local request
- user configuration error
- unsupported feature
