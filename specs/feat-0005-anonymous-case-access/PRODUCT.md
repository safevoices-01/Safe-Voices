# feat-0005: Anonymous case access

## Summary

**Anonymous case access** is the reporter entry funnel at `/{locale}/access`: create a new case without PII, or verify an existing **case ID + secret** pair. On success the server sets an **httpOnly** `sv_case_session` cookie and the client navigates to `/{locale}/chat?caseId=…` for reporting chat ([feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md)). Secrets are shown **once** via `ShowOnceSecretCard`; credentials are stored with **Argon2** + pepper in the case store ([feat-0011](../feat-0011-data-layer/PRODUCT.md)). Failed verify attempts trigger **per-case lockout** and optional **per-IP network limits**.

**Status:** Complete on Next.js App Router.

Replaces legacy `/auth` for anonymous reporters when Access V2 is on ([feat-0002](../feat-0002-middleware-routing/PRODUCT.md)). Marketing CTAs target this flow ([feat-0003](../feat-0003-marketing-landing/PRODUCT.md)).

## Problem

Anonymous whistleblowing requires identity decoupling: reporters need a durable way to return to their thread without accounts, while the platform must resist brute-force guessing of case credentials and never re-display lost secrets.

## Non-goals

- Email or SSO reporter authentication (partner path is `/auth/email`, [feat-0006](../feat-0006-email-otp-partner-auth/PRODUCT.md)).
- Secret recovery or "forgot case ID" flows (by design).
- SMS or magic-link access.
- Multi-case sessions in one browser (one cookie, one case).
- Standalone Hono API parity ([feat-0016](../feat-0016-hono-standalone-api/PRODUCT.md) partial).
- Investigator case lookup (dashboard, [feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md)).

## Actors

| Actor | Description |
|-------|-------------|
| **New anonymous reporter** | Creates case, saves credentials, enters chat. |
| **Returning reporter** | Enters case ID + secret to resume. |
| **Partner user** | May follow link to email sign-in from access menu. |
| **Platform** | Mints case IDs, hashes secrets, issues session tokens, enforces lockout. |
| **Attacker** | Triggers verify failures; subject to lockout and network limit. |

## Use case catalog

### A. Entry and menu

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Land on access | User opens `/{locale}/access` | `CaseAccessFlow` menu mode | Safety notice + two actions |
| **UC-A02** | Redirect from legacy auth | Access V2 on | `/{locale}/auth` → access ([feat-0002](../feat-0002-middleware-routing/PRODUCT.md)) | Same menu |
| **UC-A03** | Partner sign-in link | On menu | Link to `/auth/email` | Email OTP flow ([feat-0006](../feat-0006-email-otp-partner-auth/PRODUCT.md)) |
| **UC-A04** | Return home | Logo in `AuthLayout` | `Link` → `/` | Marketing home |

### B. Create anonymous case

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Continue anonymously | Menu | `POST /api/cases` | Case row + plaintext secret returned once |
| **UC-B11** | Show-once credentials | Create success | Mode `show-secret`; `ShowOnceSecretCard` | Case ID format `SV-XXXXX-XXXX`; secret ≥ 16 chars |
| **UC-B12** | Copy credentials | On secret card | Clipboard: case ID + secret | User can paste offline |
| **UC-B13** | Acknowledge saved secret | Checkbox on card | `acknowledged` required to continue | User confirms understanding |
| **UC-B14** | Beforeunload warning | Secret shown, not acknowledged | `beforeunload` handler | Browser warns on tab close |
| **UC-B15** | Continue to chat after create | Acknowledged | Auto-verify with returned secret → cookie → `/chat?caseId=` | Session active ([feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md)) |
| **UC-B16** | Create failure | API error | Toast/inline `createFailed` | Stay on menu |

### C. Access existing case

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Open existing form | Menu | Mode `existing` | Case ID + secret inputs (LTR) |
| **UC-C21** | Verify and continue | Both fields filled | `POST /api/cases/verify` | Cookie set; navigate to chat |
| **UC-C22** | Invalid credentials | Wrong ID/secret | 401 `VERIFY_FAILED` | Non-enumerating message |
| **UC-C23** | Case lockout | ≥ 5 failed attempts per case | 429 `VERIFY_LOCKED`; `LockoutNotice` | 10-minute lockout |
| **UC-C24** | Network lockout | Too many verifies from IP | 429 `VERIFY_LOCKED` | 15-minute window, limit 30 (default) |
| **UC-C25** | Back to menu | On existing form | Reset errors → menu | — |
| **UC-C26** | Normalize case ID | User enters lowercase | Trim + uppercase before verify | Matches `CASE_ID_REGEX` |

### D. Session lifecycle

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D30** | Session cookie issued | Verify success | `Set-Cookie: sv_case_session` httpOnly, lax, secure in prod | TTL ~15 min sliding |
| **UC-D31** | Poll session | Chat or client | `GET /api/cases/session` | `{ ok, caseId, expiresAt, submitted, caseStatus }` |
| **UC-D32** | Session expired | Cookie invalid/expired | 401 from session route | Chat prompts re-verify ([feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md)) |
| **UC-D33** | Chat gate (optional) | `SAFEVOICES_ENFORCE_CHAT_SESSION=true` | Middleware blocks `/chat?caseId=` without cookie ([feat-0002](../feat-0002-middleware-routing/PRODUCT.md)) | Redirect to access with `return` query |
| **UC-D34** | Middleware `return` param | After enforced redirect | **Gap:** client should honor `return` URL post-verify | Today navigates to `/chat?caseId=` only |

