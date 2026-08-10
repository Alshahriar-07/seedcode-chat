# Seed Code Chat — Product Requirements Document

## 1. Product

Seed Code Chat is a polished, general-purpose AI chat application. Its experience should be familiar to users of ChatGPT, Claude, and Gemini while remaining visually and technically distinct.

## 2. Goals

- Make AI chat immediately understandable.
- Keep the interface fast and uncluttered.
- Support multiple AI providers.
- Support automatic provider fallback.
- Let advanced users bring their own API credentials.
- Make provider/model selection visual and selectable rather than dependent on manual configuration.
- Deliver a premium animated Seed Code identity.

## 3. Primary users

- General AI users
- Students
- Developers
- Writers
- Researchers
- Users who want to connect their own AI provider

## 4. Core features

### Chat
- New conversation
- Streaming responses
- Markdown rendering
- Code syntax highlighting
- Copy buttons
- Regenerate response
- Stop generation
- Edit and resend user messages
- Conversation title generation
- Conversation search
- Rename/delete/archive conversations

### Provider/model
- Provider selector
- Model selector
- Provider capability metadata
- Free-model filtering
- Automatic fallback
- Custom provider configuration
- User API key management
- Provider enable/disable toggle

### Settings
All common configuration should use UI controls:
- Dropdowns
- Toggles
- Sliders
- Radio cards
- Searchable selects
- File pickers
- Buttons

Avoid requiring users to type provider names/model IDs manually.

## 5. Default routing

Primary:
`OpenRouter → free models only`

Fallback:
`OpenRouter → free models only`

Fallback should occur for quota/rate-limit/provider-unavailable conditions, not for ordinary model-content errors.

## 6. Non-goals for first release

- Full autonomous coding agent
- Complex IDE
- Multi-user enterprise administration
- Training custom models
- Self-hosted GPU orchestration

## 7. Success criteria

A new user should be able to open the site and send a message without configuring anything.

An advanced user should be able to open Settings → Providers, select a provider, enter/import its API key, select a model from the available list, save it, and use it without touching source code.
