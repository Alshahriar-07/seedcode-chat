# Seed Code Chat — Frontend Rules

## Stack

Use:
- HTML5
- CSS3
- Vanilla JavaScript

Do not introduce React, Vue, Angular, or another frontend framework unless the project requirements are explicitly changed.

## HTML

Use semantic elements:
- `header`
- `nav`
- `main`
- `aside`
- `section`
- `form`
- `button`
- `dialog`

Interactive elements must be real buttons/inputs, not clickable generic divs.

## CSS

Use CSS custom properties for the design system.

Prefer:
- CSS Grid
- Flexbox
- `clamp()`
- `min()`
- `max()`
- logical spacing
- responsive media queries

Avoid hard-coded styles scattered across files.

## JavaScript

Use ES modules where supported.

Keep modules focused:
- UI rendering
- State
- Provider APIs
- Storage
- Chat logic
- Settings

Never put the entire application in one huge JavaScript file.

## UI selection rule

Whenever a finite choice exists, provide a selectable UI control.

Examples:
- Provider → cards/dropdown
- Model → searchable dropdown
- Theme → segmented control
- Temperature → slider
- Streaming → toggle
- Message actions → icon buttons

Users should not need to type a provider/model identifier.

## Error UX

Errors must appear in context and explain the next action.

Never show raw JSON as the primary user-facing error.

## Accessibility

- Keyboard navigation
- Visible focus states
- ARIA labels where necessary
- Reduced-motion support
- Sufficient contrast
- Screen-reader-friendly buttons
