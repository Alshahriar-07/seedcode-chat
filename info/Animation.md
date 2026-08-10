# Seed Code Chat — Animation System

## Philosophy

Animation should communicate state and hierarchy, not exist as decoration.

## Recommended motion

- Sidebar open/close: 180–240ms
- Modal/drawer: 180–260ms
- Message appearance: 120–220ms
- Button press: 80–140ms
- Dropdown: 120–180ms

Use smooth easing with restrained movement.

## Interactive details

- Buttons subtly change elevation/contrast on hover
- Selected provider gets a clear active state
- Model selector has a polished open/close transition
- Send button reacts immediately
- Streaming state has a subtle live indicator
- Skeleton/loading states should be calm

## Reduced motion

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

Disable or minimize non-essential animation.
