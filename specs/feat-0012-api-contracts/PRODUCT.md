# feat-0012: API contracts (shared Zod schemas)

## Summary

**Safe Voices** defines **request and response shapes** for reporting APIs as **Zod schemas** in `@safevoices/trpc`. Despite the package name, there is **no live tRPC HTTP server** — only shared types, `getApiHealth()`, and schemas consumed by Next.js App Router routes, Hono (`feat-0016`), and client-side validation tests.

**Implemented today:** `apiErrorSchema` (with optional `code`), case create/verify, chat message, extraction patch, submit, and upload schemas with exported TypeScript types.

Complements [feat-0019](../feat-0019-api-errors-i18n/PRODUCT.md) (stable error codes on Next), [feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md), [feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md), [feat-0009](../feat-0009-case-submit-lifecycle/PRODUCT.md), and [feat-0010](../feat-0010-evidence-upload-storage/PRODUCT.md).

## Problem

Without a single contract package, Next routes, Hono, and the web client can drift (field names, error shape, optional flags). Product and QA need a catalog of **stable JSON bodies** and error codes for i18n and testing, independent of transport (cookies vs Bearer).

## Non-goals

- tRPC router, procedures, or React Query integration.
- OpenAPI / JSON Schema generation (future).
- GraphQL types.
- Investigator dashboard APIs ([feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md)).
- Partner OTP request schemas (mock in web today; [feat-0006](../feat-0006-email-otp-partner-auth/PRODUCT.md)).

## Actors

| Actor | Description |
|-------|-------------|
| **API implementer** | Parses bodies with Zod in route handlers. |
| **Web client** | May reuse schemas for client-side validation (e.g. verify form). |
| **QA** | Asserts response shapes against schemas in tests. |
| **Translator** | Maps `code` from `apiErrorSchema` to locale strings ([feat-0019](../feat-0019-api-errors-i18n/PRODUCT.md)). |

## Contract catalog (product view)

| Schema | Direction | Purpose |
|--------|-----------|---------|
| `apiErrorSchema` | Response error | `{ error: string, code?: string }` |
| `createCaseResponseSchema` | Response | New case credentials |
| `verifyCaseAccessRequestSchema` | Request | `caseId` + `secret` |
| `verifyCaseAccessResponseSchema` | Response | Success verify (cookie flow; no token in schema) |
| `postCaseChatMessageRequestSchema` | Request | AI SDK-style `messages` array |
| `extractionPatchSchema` | Payload | Structured intake fields |
| `postCaseChatMessageResponseMetaSchema` | Response meta | Extraction + crisis flag |
| `submitCaseResponseSchema` | Response | Submit acknowledgment |
| `uploadRequestSchema` / `uploadResponseSchema` | Request/response | Evidence presign |

## Use case catalog

### A. Error contract

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Stable error code | API failure | Return JSON matching `apiErrorSchema` | Client reads `code` for i18n |
| **UC-A02** | Human message | Error returned | `error` string present | Fallback display if no translation |
| **UC-A03** | Legacy string-only error | Hono / old handler | `{ error }` without `code` | Client shows raw string ([feat-0016](../feat-0016-hono-standalone-api/PRODUCT.md) gap) |

### B. Case access

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Parse verify request | POST body JSON | `verifyCaseAccessRequestSchema.safeParse` | Valid `caseId`, `secret` or 400 |
| **UC-B11** | Reject empty credentials | Missing fields | safeParse fails | 400 `INVALID_JSON` or validation error |
| **UC-B12** | Create case response | Case created | Response matches `createCaseResponseSchema` | `caseId`, `secret`, optional `secretShownOnce: true` |
| **UC-B13** | Verify success body | Verify OK (Next) | `verifyCaseAccessResponseSchema` | `ok: true`, `caseId`, `expiresAt` ISO string |

