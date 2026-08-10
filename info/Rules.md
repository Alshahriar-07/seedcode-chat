# Seed Code Chat — Non-Negotiable Rules

1. Frontend uses HTML, CSS and Vanilla JavaScript.
2. The app is a general AI chatbot, not a CLI UI transplanted to the web.
3. Seed Code gets its own visual identity.
4. Keep the interface clean and readable.
5. Avoid random particles, floating squares and visual clutter.
6. Prefer selection controls over manual typing.
7. Provider-specific code belongs in provider adapters.
8. The chat UI must not contain provider-specific API logic.
9. Default routing is OpenRouter (free models only).
10. Never automatically switch to a paid fallback model.
11. User API providers must be configurable from Settings.
12. Never log API keys.
13. Never store raw keys in conversation data.
14. Never render unsanitized model HTML.
15. Keep animations subtle and purposeful.
16. Respect reduced-motion preferences.
17. Mobile must be a first-class layout.
18. Do not break existing functionality when adding a provider.
19. Avoid unnecessary dependencies.
20. Do not claim browser-shipped default API keys are secret.
