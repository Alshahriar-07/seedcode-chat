# 🌱 Seed Code Chat

> A clean, modern and responsive AI chat platform built with Vanilla JavaScript, designed to provide a smooth ChatGPT-style conversational experience with the Seed Code visual identity.

**Seed Code Chat** is a general-purpose AI assistant for everyday questions, coding, learning, writing, brainstorming and productivity.

It is designed to feel simple for normal users while still providing useful tools and model controls for developers and power users.

---

## ✨ Overview

Seed Code Chat combines a lightweight frontend with a server-side AI gateway to communicate with AI providers securely.

The application focuses on:

- ⚡ Fast AI responses
- 💬 Natural conversational experience
- 🧠 Multiple AI model support
- 🔐 Secure server-side API handling
- 👤 User authentication
- ☁️ Cloud-ready deployment
- 📱 Mobile + desktop responsive design
- 🎨 Premium Seed Code UI
- ✨ Smooth page and response animations
- 💾 Persistent conversation history
- ⚙️ Flexible model and generation settings

The goal is simple:

> **Make AI chat powerful without making the interface complicated.**

---

# 🚀 Features

## 💬 AI Chat

Seed Code Chat provides a modern conversational interface similar to popular AI assistants.

Supported functionality includes:

- New conversations
- Multiple messages per conversation
- Continuous conversations
- Streaming AI responses
- Markdown rendering
- Code block rendering
- Syntax highlighting
- Copy response
- Copy code
- Regenerate response
- Automatic scrolling
- Message timestamps
- Model information
- Provider information
- Error handling

---

## 🤖 AI Model Selection

Users can select available AI models directly from the chat interface.

The model selector is designed around:

- Searchable/selectable model lists
- Provider grouping
- Free model support
- Model names
- Model identifiers
- Model descriptions where available
- Easy switching between models

The application should never unnecessarily change the model selected by the user.

If a selected model becomes unavailable, the application should report the problem clearly instead of silently changing the user's model.

---

# 🌐 AI Providers

Seed Code Chat is designed around a provider-based architecture.

Currently supported or planned providers may include:

- OpenRouter
- FreeModel.dev
- AeroLink
- Other compatible providers

Provider configuration should remain isolated from the main UI.

The frontend should not contain provider secrets.

---

# 🔑 OpenRouter API System

OpenRouter is used as one of the primary AI gateways.

The backend can support multiple OpenRouter API keys.

Example environment configuration:

```env
OPENROUTER_API_KEY_1=your_key_here
OPENROUTER_API_KEY_2=your_key_here
OPENROUTER_API_KEY_3=your_key_here
OPENROUTER_API_KEY_4=your_key_here
OPENROUTER_API_KEY_5=your_key_here
OPENROUTER_API_KEY_6=your_key_here
---
```
# 🔄 API Key Fallback
```bash
KEY 1
  ↓
success → return response

failure
  ↓
KEY 2
  ↓
success → return response

failure
  ↓
KEY 3
  ↓
success → return response

failure
  ↓
KEY 4
  ↓
success → return response

failure
  ↓
KEY 5
  ↓
success → return response

failure
  ↓
KEY 6
  ↓
success → return response

failure
  ↓
clean final error

---
```
# 🔐 Security
```bash
Browser
   │
   │ POST /api/chat
   ▼
Seed Code Backend
   │
   │ Server-side API key
   ▼
AI Provider
   │
   ▼
AI Response
   │
   ▼
Backend
   │
   ▼
Browser

---
```
