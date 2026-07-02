# feat-0022: Partner authentication backend

## Summary

**Partner authentication backend** replaces the client-side OTP mock ([feat-0006](../feat-0006-email-otp-partner-auth/PRODUCT.md)) with server-issued one-time codes, Resend delivery ([feat-0013](../feat-0013-transactional-email/PRODUCT.md)), rate limiting, and a **partner session** cookie distinct from reporter case sessions ([feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md)). Required for [feat-0021](../feat-0021-investigator-workflow/PRODUCT.md) and dashboard protection.

**Status:** Not implemented — mock only in `apps/web/lib/auth-otp-mock.ts`.

## Problem

Partner sign-in UI exists but codes are generated and verified in the browser. There is no server trust boundary, no audit of sign-in attempts, and no session that APIs can validate.

## Non-goals

- SSO / SAML / OIDC in v1 (email OTP only).
- Self-service partner registration (admin-provisioned accounts).
- Shared session between reporter and partner on same browser (separate cookies).
- Magic links (code entry only for v1).

## Actors

| Actor | Description |
|-------|-------------|
| **Partner user** | Email on allowlist / `PartnerUser` table |
| **Platform** | Issues OTP, sets session, enforces lockout |

## Use case catalog

### A. Request OTP

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Request code | Email on allowlist | POST `/api/auth/partner/otp` | Code hashed server-side; email sent |
| **UC-A02** | Unknown email | Not provisioned | Request OTP | Generic success (no enumeration) or 404 policy TBD |
| **UC-A03** | Rate limit | Too many requests | Request OTP | 429 + lockout UI ([feat-0014](../feat-0014-ui-kit/PRODUCT.md) `LockoutNotice`) |
| **UC-A04** | Resend cooldown | Recent send | Resend | 429 until cooldown |

### B. Verify OTP

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Valid code | Code matches, not expired | POST `/api/auth/partner/verify` | `sv_partner_session` cookie |
| **UC-B11** | Invalid code | Wrong code | Verify | 401; increment attempt counter |
| **UC-B12** | Expired code | TTL exceeded | Verify | 401 `OTP_EXPIRED` |
| **UC-B13** | Max attempts | Lockout threshold | Verify | 429; lockout notice |

### C. Session

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Access dashboard | Valid partner session | GET `/dashboard` | 200 |
| **UC-C21** | Session expired | TTL elapsed | API call | 401 → redirect sign-in |
| **UC-C22** | Sign out | Authenticated | POST `/api/auth/partner/logout` | Cookie cleared |
| **UC-C23** | Reporter + partner | Both cookies possible | Separate flows | No cookie collision |

## Behavior (product rules)

1. OTP **6 digits**, **10 minute** TTL (matches current mock copy in `sendPartnerOtpEmail`).
2. Store **hash only** (bcrypt or HMAC-SHA256 with pepper); never log plaintext code.
3. `RESEND_API_KEY` required in production; dev may log code when key missing ([feat-0013](../feat-0013-transactional-email/PRODUCT.md)).
4. Partner session cookie: `HttpOnly`, `Secure` in prod, `SameSite=Lax`, path `/`.
5. i18n: reuse `auth.emailOtp` namespaces ([feat-0001](../feat-0001-i18n/PRODUCT.md)).

## What's needed to make it work

| Layer | Requirement |
|-------|-------------|
| API | `POST /api/auth/partner/otp`, `verify`, `logout` |
| Store | `PartnerOtpChallenge` table or Redis with TTL |
| Email | `sendPartnerOtpEmail` ([packages/emails](../feat-0013-transactional-email/TECH.md)) |
| Web | Replace `use-email-otp-auth.ts` mock with fetch to API |
| Middleware | Optional: refresh session, protect `/dashboard` |
| Allowlist | `PartnerUser.email` or env `PARTNER_ALLOWLIST` for MVP |

## Implementation status

| Item | Status |
|------|--------|
| UI flow (`email-otp-flow.tsx`) | Done (mock) |
| `sendPartnerOtpEmail` | Done (library) |
| Server OTP + session | Not started |
| Dashboard gate | Not started |

## Acceptance criteria (target)

1. OTP never verified client-side only; server is source of truth.
2. Successful verify sets partner cookie; reporter `sv_case_session` unchanged.
3. Rate limit returns translated error ([feat-0019](../feat-0019-api-errors-i18n/PRODUCT.md)).
4. E2E: request → email (or test sink) → verify → dashboard ([feat-0025](../feat-0025-testing-release/PRODUCT.md)).

## Open questions

1. Unknown email: always 200 vs 404? **Default:** 200 + no email (anti-enumeration).
2. Session TTL: 8h vs 24h? **Default:** 8h sliding.

## Related

- [feat-0006 PRODUCT](../feat-0006-email-otp-partner-auth/PRODUCT.md) — current mock UI
- [feat-0013 PRODUCT](../feat-0013-transactional-email/PRODUCT.md) — Resend
- [feat-0021 PRODUCT](../feat-0021-investigator-workflow/PRODUCT.md) — consumer of session
