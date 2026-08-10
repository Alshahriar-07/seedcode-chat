# Seed Code Chat — Project Memory

## Product identity

Name: Seed Code Chat

Purpose: General-purpose AI chat website similar in usability category to ChatGPT, Claude, and Gemini.

## Frontend

HTML + CSS + Vanilla JavaScript.

## Provider decisions

Supported:
- OpenRouter
- AeroLink
- User custom provider/API configuration

Default:
- OpenRouter as primary
- Default provider must use free OpenRouter models only

## Configuration UX

The user explicitly wants selection-based configuration wherever possible.

Use:
- dropdowns
- cards
- toggles
- sliders
- searchable lists
- file pickers

Minimize manual typing.

## Visual direction

Premium, animated, interactive, black/white/metallic Seed Code style.

Do not fill the UI with random decorative particles or floating shapes.

## Security decision

The requested default API configurations may live in frontend JavaScript and therefore must be treated as public/shared credentials. Production architecture should move private service credentials behind a backend.

## AI agent instruction

Before implementing a feature, read the relevant documentation files and preserve these decisions unless the user explicitly changes them.
