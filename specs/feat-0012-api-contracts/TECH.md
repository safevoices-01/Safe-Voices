# feat-0012: Tech Spec — API contracts (shared Zod schemas)

## Context

See [`PRODUCT.md`](./PRODUCT.md). Package `@safevoices/trpc` exports Zod schemas and `getApiHealth()`. It does **not** mount a tRPC server. Consumers: `apps/web/app/api/**`, `apps/api/src/server.ts`, and web tests.

## Stack

| Piece | Choice |
|-------|--------|
| Validation | Zod 3.x |
| Package name | `@safevoices/trpc` (historical; contracts-only) |
| Health helper | `getApiHealth(): { status: 'ok' }` |

## Public exports (`packages/trpc/src/index.ts`)

```ts
export { getApiHealth, type ApiHealth } from './health';
export * from './schemas';
```

## Schema reference (`packages/trpc/src/schemas.ts`)

### Errors

```ts
export const apiErrorSchema = z.object({
    error: z.string(),
    code: z.string().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
```

Next routes use `apiErrorResponse(code, status)` in `apps/web/lib/api-errors.ts`, which always sets **both** `code` and `error`:

```ts
return Response.json({ code, error: logMessage ?? code }, { status });
```

### Case lifecycle

| Export | Shape |
|--------|-------|
| `createCaseResponseSchema` | `{ caseId, secret, secretShownOnce?: true }` |
| `verifyCaseAccessRequestSchema` | `{ caseId: min(1), secret: min(1) }` |
| `verifyCaseAccessResponseSchema` | `{ ok: true, caseId, expiresAt }` |
| `submitCaseResponseSchema` | `{ ok: true, caseId, submittedAt }` |

### Chat and extraction

| Export | Shape |
|--------|-------|
| `postCaseChatMessageRequestSchema` | `{ messages: unknown[], clientRequestId?: string }` |
| `extractionPatchSchema` | `{ schemaVersion: number, fields: Record<string, unknown> }` |
| `postCaseChatMessageResponseMetaSchema` | `{ extraction?, crisisTriggered? }` |

### Upload

| Export | Shape |
|--------|-------|
| `uploadRequestSchema` | `{ filename, mimeType }` |
| `uploadResponseSchema` | `{ signedUrl, publicUrl }` |

## Consumer map

| Consumer | Schemas used |
|----------|--------------|
| `apps/web/app/api/cases/verify/route.ts` | `verifyCaseAccessRequestSchema` |
| `apps/api/src/server.ts` | `verifyCaseAccessRequestSchema` |
| `apps/web/components/auth/case-access-flow.test.ts` | `verifyCaseAccessRequestSchema` |
| `apps/web/lib/api-errors.ts` | Codes align with `apiErrorSchema.code` (not imported) |
| Other Next routes | Inline validation / `apiErrorResponse` (partial schema reuse) |

**Gap:** Not every route imports Zod schemas from this package yet; some validate ad hoc.

## Error codes (web — not in trpc package)

Defined in `apps/web/lib/api-errors.ts`:

| Code | Typical status |
|------|----------------|
| `INVALID_JSON` | 400 |
| `VERIFY_FAILED` | 401 |
| `VERIFY_LOCKED` | 429 |
| `SESSION_EXPIRED` | 401 |
| `CASE_SUBMITTED` / `CASE_SUBMITTED_READONLY` | 409 |
| `CASE_NOT_FOUND` | 404 |
| `CHAT_TOO_MANY_MESSAGES` / `CHAT_MESSAGE_TOO_LARGE` | 400 |
| `UPLOAD_UNSUPPORTED_TYPE` / `UPLOAD_NOT_CONFIGURED` | 400 / 503 |
| `CHAT_DISABLED` | 503 |

**Target:** export const object from `@safevoices/trpc` for single source of truth.

## What is NOT in this package

| Item | Location |
|------|----------|
| tRPC `initTRPC`, routers, procedures | Not implemented |
| HTTP server | `apps/web`, `apps/api` |
| Cookie session helpers | `apps/web/lib/case-access.ts` |
| Hono Bearer verify response `token` field | `apps/api/src/server.ts` only |

## Implementation status

| Item | Status |
|------|--------|
| Core Zod schemas | Complete |
| Exported TS types | Complete |
| `getApiHealth` | Complete |
| tRPC server | **Not planned in package** |
| All routes use shared parse | Partial |
| Hono uses `apiErrorSchema` shape | Partial (string errors only) |
| Central `API_ERROR_CODES` in trpc | Gap |

## Known gaps

| Gap | Notes |
|-----|-------|
| `verifyCaseAccessResponseSchema` omits Hono `token` | Document transport-specific extensions |
| Loose `messages: z.array(z.unknown())` | Defer strict AI SDK schema |
| Error codes live in web only | Duplication risk |
| No partner OTP / dashboard schemas | Future [feat-0006](../feat-0006-email-otp-partner-auth/TECH.md), [feat-0015](../feat-0015-investigator-dashboard/TECH.md) |
| No runtime response validation | Handlers don't `safeParse` outbound JSON |

## What's needed to make it work

| Step | Action |
|------|--------|
| 1 | Add `@safevoices/trpc` dependency to consuming apps (workspace `*`) |
| 2 | Import schemas in every route that accepts JSON bodies |
| 3 | On parse failure, return `apiErrorResponse('INVALID_JSON', 400)` |
| 4 | Move `API_ERROR_CODES` into trpc or re-export from web |
| 5 | Align Hono errors with `apiErrorSchema` + codes |
| 6 | Add client-side `safeParse` where forms mirror API bodies |
| 7 | Add contract tests: golden JSON fixtures per schema |

## Commands

```bash
pnpm --filter @safevoices/trpc run typecheck
```

## Testing

| Case | Location |
|------|----------|
| Verify schema | `apps/web/components/auth/case-access-flow.test.ts` |
| Package typecheck | CI via root `pnpm typecheck` |

## Related

- [feat-0005 TECH](../feat-0005-anonymous-case-access/TECH.md)
- [feat-0008 TECH](../feat-0008-reporting-chat-ai/TECH.md)
- [feat-0011 TECH](../feat-0011-data-layer/TECH.md)
- [feat-0016 TECH](../feat-0016-hono-standalone-api/TECH.md)
- [feat-0019 TECH](../feat-0019-api-errors-i18n/TECH.md)
