# Seed Code Chat — Security Rules

## Critical

1. Never log API keys.
2. Never include API keys in chat history.
3. Never expose server-owned secrets to the browser.
4. Validate provider/model selection server-side when using a backend.
5. Apply rate limiting to public backend endpoints.
6. Sanitize/render Markdown safely.
7. Prevent unsafe HTML injection.
8. Treat uploaded files as untrusted.
9. Do not execute uploaded code automatically.
10. Do not trust provider metadata supplied by the browser.

## Frontend default keys

The requested default JavaScript API configurations are intentionally considered public/shared credentials once deployed. Do not represent them as private secrets.

## XSS

Markdown/code rendering must use a safe sanitizer or a carefully restricted renderer.

User content and model output must never be inserted into the DOM as unsanitized HTML.
