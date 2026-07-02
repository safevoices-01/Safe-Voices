# feat-0006: Email OTP (partner auth)

## Summary

**Partner and investigator accounts** sign in on web via **email + one-time password (OTP)** at `/{locale}/auth/email`. The flow is a three-step UI: enter email, enter 6-digit code, success confirmation. It is separate from **anonymous reporter** access ([feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md)), which uses case ID + secret at `/{locale}/auth` and `/{locale}/access`.

**Completion (product):** verified partner email with an active session, redirected to the investigator dashboard ([feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md)) or authorized case-management surfaces.

**Completion (today):** UI and client-side state machine are **complete**; backend uses an **in-browser mock** (`createMockOtpClient`). Success screen links to `/chat` and `/` but does **not** establish a server session or gate `/dashboard`.

Complements [feat-0013](../feat-0013-transactional-email/PRODUCT.md) (Resend OTP delivery), [feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md) (post-auth destination), and [feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md) (reporter path).

## Problem

Investigators and partner org staff need passwordless sign-in without mixing their identity with anonymous reporter credentials. The product must define OTP UX (validation, resend cooldown, error copy), the pluggable client boundary for real APIs, and how partner auth differs from case access. Today the dashboard advertises "Partner sign-in" but verification does not unlock protected routes or send real email.

## Non-goals

- Anonymous reporter case ID + secret flows (feat-0005).
- Social login, SAML, or magic links without OTP entry.
- End-user self-registration approval workflow (admin invite assumed later).
- Partner role assignment, org tenancy, or RBAC detail ([feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md)).
- Sending OTP via SMS.
- Storing partner passwords.

## Figma

Figma: none provided. Baseline: `AuthLayout` card shell, email field, grouped OTP input, success card with primary CTA.

## Actors

| Actor | Persona | Description |
|-------|---------|-------------|
| **Partner user** | Investigator / org staff | Opens `/auth/email`, completes OTP, expects dashboard access. |
| **Returning partner** | Same | Re-authenticates when session expires. |
| **Reporter** | Anonymous | Uses `/access`; must not be forced through partner OTP for reporting. |
| **Platform** | — | Issues OTP, enforces rate limits, creates partner session (target). |

## Auth model (product)

| Path | Purpose | Session |
|------|---------|---------|
| `/{locale}/auth` | Reporter case access (`CaseAccessFlow`) | `sv_case_session` cookie (feat-0005) |
| `/{locale}/auth/email` | Partner email OTP | **None today**; target: httpOnly partner session cookie or JWT |
| `/{locale}/dashboard` | Investigator stub | No auth gate today |

Partner OTP must **not** grant access to a reporter's case unless the partner account is explicitly assigned that case (future).

## Use case catalog

### A. Entry and routing

| ID | Persona | Use case | Preconditions | Main flow | Postcondition |
|----|---------|----------|---------------|-----------|---------------|
| **UC-A01** | Partner | Open partner sign-in | — | Dashboard or direct nav → `/auth/email` | Email step visible |
| **UC-A02** | Partner | Locale preserved | Middleware active ([feat-0002](../feat-0002-middleware-routing/PRODUCT.md)) | `/en/auth/email` or `/ar/auth/email` | RTL/layout per locale |
| **UC-A03** | Reporter | Reporter auth unchanged | — | `/auth` or `/access` | Case access flow, not OTP |
| **UC-A04** | Partner | Success without backend | Mock client | Complete OTP → success panel | **No server session** (gap) |

### B. Email step

| ID | Persona | Use case | Preconditions | Main flow | Postcondition |
|----|---------|----------|---------------|-----------|---------------|
| **UC-B10** | Partner | View email form | On email step | See title, description, email field | Can type address |
| **UC-B11** | Partner | Invalid email | Malformed input | Continue | Inline error: valid email required |
| **UC-B12** | Partner | Send OTP (success) | Valid email | Continue → `sendOtp` | Advance to OTP step; resend cooldown starts |
| **UC-B13** | Partner | Send OTP (network) | Client throws | Continue | Form alert: try again |
| **UC-B14** | Partner | Send OTP (rate limit) | API returns `rate_limited` | Continue | Form alert: wait and retry |
| **UC-B15** | Partner | Loading state | Send in flight | Continue | Button disabled / loading |

### C. OTP step

| ID | Persona | Use case | Preconditions | Main flow | Postcondition |
|----|---------|----------|---------------|-----------|---------------|
| **UC-C20** | Partner | View OTP form | After successful send | 6-digit input, resend, back | Email shown for context |
| **UC-C21** | Partner | Invalid format | &lt; 6 digits or non-numeric | Verify | Field error |
| **UC-C22** | Partner | Valid code | Correct OTP | Auto/submit verify | Success step |
| **UC-C23** | Partner | Wrong code | Mismatch | Verify | "That code does not match" |
| **UC-C24** | Partner | Expired code | Expired OTP | Verify | "This code has expired. Request a new one." |
| **UC-C25** | Partner | Resend OTP | Cooldown elapsed | Resend | New send; cooldown resets |
| **UC-C26** | Partner | Resend blocked | Cooldown active | Resend | Button disabled with countdown |
| **UC-C27** | Partner | Back to email | On OTP step | Back | Email step; cooldown cleared |
| **UC-C28** | Partner | Paste OTP | Clipboard 6 digits | Paste into grouped input | Verify succeeds (tested) |

