# Seed Code Chat — UX Flows

## First visit

```text
Open Seed Code Chat
      ↓
Welcome screen
      ↓
Composer ready
      ↓
User sends message
      ↓
OpenRouter
      ↓
Response
```

No mandatory setup screen.

## Provider setup

```text
Settings
  ↓
AI Providers
  ↓
Choose provider card
  ↓
Enter API key
  ↓
Test
  ↓
Choose model
  ↓
Save
```

## Fallback

```text
Generate
   ↓
OpenRouter free model
   ↓
quota error
   ↓
Show subtle status: "Switching to fallback..."
   ↓
OpenRouter free model
   ↓
Continue response
```

## New chat

New Chat should immediately create a clean conversation state without forcing the user through a setup wizard.

## Mobile

```text
Menu → sidebar drawer
Settings → full-screen/large drawer
Composer → fixed bottom region
Model → compact selector
```
