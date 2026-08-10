# Seed Code Chat — Data Model

## Conversation

```js
{
  id,
  title,
  createdAt,
  updatedAt,
  model,
  provider,
  messages: []
}
```

## Message

```js
{
  id,
  role: "user" | "assistant" | "system",
  content,
  createdAt,
  status,
  attachments: []
}
```

## Provider configuration

```js
{
  id,
  provider,
  label,
  apiKeyReference,
  enabled,
  isDefault,
  createdAt
}
```

Never put raw API keys inside conversation objects.

## Persistence

Prototype:
- localStorage for small preferences
- IndexedDB for larger chat histories

Production:
- authenticated server database

## Export

Plan support for:
- JSON export
- Markdown export
- conversation deletion
