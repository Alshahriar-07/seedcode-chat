# Seed Code Chat — Testing Strategy

## Unit tests

Test:
- provider adapter normalization
- fallback classification
- model filtering
- storage serialization
- message state
- settings validation

## Integration tests

Test:
- OpenRouter success
- OpenRouter quota → retry/fallback
- invalid user key
- model unavailable
- stream interruption
- chat persistence

## UI tests

Test:
- new chat
- sending
- stopping generation
- regenerate
- copy code
- settings
- provider selection
- mobile sidebar
- responsive composer

## Manual checklist

- Fresh browser
- Empty state
- Long response
- Very long code block
- Offline state
- Slow network
- Mobile viewport
- Reduced motion
- Keyboard-only navigation
