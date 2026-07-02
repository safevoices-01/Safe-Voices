# feat-0013: Transactional email (Resend)

## Summary

**Safe Voices** sends transactional email through a thin **`@safevoices/emails`** library that calls the [Resend](https://resend.com) HTTP API. Two product-facing helpers exist:

1. **`sendCaseReceivedEmail`** — acknowledges that an anonymous report was received (references `caseId`).
2. **`sendPartnerOtpEmail`** — delivers a one-time partner sign-in code.

**Status: Library only.** Functions are exported and callable but **not wired** into case submit ([feat-0009](../feat-0009-case-submit-lifecycle/PRODUCT.md)) or partner OTP flows ([feat-0006](../feat-0006-email-otp-partner-auth/PRODUCT.md), which uses a mock today).

Complements [feat-0006](../feat-0006-email-otp-partner-auth/PRODUCT.md), [feat-0009](../feat-0009-case-submit-lifecycle/PRODUCT.md), and [feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md) (status notifications mentioned in dashboard copy).

## Problem

Reporters and partners expect email confirmation at key moments. Without a shared email module, each feature would embed Resend calls, duplicate env handling, and diverge on from-address and templates. Product needs clarity on what is implemented vs what still requires integration and React Email templates.

## Non-goals

- Marketing newsletters or drip campaigns.
- Inbound email parsing.
- Full React Email component library in repo (plain HTML strings today).
- Reporter email collection during anonymous chat (no email on file for case-received today).
- Webhook handling for bounces ([Resend webhooks](https://resend.com/docs/dashboard/webhooks/introduction) — future).
- SMS OTP.

## Actors

| Actor | Description |
|-------|-------------|
| **Reporter** | May receive "report received" if email is collected in a future flow. |
| **Partner investigator** | Receives OTP for dashboard sign-in ([feat-0006](../feat-0006-email-otp-partner-auth/PRODUCT.md)). |
| **Platform operator** | Configures Resend domain, API key, `EMAIL_FROM`. |
| **API layer** | Will invoke send helpers after submit / OTP mint (not done). |

## Email catalog

| Function | Subject (today) | Trigger (target) | Integrated |
|----------|-----------------|------------------|------------|
| `sendCaseReceivedEmail` | Safe Voices: report received | Case submit + email on file | **No** |
| `sendPartnerOtpEmail` | Safe Voices partner sign-in code | Partner OTP request | **No** |
| `sendTransactionalEmail` | Custom | Internal primitive | N/A |

## Use case catalog

### A. Configuration

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Send with API key | `RESEND_API_KEY` set | Call any send helper | Resend returns message `id` |
| **UC-A02** | Missing API key | Key unset | Call send helper | `{ ok: false, error: 'RESEND_API_KEY not configured' }` |
| **UC-A03** | From address | `EMAIL_FROM` optional | Send | Defaults to `noreply@thesafevoices.org` |
| **UC-A04** | Domain verification | Production domain | Resend dashboard | Emails deliver without spam flags |

### B. Case received (target integration)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Acknowledge submit | Case submitted; reporter email known | `sendCaseReceivedEmail({ to, caseId })` | Email queued with tracking code |
| **UC-B11** | Anonymous submit only | No email collected | Submit | No email sent (current product) |
| **UC-B12** | Resend failure | API error | Submit still succeeds | Log error; no user block |

### C. Partner OTP (target integration)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Send OTP | Valid partner email; code minted | `sendPartnerOtpEmail({ to, code })` | Email contains 6+ digit code |
| **UC-C21** | OTP expiry copy | Email sent | Body states 10-minute expiry | Matches server TTL ([feat-0006](../feat-0006-email-otp-partner-auth/PRODUCT.md)) |
| **UC-C22** | Rate limit | Abuse prevention | Throttle at API layer | Not in email package |

### D. Generic transactional

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D30** | Custom HTML email | API key | `sendTransactionalEmail({ to, subject, html })` | `{ ok, id? }` |
| **UC-D31** | Resend HTTP error | 4xx/5xx | Send | `{ ok: false, error: 'Resend error {status}' }` |

### E. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-E40** | HTML in `caseId` / `code` not escaped today — callers must pass trusted values |
| **UC-E41** | No retry/backoff in library |
| **UC-E42** | No idempotency key for duplicate submit emails |
| **UC-E43** | PII in logs — callers must not log full email bodies |

## Behavior (product rules)

1. **Email is best-effort** — case submit and OTP verification must not depend on delivery success.

2. **No email without explicit address** — anonymous reporters are not prompted for email in current flows.

3. **Partner OTP** replaces mock `auth-otp-mock.ts` when integrated ([feat-0006](../feat-0006-email-otp-partner-auth/PRODUCT.md)).

4. **From domain** must match verified Resend domain in production.

5. **Templates** should move to React Email ([`.agents/skills/resend`](../../.agents/skills/resend/SKILL.md)) before brand launch.

## Acceptance criteria

| # | Criterion |
|---|-----------|
| AC-1 | `sendTransactionalEmail` returns structured `{ ok, id?, error? }`. |
| AC-2 | Missing `RESEND_API_KEY` fails gracefully without throw. |
| AC-3 | `sendCaseReceivedEmail` and `sendPartnerOtpEmail` exported from `@safevoices/emails`. |
| AC-4 | **Target:** submit route calls case-received when email available. |
| AC-5 | **Target:** OTP API calls partner OTP send instead of mock. |

## What's needed to make it work

| Requirement | Owner | Notes |
|-------------|-------|-------|
| `RESEND_API_KEY` | Platform | Resend dashboard → API keys |
| Verified sending domain | Platform | SPF/DKIM via Resend |
| `EMAIL_FROM` | Platform | e.g. `Safe Voices <noreply@thesafevoices.org>` |
| Wire submit route | Engineering | After [feat-0009](../feat-0009-case-submit-lifecycle/PRODUCT.md) + optional email field |
| Wire OTP route | Engineering | Replace `apps/web/lib/auth-otp-mock.ts` |
| React Email templates | Design / engineering | Replace inline HTML |
| Rate limits + audit log | Engineering | On OTP endpoint |
| Bounce webhook | Platform | Optional deliverability monitoring |

## Open questions

1. Collect reporter email at submit? **Default:** optional field; never required for anonymous path.

2. Case-received email include tracking code only or no identifiers? **Default:** tracking code only; no secret.

3. Local dev without Resend? **Default:** log-to-console adapter or skip send when key missing.

## Related

- [feat-0006 PRODUCT](../feat-0006-email-otp-partner-auth/PRODUCT.md)
- [feat-0009 PRODUCT](../feat-0009-case-submit-lifecycle/PRODUCT.md)
- [feat-0015 PRODUCT](../feat-0015-investigator-dashboard/PRODUCT.md)
- Resend skill: `.agents/skills/resend/SKILL.md`
