# feat-0008: Tech Spec — Reporting chat and AI intake

## Context

See [`PRODUCT.md`](./PRODUCT.md). Reporting chat is **`reportingMode: true`** in `createChatStreamResponse`, invoked from `apps/web/app/api/cases/[caseId]/chat/route.ts` with case session cookie auth and `onFinish` persistence.

## Route map (Next.js)

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| `POST` | `/api/cases/[caseId]/chat` | `sv_case_session` cookie | Parse → stream → `appendChatTurn` |
| `GET` | `/api/cases/[caseId]/messages` | Same | List messages + extraction |
| `GET` | `/api/cases/session` | Cookie | Session meta + `submitted` + `caseStatus` |

Related (other feats): `POST /api/cases/verify`, `POST .../submit`, `POST .../upload`.

## POST `/api/cases/[caseId]/chat`

### Auth and guards

```ts
// apps/web/app/api/cases/[caseId]/chat/route.ts
const session = await resolveSession(token);
if (!session || session.caseId !== caseId) → 401 SESSION_EXPIRED
if (await isCaseSubmitted(caseId)) → 409 CASE_SUBMITTED_READONLY
await touchSession(session.token);
```

### Request body

Same shape as demo chat (`parseChatRequestBody`):

```json
{
  "messages": [ /* UIMessage[] */ ],
  "clientRequestId": "uuid",
  "locale": "en"
}
```

### Stream options

```ts
createChatStreamResponse(parsed.messages, {
    reportingMode: true,
    locale: parsed.locale ?? 'en',
    caseContext: { caseId, caseStatus, extraction: existingExtraction },
    onFinish: async ({ userText, assistantText, crisis, extractionPatch }) => {
        await store.appendChatTurn({ ... });
    },
});
```

### Response headers

- Stream body from AI SDK.
- Optional `x-sv-extraction`: base64url JSON of latest extraction after persist.

**Client gap:** `chat/page.tsx` does not read this header; extraction updates only on initial GET messages.

## GET `/api/cases/[caseId]/messages`

Returns:

```json
{
  "messages": [{ "id", "role", "content" }],
  "extraction": { "schemaVersion", "fields": { ... } }
}
```

Limit: 80 messages (`listMessages(caseId, 80)`).

## AI modules (`@safevoices/ai`)

| Module | Symbols |
|--------|---------|
| `reporting.ts` | `REPORTING_SYSTEM_PROMPT_*`, `buildReportingSystemPrompt`, `detectCrisisLanguage`, `mergeExtractionFromText`, `toExtractionPatch`, `getCrisisResources`, `CRISIS_KEYWORDS_*` |
| `chat-post.ts` | `createChatStreamResponse`, `parseChatRequestBody` |
| `chat.ts` | `REPORTING_EXTRACTION_FIELDS`, `REPORTING_EXTRACTION_SCHEMA_VERSION` |

### Crisis flow

1. `lastUserText(messages)` → `detectCrisisLanguage(text, locale)`.
2. If triggered, append safety instruction to system prompt before `streamText`.
3. `onFinish` → `appendChatTurn` with `crisisTriggered`, `crisisTriggerType`.

### Extraction merge (heuristic)

```ts
// packages/ai/src/reporting.ts — simplified
mergeExtractionFromText(existing, userText, assistantText)
// incidentDescription: first long user text
// location: regex on "at|in|near ..."
// riskLevel: urgent/danger/unsafe/threat keywords → 'high'
```

`toExtractionPatch` filters to `REPORTING_EXTRACTION_FIELDS` only.

## Persistence (`getCaseStore`)

`appendChatTurn` (Prisma implementation):

- Idempotency via unique `(caseId, clientReqId)` on `CaseMessage`.
- Creates user + assistant message rows in transaction.
- Upserts `CaseExtraction` JSON payload.
- Creates `CrisisEvent` when crisis triggered.

See `packages/prisma/src/prisma-case-store.ts`.

## Web UI