### E. Credential format and security

| ID | Use case | Rule |
|----|----------|------|
| **UC-E40** | Case ID pattern | `^SV-[A-Z2-9]{5}-[A-Z2-9]{4}$` |
| **UC-E41** | Secret minimum length | 16 characters (API + client) |
| **UC-E42** | Secret storage | Argon2 hash + per-secret salt + `SAFEVOICES_SECRET_PEPPER` |
| **UC-E43** | Session token storage | HMAC-SHA256 of token in DB; raw token in cookie only |
| **UC-E44** | Client key for rate limit | SHA-256 of `x-forwarded-for` / `x-real-ip` (first 32 hex chars) |

### F. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-F50** | Malformed JSON on verify → 400 `INVALID_JSON` |
| **UC-F51** | Invalid case ID format → 400 `VERIFY_FAILED` (same as wrong secret) |
| **UC-F52** | Secret too short → 400 `VERIFY_FAILED` |
| **UC-F53** | Double-create allowed | Each POST creates new case (no dedup) |
| **UC-F54** | Arabic UI | Access strings from `access.*`; credential fields LTR |

## Behavior rules

1. **Anonymous-first:** Default action is "Continue anonymously"; partner email is secondary link.

2. **Show once:** Server returns `secret` only on create; never on verify or session endpoints.

3. **Non-enumeration:** Verify failures use generic copy (`VERIFY_FAILED`); lockout uses `VERIFY_LOCKED`.

4. **Case ID:** Prefix `SV`; generated in store (`generateTrackingCode`).

5. **Lockout:** 5 failed attempts → 10-minute `lockedUntil` on case record.

6. **Network limit:** Configurable `SAFEVOICES_NETWORK_VERIFY_LIMIT` (default 30 per 15 minutes per client key).

7. **Session:** 15-minute TTL on create; touch extends in store on API use ([feat-0011](../feat-0011-data-layer/PRODUCT.md)).

8. **Store selection:** `DATABASE_URL` or `CASE_STORE=memory` → Prisma or memory ([feat-0011](../feat-0011-data-layer/PRODUCT.md)).

9. **Contracts:** Zod schemas in `@safevoices/trpc` ([feat-0012](../feat-0012-api-contracts/PRODUCT.md)).

## What's needed to make it work

| Requirement | Who | Notes |
|-------------|-----|-------|
| `CaseAccessFlow` UI wired to APIs | Engineering | `components/auth/case-access-flow.tsx` |
| `POST /api/cases`, `/verify`, `GET /session` | Engineering | `app/api/cases/*` |
| `@safevoices/prisma` case store | Engineering | Memory dev default; Prisma when `DATABASE_URL` set |
| `SAFEVOICES_SECRET_PEPPER` in production | Ops | **Required** for production crypto; dev fallback exists |
| `pnpm --filter @safevoices/prisma exec prisma generate` | Engineering | When using Prisma store |
| Optional `DATABASE_URL` | Ops | Persistence across restarts |
| Access V2 middleware redirect | Ops/Engineering | [feat-0002](../feat-0002-middleware-routing/PRODUCT.md) |
| Arabic `access.*` and `errors.*` strings | Translation | [feat-0001](../feat-0001-i18n/PRODUCT.md) |
| User education on secret storage | Product | `ShowOnceSecretCard` + safety notice |
| Honor `return` query after verify | Engineering | Gap for middleware deep links |

## Implementation status

| Area | Status |
|------|--------|
| Create + show-once UI | Complete |
| Verify existing + lockout UI | Complete |
| Next.js API routes | Complete |
| Argon2 + session cookies | Complete |
| Memory + Prisma case stores | Complete |
| Middleware chat enforcement (opt-in) | Complete |
| `return` URL after verify | Not implemented |
| Hono API parity | Partial ([feat-0016](../feat-0016-hono-standalone-api/PRODUCT.md)) |

## Acceptance criteria

1. `POST /api/cases` returns `{ caseId, secret, secretShownOnce: true }` with valid ID format.
2. Secret is never returned from verify or session endpoints.
3. Successful verify sets `sv_case_session` httpOnly cookie and returns `{ ok: true, caseId, expiresAt }`.
4. Five failed verifies lock case for 10 minutes (429).
5. `ShowOnceSecretCard` requires acknowledgment before continue.
6. Existing-case form rejects empty fields; shows localized lockout notice on 429.
7. `GET /api/cases/session` returns case metadata when cookie valid, 401 when not.
8. `pnpm --filter @safevoices/web test` passes case access contract tests.
9. End-to-end: create → save → continue → chat loads with `caseId` query ([feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md)).

## Related

- [feat-0001 PRODUCT](../feat-0001-i18n/PRODUCT.md) — access copy, LTR fields
- [feat-0002 PRODUCT](../feat-0002-middleware-routing/PRODUCT.md) — auth redirect, chat gate
- [feat-0003 PRODUCT](../feat-0003-marketing-landing/PRODUCT.md) — CTAs to `/access`
- [feat-0008 PRODUCT](../feat-0008-reporting-chat-ai/PRODUCT.md) — post-verify chat
- [feat-0011 PRODUCT](../feat-0011-data-layer/PRODUCT.md) — case store
- [feat-0012 PRODUCT](../feat-0012-api-contracts/PRODUCT.md) — Zod schemas
- [feat-0019 PRODUCT](../feat-0019-api-errors-i18n/PRODUCT.md) — error translation
- `docs/access-and-identity-spec.md` — design reference (if present in repo)