### C. Reporting chat

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Chat request | Authenticated session | Parse `postCaseChatMessageRequestSchema` | `messages` array accepted |
| **UC-C21** | Optional idempotency | Client sends `clientRequestId` | Field optional in schema | Store dedupes ([feat-0011](../feat-0011-data-layer/PRODUCT.md)) |
| **UC-C22** | Extraction meta | AI returns fields | `extractionPatchSchema` in meta | UI updates progress ([feat-0014](../feat-0014-ui-kit/PRODUCT.md)) |
| **UC-C23** | Crisis flag | Safety trigger | `crisisTriggered` in meta | Crisis panel shown |

### D. Submit and upload

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D30** | Submit success | Case open | Response `submitCaseResponseSchema` | `ok: true`, `submittedAt` |
| **UC-D31** | Upload presign request | Session + open case | `uploadRequestSchema` | `filename`, `mimeType` |
| **UC-D32** | Upload presign response | Storage configured | `uploadResponseSchema` | `signedUrl`, `publicUrl` |

### E. Health (non-reporting)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-E40** | Health check | Hono running | `getApiHealth()` | `{ status: 'ok' }` |

### F. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-F50** | Schema parse failure → 400 before store call |
| **UC-F51** | `messages: z.array(z.unknown())` — loose typing; AI SDK validates at stream layer |
| **UC-F52** | Hono verify adds `token` to JSON — **not** in `verifyCaseAccessResponseSchema` (intentional transport difference) |
| **UC-F53** | Unknown `code` in client → generic error string ([feat-0019](../feat-0019-api-errors-i18n/PRODUCT.md)) |

## Behavior (product rules)

1. **Schemas are the source of truth** for field names in new routes; handlers should not invent parallel shapes.

2. **`apiErrorSchema.code`** is optional in Zod but **required in product** for user-facing Next routes ([feat-0019](../feat-0019-api-errors-i18n/PRODUCT.md)).

3. **No tRPC wire protocol** — package is a shared contract library only.

4. **Versioning** is implicit (monorepo); breaking changes require coordinated route + client updates.

5. **Verify response** on Next omits bearer `token` (cookie session); Hono extends response outside the shared success schema.

## Acceptance criteria

| # | Criterion |
|---|-----------|
| AC-1 | `@safevoices/trpc` exports all schemas and inferred types. |
| AC-2 | Next verify route uses `verifyCaseAccessRequestSchema`. |
| AC-3 | `apiErrorSchema` includes `code` as optional string. |
| AC-4 | Web test validates verify payload against schema. |
| AC-5 | No tRPC server dependency in production bundle for reporting. |

## What's needed to make it work

| Requirement | Notes |
|-------------|-------|
| `@safevoices/trpc` built / typechecked | `pnpm --filter @safevoices/trpc run typecheck` |
| Route handlers call `safeParse` | Reject invalid bodies before business logic |
| `API_ERROR_CODES` aligned with schemas | Defined in `apps/web/lib/api-errors.ts`; keep codes in sync |
| Hono parity | Adopt `apiErrorResponse` + codes ([feat-0016](../feat-0016-hono-standalone-api/PRODUCT.md)) |
| Client tests | Import schemas for fixture validation |
| Future: OTP / dashboard schemas | Add to package when APIs exist |

## Open questions

1. Generate OpenAPI from Zod? **Default:** later via `zod-openapi` if external clients need docs.

2. Separate `@safevoices/contracts` package? **Default:** keep in `trpc` until naming confuses onboarding.

3. Strict chat message schema? **Default:** tighten when AI SDK message shape stabilizes.

## Related

- [feat-0005 PRODUCT](../feat-0005-anonymous-case-access/PRODUCT.md)
- [feat-0008 PRODUCT](../feat-0008-reporting-chat-ai/PRODUCT.md)
- [feat-0016 PRODUCT](../feat-0016-hono-standalone-api/PRODUCT.md)
- [feat-0019 PRODUCT](../feat-0019-api-errors-i18n/PRODUCT.md)
