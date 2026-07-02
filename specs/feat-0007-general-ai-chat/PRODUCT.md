# feat-0007: General AI chat (demo)

## Summary

**Safe Voices** offers a **general-purpose AI assistant** on `/{locale}/chat` when no `caseId` query parameter is present. Visitors can ask how anonymous reporting works, what to include in a report, and how tracking codes are used — without creating a case or signing in.

The assistant uses a **non-investigative system prompt** (`CHAT_SYSTEM_PROMPT` / locale-specific variants) and streams responses via the Vercel AI SDK. It is explicitly a **demo / education** mode: a banner directs users to `/{locale}/access` to start a secure report.

**Completion (product):** streaming chat works end-to-end with `AI_GATEWAY_API_KEY`; no case session required; bilingual prompts (en / ar) when locale is sent in the request body.

Complements [feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md) (case-scoped reporting chat), [feat-0001](../feat-0001-i18n/PRODUCT.md) (locale), and [feat-0014](../feat-0014-ui-kit/PRODUCT.md) (chat UI primitives).

## Problem

Prospective reporters and partners need low-friction answers before committing to anonymous case creation. A separate **general** chat mode avoids mixing educational Q&A with persisted report intake, crisis extraction, and submit lifecycle. Without this spec, engineers may accidentally enable reporting persistence or case APIs on the public demo path.

## Non-goals

- Persisting demo conversations to the database.
- Case creation, extraction, crisis panels, or submit from demo mode.
- End-user model or API key selection (server env only; see `.cursor/rules/chat-zola-prompt-kit.mdc`).
- Legal, medical, or definitive case judgments in copy or model behavior.
- Partner / investigator authenticated chat.
- File upload persistence in demo mode (images may send as inline data URLs in the UI transport but are not stored server-side for demo chat).

## Figma

Figma: none provided. Baseline: Zola-inspired layout — sidebar, header with language switcher, welcome message, suggestion chips, prompt-kit input with attach/voice affordances (shared shell with reporting mode).

## Actors

| Actor | Description |
|-------|-------------|
| **Visitor** | Opens `/chat` without `caseId`; asks general reporting questions. |
| **Returning visitor** | Same; history lives in browser session only (useChat state). |
| **Platform** | Runs `POST /api/chat` with gateway model and system prompt. |

## Demo vs reporting mode (product)

| Aspect | Demo (feat-0007) | Reporting (feat-0008) |
|--------|------------------|------------------------|
| URL | `/chat` | `/chat?caseId=SV-…` |
| API | `POST /api/chat` | `POST /api/cases/:caseId/chat` |
| Session | None | `sv_case_session` cookie |
| System prompt | `getChatSystemPrompt(locale)` | `buildReportingSystemPrompt(...)` |
| Persistence | None | Case messages + extraction |
| Banner | Demo → link to `/access` | Progress, crisis, submit |
| Input after submit | N/A | Disabled (feat-0009) |

## Use case catalog

### A. Entry and discovery

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Open demo chat | — | Nav to `/chat` or marketing CTA | Welcome assistant message |
| **UC-A02** | See demo banner | No `caseId` | Page load | Banner with link to `/access` |
| **UC-A03** | Switch language | feat-0001 | Language switcher | UI + `locale` in chat requests |
| **UC-A04** | Suggestion chips | Welcome state only | Tap suggestion | Message sent |

### B. Conversation

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Send text message | Input non-empty; not streaming | Submit / Enter | User bubble + streamed assistant reply |
| **UC-B11** | Stop generation | Streaming | Stop button | Stream halted |
| **UC-B12** | Empty send | Blank input | Submit | Ignored |
| **UC-B13** | Thinking indicator | Request in flight | — | Typing loader until first token |
| **UC-B14** | Markdown reply | Assistant responds | — | Rendered markdown in assistant bubble |
| **UC-B15** | Error display | API failure | — | Error strip with dismiss |

