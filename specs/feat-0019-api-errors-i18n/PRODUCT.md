# feat-0019: API errors and client translation

## Summary

API routes return **stable machine-readable error codes** (`code`) alongside optional log/detail strings. The web client maps those codes to **localized user messages** via the `errors` namespace in `en.json` / `ar.json`, using `translateApiError` for inline errors and `api-toast` helpers for toasts.

**Status:** Complete on **Next.js API routes** and reporter UI paths (access verify, chat submit). **Hono API** ([feat-0016](../feat-0016-hono-standalone-api/PRODUCT.md)) still returns plain `{ error: string }` without `code` — parity gap.

Complements [feat-0001](../feat-0001-i18n/PRODUCT.md), [feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md), [feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md), and [feat-0012](../feat-0012-api-contracts/PRODUCT.md).

## Problem

Raw English server strings in toasts break Arabic UX and drift when copy changes. Clients that branch on HTTP status alone cannot distinguish lockout (429) from bad credentials (401) reliably. A single catalog of codes keeps API, translations, and QA aligned.

## Non-goals

- RFC 7807 Problem Details envelope.
- Localizing server-generated log messages (only `code` is translated client-side).
- Retry/backoff orchestration in `api-toast`.
- Investigator dashboard error surfaces (stub).
- Auto-sync codes to OpenAPI doc (future).

## Error code catalog (product)

| Code | Typical HTTP | User meaning |
|------|--------------|--------------|
| `INVALID_JSON` | 400 | Malformed request body |
| `VERIFY_FAILED` | 400/401 | Wrong case ID or secret |
| `VERIFY_LOCKED` | 429 | Too many verify attempts |
| `SESSION_EXPIRED` | 401 | Case session invalid or expired |
| `CASE_SUBMITTED` | 409 | Report already submitted |
| `CASE_SUBMITTED_READONLY` | 409 | Chat blocked; read-only case |
| `CASE_NOT_FOUND` | 404 | Unknown case |
| `CHAT_TOO_MANY_MESSAGES` | 400 | Conversation length limit |
| `CHAT_MESSAGE_TOO_LARGE` | 400 | Single message too large |
| `UPLOAD_UNSUPPORTED_TYPE` | 400 | File type not allowed |
| `UPLOAD_NOT_CONFIGURED` | 503 | Storage not set up |
| `CHAT_DISABLED` | 503 | Chat temporarily unavailable |

Copy lives in `messages/{locale}.json` under `errors.<CODE>`.

## Actors

| Actor | Description |
|-------|-------------|
| **Reporter** | Sees translated errors on access and chat flows. |
| **Frontend** | Calls `translateApiError(tErrors, body)` or `toastApiError` with translated text. |
| **API route** | Returns `apiErrorResponse(code, status)`. |

## Response shape (product)

Success: route-specific JSON.

Error:

```json
{
  "code": "VERIFY_FAILED",
  "error": "We could not verify those credentials."
}
```

- **`code`** — stable key for i18n (required for translated UX).
- **`error`** — English diagnostic for logs and fallback; may duplicate message catalog text.

## Use case catalog

### A. API emission

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Invalid JSON | POST with bad body | Route catch | `INVALID_JSON` 400 |
| **UC-A02** | Verify failure | Wrong secret | `POST /api/cases/verify` | `VERIFY_FAILED` 401 |
| **UC-A03** | Verify lockout | Rate limit | Verify | `VERIFY_LOCKED` 429 |
| **UC-A04** | Session missing | Chat without cookie | Case chat | `SESSION_EXPIRED` 401 |
| **UC-A05** | Read-only chat | Submitted case | Case chat | `CASE_SUBMITTED_READONLY` 409 |
| **UC-A06** | Chat limits | Too many/large messages | Parse chat body | `CHAT_*` 400 |

### B. Client translation

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Access verify error | `res.ok === false` | `translateApiError(tErrors, json)` | Arabic/English string in form |
| **UC-B11** | Chat submit error | Submit fails | `toastApiError(title, translateApiError(...))` | Toast with localized description |
| **UC-B12** | Unknown code | Body without `code` | Fallback to `error` string or `INVALID_JSON` | Sensible message |
| **UC-B13** | Network failure | `fetch` throws | `toastApiError('Network error', ...)` | No code path |

### C. Toast helpers

| ID | Use case | API |
|----|----------|-----|
| **UC-C20** | Generic error toast | `toastApiError(title, description?)` |
| **UC-C21** | Success toast | `toastApiSuccess` |
| **UC-C22** | Fetch wrapper | `fetchJsonWithToast` — parse JSON, toast on failure |
| **UC-C23** | Promise UX | `runWithApiToast` — loading/success/error states |

### D. Negative cases

| ID | Expected behavior |
|----|-------------------|
| **UC-D30** | Hono verify without `code` | Client falls back to raw `error` English |
| **UC-D31** | New code without translation key | `tErrors(code)` may show key; caught by key-parity if added to one locale only |
| **UC-D32** | Extra unknown `code` in body | Ignored; fallback path |

## Behavior (product rules)

1. **Prefer `code` over `error`** for user-visible strings when `translateApiError` is used.

2. **Parity:** every `API_ERROR_CODES` value must have `errors.<CODE>` in **both** `en.json` and `ar.json` (enforced by `key-parity.test.ts`).

3. **Toasts** use coss `toastManager` from `@safevoices/ui`.

4. **Access flow** sets lockout UI when `res.status === 429` in addition to translated message.

5. **Adding a code** requires: `api-errors.ts`, `translate-api-error.ts` ERROR_CODES set, both message files, and route usage.

## Acceptance criteria

| # | Criterion |
|---|-----------|
| AC-1 | Verify failures show localized text in EN and AR. |
| AC-2 | Chat session expiry shows `SESSION_EXPIRED` translation. |
| AC-3 | All codes in `API_ERROR_CODES` exist in en/ar `errors`. |
| AC-4 | `apiErrorResponse` used on Next case routes (verify, chat). |

## Open questions

1. Migrate Hono to `apiErrorResponse`? **Default:** yes ([feat-0016](../feat-0016-hono-standalone-api/PRODUCT.md)).

2. Share `API_ERROR_CODES` in `@safevoices/trpc` for API packages? **Default:** optional refactor.

## Related

- [feat-0001 PRODUCT](../feat-0001-i18n/PRODUCT.md)
- [feat-0005 PRODUCT](../feat-0005-anonymous-case-access/PRODUCT.md)
- [feat-0008 PRODUCT](../feat-0008-reporting-chat-ai/PRODUCT.md)
- [feat-0016 PRODUCT](../feat-0016-hono-standalone-api/PRODUCT.md) — error parity gap
- [feat-0012 PRODUCT](../feat-0012-api-contracts/PRODUCT.md)
