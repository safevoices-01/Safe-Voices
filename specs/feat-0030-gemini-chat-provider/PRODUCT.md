# feat-0030: Google Gemini chat provider

## Summary

Safe Voices chat (demo + reporting) can use **Google Gemini** via the Generative Language API when `GOOGLE_GENERATIVE_AI_API_KEY` (or alias `GEMINI_API_KEY`) is set. Vercel AI Gateway remains supported when only `AI_GATEWAY_API_KEY` is present. Gemini is the **preferred** provider when a Gemini key is configured.

**Status:** Implemented.

Complements [feat-0007](../feat-0007-general-ai-chat/PRODUCT.md), [feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md), and [feat-0019](../feat-0019-api-errors-i18n/PRODUCT.md).

## Problem

Production and local chat depended on Vercel AI Gateway. Invalid or missing gateway keys blocked all assistant replies. Operators need a first-class Gemini path that matches Google’s `generateContent` API (e.g. `gemini-flash-latest`) without exposing keys to the browser.

## Non-goals

- Client-side Gemini calls (keys stay server-only).
- Multi-model routing UI for end users.
- Fine-tuning or Vertex AI enterprise setup (Generative Language API only for v1).

## Actors

| Actor | Description |
|-------|-------------|
| **Reporter / demo visitor** | Sends chat messages; sees streamed replies. |
| **Operator** | Sets Gemini or Gateway env vars; picks model id. |
| **Platform** | Selects provider at runtime; never returns keys in API errors. |

## Provider selection (product)

| Priority | Condition | Provider |
|----------|-----------|----------|
| 1 | `GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY` set | Google Gemini |
| 2 | `AI_GATEWAY_API_KEY` set | Vercel AI Gateway |
| 3 | Neither | Chat unavailable (`CHAT_UNAVAILABLE`) |

Default Gemini model: **`gemini-flash-latest`** (overridable via `SAFEVOICES_CHAT_MODEL`).

## Use cases

| ID | Use case | Flow | Postcondition |
|----|----------|------|---------------|
| **UC-01** | Gemini streaming | Key set; POST chat | Streamed assistant text |
| **UC-02** | Gateway fallback | Only gateway key | Existing gateway behavior |
| **UC-03** | No keys | Neither key | 503 `CHAT_UNAVAILABLE` |
| **UC-04** | Invalid Gemini key | Auth failure | Friendly chat error banner (no raw key text) |
| **UC-05** | Reporting + demo | Same provider for both modes | Locale prompts unchanged |

## Acceptance criteria

1. With a valid Gemini API key in env, demo and reporting chat stream replies.
2. No API key appears in client error UI or JSON error bodies.
3. Spec documents env vars and model override.
4. `.env.example` lists Gemini vars (placeholders only).

## Security

- Never commit real API keys.
- Rotate any key that was pasted into chat, tickets, or logs.

## Related

- [feat-0030 TECH](./TECH.md)