### C. Multimodal affordances (shared UI)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Attach image | Demo mode | Image picker → send | Inline preview in user message (client transport) |
| **UC-C21** | Voice input | Browser supports SpeechRecognition | Mic → transcript in input | Text editable before send |
| **UC-C22** | Voice unavailable | No API | Mic click | Toast error |

Demo chat does **not** upload images to Supabase ([feat-0010](../feat-0010-evidence-upload-storage/PRODUCT.md)).

### D. Server and configuration

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D30** | Chat enabled | `AI_GATEWAY_API_KEY` set | POST messages | 200 stream |
| **UC-D31** | Missing gateway key | Key absent | POST | 503 with setup message |
| **UC-D32** | Chat disabled | `SAFEVOICES_CHAT_DISABLED=true` | POST | 503 unavailable |
| **UC-D33** | Payload limits | Too many/large messages | POST | 400 |

### E. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-E40** | Invalid JSON body → 400 |
| **UC-E41** | Refresh page → conversation cleared (no server history) |
| **UC-E42** | Arabic locale → assistant instructed to reply in MSA Arabic |
| **UC-E43** | `caseId` empty string → treated as demo mode |

## Behavior (product rules)

1. **No case session:** Demo chat never reads or writes `sv_case_session` or case store.

2. **Locale in body:** Client sends `locale: 'en' | 'ar'` on each request (`prepareSendMessagesRequest` in chat page); server selects `getChatSystemPrompt(locale)`.

3. **Educational tone:** System prompt forbids legal/medical advice and definitive judgments; encourages official channels.

4. **Secrets on server:** Model ID from `SAFEVOICES_CHAT_MODEL` env; gateway key never exposed to browser.

5. **Shared chat page:** `apps/web/app/[locale]/chat/page.tsx` branches on `caseId` search param; demo rules apply when absent.

6. **Hono parity:** `apps/api` exposes `POST /api/chat` with same shared handler ([feat-0016](../feat-0016-hono-standalone-api/PRODUCT.md)).

7. **Welcome seed:** Fixed assistant welcome message id `seed-sv-welcome`; not persisted.

## What's needed to work

| Requirement | Purpose |
|-------------|---------|
| `pnpm dev:web` | Run Next app |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway / model access |
| Optional `SAFEVOICES_CHAT_MODEL` | Override default `anthropic/claude-sonnet-4-5` |
| Optional limits env | `SAFEVOICES_CHAT_MAX_MESSAGES`, `SAFEVOICES_CHAT_MAX_CHARS_PER_MESSAGE` |

Without gateway key, chat returns 503 and UI shows error.

## Status

| Area | Status |
|------|--------|
| `POST /api/chat` | **Complete** |
| Streaming UI (`useChat` + transport) | **Complete** |
| Locale-aware system prompt | **Complete** |
| Demo banner + suggestions | **Complete** |
| Hono `POST /api/chat` | **Complete** ([feat-0016](../feat-0016-hono-standalone-api/PRODUCT.md)) |
| Automated route integration tests | **Minimal** (package-level parse tests only) |

## Open questions

1. Should demo chat log analytics (no PII)? **Default:** optional metrics later.

2. Rate limit demo chat by IP? **Default:** yes in production; not implemented.

3. Separate welcome copy per locale in JSON only? **Default:** yes via `messages/{locale}.json` `chat.welcome`.

## Related

- [feat-0008 PRODUCT](../feat-0008-reporting-chat-ai/PRODUCT.md) — reporting mode on same page
- [feat-0016 PRODUCT](../feat-0016-hono-standalone-api/PRODUCT.md) — standalone API chat
- [feat-0014 PRODUCT](../feat-0014-ui-kit/PRODUCT.md) — prompt-kit components
- `docs/chat-experience-spec.md` — UX quality bar
- `specs/AI_CHATBOT_SPEC.md` — legacy broad reference
