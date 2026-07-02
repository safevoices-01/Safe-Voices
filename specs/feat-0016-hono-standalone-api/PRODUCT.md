# feat-0016: Hono standalone API

## Summary

**Safe Voices** exposes a **standalone Hono HTTP server** (`apps/api`) that mirrors a subset of the Next.js App Router API (`apps/web/app/api`). It exists so the reporting backend can run **outside** the Next.js process (separate host, port, or edge-adjacent deployment) while reusing shared packages (`@safevoices/ai`, `@safevoices/prisma`, `@safevoices/trpc`).

**Implemented today:** health check, demo chat, anonymous case creation, case credential verification (returns Bearer token), and **case-scoped reporting chat** authenticated via `Authorization: Bearer` (no cookies).

**Not implemented on Hono (Next.js only today):** session introspection, message history, case submit, and evidence upload.

Complements [feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md) (case credentials), [feat-0007](../feat-0007-general-ai-chat/PRODUCT.md) (demo chat), [feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md) (reporting chat), and [feat-0011](../feat-0011-data-layer/PRODUCT.md) (case store).

## Problem

Next.js API routes couple the reporting API to the web app's deployment lifecycle. Operators who want a dedicated API tier (different scaling, CORS for non-Next clients, or local dev on port 8787) need a documented, stable surface. Without a spec, it is unclear which routes are portable, how auth differs (cookie vs Bearer), and what parity gaps remain.

## Non-goals

- Replacing Next.js API routes for the primary web reporter journey (web still uses same-origin `/api/*` with httpOnly session cookies).
- Investigator dashboard or partner email OTP APIs.
- tRPC over HTTP (shared Zod schemas only).
- Automatic route parity CI (manual checklist until added).
- Production deployment wiring ([feat-0020](../feat-0020-ci-deployment/PRODUCT.md) covers CI only; no `deploy.yml`).

## Actors

| Actor | Description |
|-------|-------------|
| **Reporter (web)** | Uses Next.js `/api/*` with cookies; may ignore Hono unless configured to proxy. |
| **Reporter (API client)** | Mobile, script, or third-party UI calling Hono directly with Bearer token after verify. |
| **Developer** | Runs `pnpm dev:api` locally; points `SAFEVOICES_CORS_ORIGINS` at the web origin. |
| **Platform** | Operates Hono process with shared env (`DATABASE_URL`, `AI_GATEWAY_API_KEY`, `SAFEVOICES_SECRET_PEPPER`). |

## Auth model (product)

| Flow | Next.js (feat-0005) | Hono (feat-0016) |
|------|---------------------|------------------|
| Verify case | Sets httpOnly `sv_case_session` cookie | Returns `token` + `expiresAt` in JSON body |
| Reporting chat | Cookie sent automatically | Client sends `Authorization: Bearer <token>` |
| Demo chat | No session | No session |

Reporters using Hono must **store the Bearer token** client-side (memory or secure storage) and attach it to case chat requests. Tokens are opaque session tokens resolved by the case store (same as cookie value on Next).

## Route parity (product view)

| Capability | Next.js | Hono |
|------------|---------|------|
| Health | — | `GET /health` |
| Demo AI chat | `POST /api/chat` | `POST /api/chat` |
| Create case | `POST /api/cases` | `POST /api/cases` |
| Verify credentials | `POST /api/cases/verify` (cookie) | `POST /api/cases/verify` (Bearer in body response) |
| Reporting chat | `POST /api/cases/:caseId/chat` (cookie) | `POST /api/cases/:caseId/chat` (Bearer) |
| Session status | `GET /api/cases/session` | **Missing** |
| Message history | `GET/POST .../messages` | **Missing** |
| Submit case | `POST .../submit` | **Missing** |
| Upload evidence | `POST .../upload` | **Missing** |

## Use case catalog

### A. Operations and health

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | API process starts | Env loaded | `pnpm dev:api` or node serve | Listens on `PORT` (default 8787) |
| **UC-A02** | Health probe | Server running | `GET /health` | `{ "status": "ok" }` |
| **UC-A03** | CORS for web dev | `SAFEVOICES_CORS_ORIGINS` set | Browser preflight from allowed origin | POST succeeds |