### D. Success step

| ID | Persona | Use case | Preconditions | Main flow | Postcondition |
|----|---------|----------|---------------|-----------|---------------|
| **UC-D30** | Partner | Verified confirmation | OTP ok | Success panel | Shows email; welcome alert |
| **UC-D31** | Partner | Continue to chat | Success | "Go to chat" | Navigates to `/chat` (demo; not dashboard) |
| **UC-D32** | Partner | Return home | Success | Home | Navigates to `/` |

| ID | Persona | Note |
|----|---------|------|
| **UC-D31a** | Partner | **Target:** primary CTA → `/dashboard` with authenticated session. |

### E. Production delivery (target)

| ID | Persona | Use case | Preconditions | Main flow | Postcondition |
|----|---------|----------|---------------|-----------|---------------|
| **UC-E40** | Platform | Send OTP email | `RESEND_API_KEY`, verified domain | `sendPartnerOtpEmail` | User receives 6-digit code |
| **UC-E41** | Platform | OTP TTL | Code issued | Verify within 10 minutes | Valid; after TTL → expired |
| **UC-E42** | Platform | Partner session | Verify success | Set httpOnly cookie | `/dashboard` accessible |

### F. Negative and edge cases

| ID | Persona | Expected behavior |
|----|---------|-------------------|
| **UC-F50** | Partner | Mock dev code `123456` succeeds locally |
| **UC-F51** | Partner | Mock `000000` → expired; `111111` → invalid |
| **UC-F52** | Partner | Unverified email domain | Policy TBD; API may reject |
| **UC-F53** | Partner | Double submit on email step | Idempotent send or rate limit |

## Behavior (product rules)

1. **Separate from reporter auth:** Partner OTP lives at `/auth/email`; case credentials at `/auth` and `/access`. Copy and navigation must not conflate the two.

2. **Pluggable client:** `EmailOtpFlow` accepts optional `client?: OtpClient` for tests and production wiring; default is mock.

3. **Resend cooldown:** 30 seconds in production UI (2 seconds under `NODE_ENV=test` for Vitest).

4. **No secrets in UI:** OTP is never displayed on screen except in dev mock documentation.

5. **feat-0013:** Production send uses Resend transactional email; HTML template is minimal until React Email templates land.

6. **Post-auth (target):** Verified partners receive a server session; unauthenticated users cannot load investigator routes.

7. **Success navigation (today):** Links to general chat and marketing home — acceptable for demo, not for production partner UX.

## What's needed to work (checklist)

| Requirement | Demo (today) | Production (target) |
|-------------|--------------|---------------------|
| Open `/auth/email` | Yes | Yes |
| Valid email format | Client validation | Same + server |
| Receive OTP | Use mock code `123456` | Resend + real inbox |
| Verify OTP | Mock client | API route + hashed OTP store |
| Partner session | No | httpOnly cookie or token |
| Dashboard access | Stub, no gate | feat-0015 + auth middleware |

## Status

| Area | Status |
|------|--------|
| UI (email, OTP, success) | **Complete** |
| `useEmailOtpAuth` state machine | **Complete** |
| Vitest component tests | **Complete** |
| Mock OTP client | **Complete** |
| Resend / `sendPartnerOtpEmail` | **Library only** ([feat-0013](../feat-0013-transactional-email/PRODUCT.md)) |
| `/api/auth/otp` (or tRPC) | **Missing** |
| Partner session + dashboard gate | **Missing** |

## Open questions

1. Invite-only vs open partner registration? **Default:** invite-only; OTP only for allowlisted emails.

2. OTP length and alphabet? **Default:** 6 numeric digits (matches UI).

3. Session parity with case sessions? **Default:** separate cookie name and TTL for partner accounts.

4. Arabic copy for auth screens? **Default:** wrap strings in next-intl ([feat-0001](../feat-0001-i18n/PRODUCT.md)); auth components still English-only today.

## Related

- [feat-0005 PRODUCT](../feat-0005-anonymous-case-access/PRODUCT.md) — reporter credentials
- [feat-0013 PRODUCT](../feat-0013-transactional-email/PRODUCT.md) — Resend
- [feat-0015 PRODUCT](../feat-0015-investigator-dashboard/PRODUCT.md) — post-auth destination
- [feat-0001 PRODUCT](../feat-0001-i18n/PRODUCT.md) — locale routing
- `docs/access-and-identity-spec.md` — dual auth model
