# Seed Code Chat — Project Documentation

Seed Code Chat is a general-purpose AI chat web application inspired by the usability of ChatGPT, Claude, and Gemini, with its own premium animated Seed Code visual identity.

## Core stack

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: lightweight API/proxy layer where required
- Storage: configurable local/browser storage initially; server database can be added later
- AI providers:
  - OpenRouter
  - AeroLink
  - User-custom providers/API keys

## Key product rule

The application should feel like a normal AI assistant, not a developer-only coding tool.

Users should be able to:
- Start chats
- Continue previous chats
- Select models from lists
- Attach files where supported
- Regenerate responses
- Copy code
- Change provider/model from settings
- Add their own provider/API credentials
- Configure generation preferences

No unnecessary manual typing should be required for provider/model configuration. Prefer dropdowns, cards, toggles, radio buttons, segmented controls, searchable selects, and file pickers.

## Default provider fallback

The initial product configuration contains one default API configuration:

1. OpenRouter — primary default, restricted to free models

When the OpenRouter free-model quota/request limit is exhausted or the provider returns a recognized quota/rate-limit failure, the application should automatically retry or surface the failure gracefully.

The exact API endpoints, authentication scheme, model IDs, quota semantics, and free-model availability must be configurable rather than hard-coded throughout the UI.

## Documentation map

- `PRD.md` — product requirements
- `Architecture.md` — system architecture
- `Design.md` — visual and interaction design
- `Frontend.md` — HTML/CSS/JS implementation rules
- `Backend.md` — backend/API gateway rules
- `Providers.md` — provider abstraction and fallback system
- `API_KEYS.md` — API key handling and security model
- `Data_Model.md` — chats, messages, settings and storage
- `UX_Flows.md` — major user journeys
- `Components.md` — reusable UI components
- `Animation.md` — animation and motion rules
- `Accessibility.md` — accessibility requirements
- `Performance.md` — performance requirements
- `Error_Handling.md` — error and fallback behavior
- `Testing.md` — testing strategy
- `Security.md` — security requirements
- `Roadmap.md` — implementation phases
- `Rules.md` — non-negotiable project rules
- `Memory.md` — persistent project decisions for AI coding agents
