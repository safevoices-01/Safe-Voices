# feat-0007: Tech Spec — General AI chat (demo)

## Context

See [`PRODUCT.md`](./PRODUCT.md). Demo chat is the **`reportingMode: false`** path through shared `@safevoices/ai/chat-post` helpers. Entry: `apps/web/app/api/chat/route.ts`. UI: `apps/web/app/[locale]/chat/page.tsx` when `searchParams.caseId` is empty.

## Route map

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| `POST` | `/api/chat` | None | `parseChatRequestBody` → `createChatStreamResponse(messages, { locale })` |

Hono equivalent: `apps/api/src/server.ts` — same parse/stream without locale pass-through today (**minor gap**: Hono calls `createChatStreamResponse(parsed.messages)` without `locale` option).

## Request / response

### Request body

```json
{
  "messages": [ /* UIMessage[] */ ],
  "clientRequestId": "uuid-optional",
  "locale": "en"
}
```

Parsed by `parseChatRequestBody` in `packages/ai/src/chat-post.ts`:

| Field | Validation |
|-------|------------|
| `messages` | Required array; max count `SAFEVOICES_CHAT_MAX_MESSAGES` (default 40) |
| Per-message size | JSON string length ≤ `SAFEVOICES_CHAT_MAX_CHARS_PER_MESSAGE` (default 12000) |
| `locale` | Optional `'en' \| 'ar'` |
| `clientRequestId` | Optional string (ignored in demo mode) |

### Response

- Success: `streamText` → `toUIMessageStreamResponse()` (SSE / UI message stream).
- Missing key: 503 JSON `{ error: 'Missing AI_GATEWAY_API_KEY...' }` via `missingGatewayKeyResponse()`.
- Disabled: 503 when `SAFEVOICES_CHAT_DISABLED === 'true'`.

## System prompt and model

```ts
// packages/ai/src/chat.ts
export const CHAT_SYSTEM_PROMPT_EN = `You are the Safe Voices assistant...`;
export const CHAT_SYSTEM_PROMPT_AR = `أنت مساعد Safe Voices...`;
export function getChatSystemPrompt(locale: ChatLocale = 'en'): string;
export function getChatModelId(): string; // SAFEVOICES_CHAT_MODEL || anthropic/claude-sonnet-4-5
```

`createChatStreamResponse` uses `getChatSystemPrompt(locale)` when `reportingMode` is false. Crisis injection is **not** applied in demo mode.

## Web client (`chat/page.tsx`)

| Concern | Implementation |
|---------|----------------|
| Chat hook | `useChat` from `@ai-sdk/react` |
| Transport | `DefaultChatTransport({ api: '/api/chat' })` when `!reportingMode` |
| Locale | `prepareSendMessagesRequest` adds `locale` from `useLocale()` |
| Seed messages | `WELCOME_MESSAGE_ID = 'seed-sv-welcome'` |
| Demo banner | `t.rich('demoBanner')` with link to `/access` |
| Branch | `reportingMode = caseId.length > 0` |

## Module map

| File | Role |
|------|------|
| `apps/web/app/api/chat/route.ts` | Next POST handler |
| `apps/web/app/[locale]/chat/page.tsx` | Demo + reporting UI |
| `apps/web/app/[locale]/chat/layout.tsx` | Full-height shell, metadata |
| `packages/ai/src/chat-post.ts` | Parse, limits, stream factory |
| `packages/ai/src/chat.ts` | Prompts, model id, extraction field constants |
| `packages/ai/src/index.ts` | Package exports |
| `apps/api/src/server.ts` | Hono demo chat |

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `AI_GATEWAY_API_KEY` | — | **Required** for streaming |
| `SAFEVOICES_CHAT_MODEL` | `anthropic/claude-sonnet-4-5` | Model id for gateway |
| `SAFEVOICES_CHAT_MAX_MESSAGES` | `40` | Request validation cap |
| `SAFEVOICES_CHAT_MAX_CHARS_PER_MESSAGE` | `12000` | Per-message size cap |
| `SAFEVOICES_CHAT_DISABLED` | `false` | Kill switch |

Documented in `apps/web/.env.example` and `apps/api/.env.example`.

## Dependencies

| Package | Usage |
|---------|--------|
| `ai` | `streamText`, `convertToModelMessages`, `UIMessage` |
| `@ai-sdk/react` | `useChat`, `DefaultChatTransport` |
| `@safevoices/ui` | `ChatContainer`, `Message`, `PromptInput`, `Loader` |

No `@safevoices/prisma` on demo route.

## Parity and gaps

| Item | Next demo | Notes |
|------|-----------|-------|
| Locale in stream options | Yes | Hono omits `locale` in handler |
| Persistence | None | By design |
| Stable error `code` | Plain `{ error }` | feat-0019 codes on case routes only |
| IP rate limit | None | Future |
| Integration test for `/api/chat` | None | Manual or add supertest |

## Testing

| Case | Command |
|------|---------|
| Reporting/crisis unit tests (shared package) | `pnpm --filter @safevoices/ai test` |
| Web typecheck | `pnpm --filter @safevoices/web run typecheck` |
| Manual | Open `/en/chat`, send message with key set |

No dedicated vitest for `route.ts`; validate via `parseChatRequestBody` behavior in package tests if added.

## Related

- [feat-0008 TECH](../feat-0008-reporting-chat-ai/TECH.md) — reporting branch same page
- [feat-0016 TECH](../feat-0016-hono-standalone-api/TECH.md) — Hono chat
- `.cursor/rules/vercel-ai-sdk-academy.mdc` — AI SDK patterns
- `.agents/skills/ai-sdk/SKILL.md` — API reference
