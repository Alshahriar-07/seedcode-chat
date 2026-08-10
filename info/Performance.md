# Seed Code Chat — Performance

## Goals

- Fast first paint
- Minimal JavaScript blocking
- Smooth scrolling
- No unnecessary re-rendering
- Efficient chat history loading
- Efficient streaming updates

## Rules

- Lazy-load non-critical modules
- Avoid huge third-party libraries
- Debounce search
- Batch streaming DOM updates
- Virtualize very long histories if necessary
- Compress production assets
- Cache static assets
- Avoid continuous expensive animations

## Streaming

Do not rebuild the entire message list for every token/chunk.

Update only the active assistant message.