### B. Demo chat (no case)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | General AI chat | `AI_GATEWAY_API_KEY` set | `POST /api/chat` with messages | Streaming response (same as Next demo) |

### C. Anonymous case lifecycle (partial)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Create case | — | `POST /api/cases` | `caseId`, `secret`, `secretShownOnce: true` |
| **UC-C21** | Verify credentials | Valid caseId + secret | `POST /api/cases/verify` | `ok`, `caseId`, `token`, `expiresAt` (no cookie) |
| **UC-C22** | Verify failure | Wrong secret | Verify | 401 or 429 (lockout); plain `error` string (no stable `code` on Hono today) |
| **UC-C23** | Reporting chat | Valid Bearer + matching caseId | `POST /api/cases/:caseId/chat` | Streaming reporting-mode chat |
| **UC-C24** | Chat without auth | No Bearer | Case chat | 401 Unauthorized |
| **UC-C25** | Chat wrong case | Bearer for case A, URL case B | Case chat | 401 Unauthorized |

### D. Gaps (Next-only today)

| ID | Use case | Expected on Hono (target) |
|----|----------|----------------------------|
| **UC-D30** | Poll session | `GET /api/cases/session` with Bearer |
| **UC-D31** | Load / sync messages | Messages routes with Bearer |
| **UC-D32** | Submit report | Submit route; enforce read-only after |
| **UC-D33** | Upload attachment | Signed upload or multipart parity |

### E. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-E40** | Invalid JSON body → 400 |
| **UC-E41** | Malformed chat payload → 400 with error message |
| **UC-E42** | Expired or revoked Bearer → 401 on case chat |
| **UC-E43** | Submitted case chat on Next → 409 with `CASE_SUBMITTED_READONLY`; Hono **does not** check submit state today |

## Behavior (product rules)

1. **Single case store:** Hono and Next share `getCaseStore()`; cases created on one entry point are visible on the other when `DATABASE_URL` is shared (or same in-memory dev instance per process — not shared across processes).

2. **Verify response shape:** Hono returns `token` for clients that cannot use cookies; web app continues to rely on cookies when calling Next verify.

3. **Reporting chat on Hono** enables `reportingMode: true` but does **not** persist chat turns, extraction headers, or submit guards (Next route does). Product target: parity with Next case chat handler.

4. **Error UX:** Hono returns ad-hoc `{ error: string }` bodies. Stable `code` fields for i18n ([feat-0019](../feat-0019-api-errors-i18n/PRODUCT.md)) are a **target** for Hono parity.

5. **CORS:** Defaults allow localhost web ports; production must set `SAFEVOICES_CORS_ORIGINS` explicitly.

6. **No cookies on Hono:** Session middleware must not assume `Cookie` header for case auth.

## Acceptance criteria

| # | Criterion |
|---|-----------|
| AC-1 | `GET /health` returns 200 JSON. |
| AC-2 | `POST /api/cases` returns new case credentials once. |
| AC-3 | Verify returns Bearer token usable on case chat for same `caseId`. |
| AC-4 | Case chat rejects missing or mismatched Bearer. |
| AC-5 | Documented list of missing routes matches implementation. |

## Open questions

1. Should Hono become the **primary** API with Next proxying, or remain optional? **Default:** optional; web keeps Next routes.

2. Bearer token storage guidance for future mobile clients? **Default:** OS secure storage; never log token.

3. Shared `apiErrorResponse` on Hono? **Default:** yes, align with feat-0019.

## Related

- [feat-0005 PRODUCT](../feat-0005-anonymous-case-access/PRODUCT.md) — cookies and verify on Next
- [feat-0008 PRODUCT](../feat-0008-reporting-chat-ai/PRODUCT.md) — full reporting chat on Next
- [feat-0012 PRODUCT](../feat-0012-api-contracts/PRODUCT.md) — Zod request schemas
- [feat-0019 PRODUCT](../feat-0019-api-errors-i18n/PRODUCT.md) — stable error codes (Next today)
- [feat-0020 PRODUCT](../feat-0020-ci-deployment/PRODUCT.md) — CI includes `@safevoices/api` typecheck