| File | Role |
|------|------|
| `app/[locale]/chat/page.tsx` | Mode switch, useChat transport, voice, attachments, submit handler |
| `components/chat/reporting-chat-extras.tsx` | Session alerts, crisis panel, progress, submit button |
| `@safevoices/ui` | `CrisisEscalationPanel`, `ReportingProgress`, chat primitives |

### Transport branch

```ts
api: reportingMode
    ? `/api/cases/${encodeURIComponent(caseId)}/chat`
    : '/api/chat',
prepareSendMessagesRequest: ({ messages, body }) => ({
    body: { ...body, messages, clientRequestId: crypto.randomUUID(), locale },
}),
```

### Voice

```ts
function speechLocale(locale: string): string {
    return locale === 'ar' ? 'ar-SA' : 'en-US';
}
```

Uses `window.SpeechRecognition` / `webkitSpeechRecognition`.

### Input gating

```ts
const inputDisabled = reportingMode && (!sessionOk || submitted || submitDone);
```

## Error codes ([feat-0019](../feat-0019-api-errors-i18n/TECH.md))

| Code | Status | When |
|------|--------|------|
| `SESSION_EXPIRED` | 401 | Bad/missing cookie or caseId mismatch |
| `CASE_SUBMITTED_READONLY` | 409 | Post-submit chat |
| `CHAT_TOO_MANY_MESSAGES` | 400 | Over limit |
| `CHAT_MESSAGE_TOO_LARGE` | 400 | Oversized message |
| `INVALID_JSON` | 400 | Bad body |

## Environment

| Variable | Purpose |
|----------|---------|
| `AI_GATEWAY_API_KEY` | Required for stream |
| `SAFEVOICES_CHAT_MODEL` | Model override |
| `SAFEVOICES_CHAT_MAX_*` | Limits |
| `SAFEVOICES_CHAT_DISABLED` | Kill switch |
| `SAFEVOICES_CRISIS_RESOURCES_JSON` | Optional locale-keyed resources array |
| `DATABASE_URL` | Persistence (else memory store per process) |
| `SAFEVOICES_SECRET_PEPPER` | Session/crypto |

## Hono parity ([feat-0016](../feat-0016-hono-standalone-api/TECH.md))

| Capability | Next | Hono |
|------------|------|------|
| Case chat auth | Cookie | Bearer |
| `reportingMode: true` | Yes | Yes |
| `appendChatTurn` | Yes | **No** |
| Submit guard | Yes | **No** |
| `x-sv-extraction` | Yes | **No** |
| Messages GET | Yes | **No** |

## Known gaps (audit)

| Gap | Notes |
|-----|-------|
| Client ignores `x-sv-extraction` | Refetch or decode header after stream |
| Inline file parts in useChat | Not persisted to `CaseAttachment` |
| `occurredAt` never heuristic-filled | Manual / future NLP |
| `attachments` extraction field | Not auto-populated |
| Hono incomplete parity | feat-0016 |
| Arabic crisis keywords subset | Expand with native review |
| Automated E2E reporting chat | None |

## Testing

```bash
pnpm --filter @safevoices/ai test
# reporting.test.ts: detectCrisisLanguage, mergeExtractionFromText, Arabic prompt

pnpm --filter @safevoices/web exec vitest run
pnpm --filter @safevoices/web run typecheck
```

Manual script:

1. Create case + verify via `/access`.
2. Open `/chat?caseId=…`.
3. Send incident description; confirm progress + DB messages.
4. Trigger crisis keyword; confirm panel.
5. Submit; confirm chat 409 and disabled input.

## Related

- [feat-0005 TECH](../feat-0005-anonymous-case-access/TECH.md) — session cookie
- [feat-0007 TECH](../feat-0007-general-ai-chat/TECH.md) — shared stream factory
- [feat-0009 TECH](../feat-0009-case-submit-lifecycle/TECH.md) — submit + read-only
- [feat-0010 TECH](../feat-0010-evidence-upload-storage/TECH.md) — upload API
- [feat-0011 TECH](../feat-0011-data-layer/TECH.md) — case store
- [feat-0012 TECH](../feat-0012-api-contracts/TECH.md) — Zod schemas
