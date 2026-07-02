# feat-0006: Tech Spec — Email OTP (partner auth)

## Context

See [`PRODUCT.md`](./PRODUCT.md). Partner sign-in is a **client-only** flow today: `EmailOtpFlow` defaults to `createMockOtpClient()` from `auth-otp-mock.ts`. Resend helpers exist in `@safevoices/emails` but are not called from web routes.

## Route map

| URL | File | Notes |
|-----|------|-------|
| `/{locale}/auth/email` | `apps/web/app/[locale]/auth/email/page.tsx` | Renders `<EmailOtpFlow />` |
| `/{locale}/auth` | `apps/web/app/[locale]/auth/page.tsx` | Reporter `CaseAccessFlow` (not this feat) |
| `/{locale}/dashboard` | `apps/web/app/[locale]/dashboard/page.tsx` | Links to `/auth/email`; no auth middleware |

Layout metadata: `apps/web/app/[locale]/auth/layout.tsx` — title "Sign in", OTP description.

## Web modules

| Module | Role |
|--------|------|
| `components/auth/email-otp-flow.tsx` | Orchestrates steps; injectable `OtpClient` |
| `hooks/use-email-otp-auth.ts` | Step state, validation, cooldown, send/verify |
| `components/auth/email-form.tsx` | Email card + Continue |
| `components/auth/otp-form.tsx` | OTP input, resend, back |
| `components/auth/success-panel.tsx` | Post-verify CTAs (`/chat`, `/`) |
| `components/auth/auth-layout.tsx` | Shared title shell |
| `lib/auth-otp-types.ts` | `OtpClient`, result types |
| `lib/auth-otp-mock.ts` | Deterministic mock for dev/tests |
| `lib/validate-email.ts` | Format check shared with mock |

## OtpClient contract

```ts
// apps/web/lib/auth-otp-types.ts
export type OtpClient = {
    sendOtp: (email: string) => Promise<SendOtpResult>;
    verifyOtp: (email: string, code: string) => Promise<VerifyOtpResult>;
};
```

**Target production client:** `fetch('/api/auth/otp/send')` and `fetch('/api/auth/otp/verify')` or tRPC mutations returning the same result shapes.

## Mock client (dev / tests)

| Constant | Behavior |
|----------|----------|
| `MOCK_OTP_SUCCESS_CODE` (`123456`) | Verify succeeds |
| `MOCK_OTP_EXPIRED_CODE` (`000000`) | `error: 'expired'` |
| `MOCK_OTP_INVALID_CODE` (`111111`) | `error: 'invalid'` |
| Other 6-digit codes | `invalid` |

Options: `sendDelayMs`, `verifyDelayMs`, `failNextSendWith`, `failNextVerifyWith`.

`EmailOtpFlow` stores mock in `useRef` so identity is stable across renders.

## Resend (not wired)

```ts
// packages/emails/src/index.ts
export async function sendPartnerOtpEmail(input: {
    to: string;
    code: string;
}): Promise<{ ok: boolean }>
```

Requires `RESEND_API_KEY`, optional `EMAIL_FROM` (default `noreply@thesafevoices.org`). See `packages/emails/.env.example`.

**Gap:** no API route generates OTP, persists hash, or calls `sendPartnerOtpEmail`.

## API surface (target)

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/api/auth/otp/send` | `{ email }` | `{ ok: true }` or error + rate limit |
| `POST` | `/api/auth/otp/verify` | `{ email, code }` | `{ ok: true, sessionToken? }` + Set-Cookie |

Suggested storage: hashed OTP + expiry per email (Redis or DB table); max attempts; link to `PartnerUser` when feat-0015 schema exists.

## Environment

| Variable | Package | Required for real OTP |
|----------|---------|------------------------|
| `RESEND_API_KEY` | `packages/emails` | Yes |
| `EMAIL_FROM` | `packages/emails` | No (has default) |
| Partner session secret | TBD | Yes (production) |

Web `.env.example` does not yet list `RESEND_API_KEY` (emails package only).

## State machine (`useEmailOtpAuth`)

```
email --[valid sendOtp ok]--> otp --[verifyOtp ok]--> success
  ^                            |
  +-------- goBackToEmail ------+
```

| State | Key UI flags |
|-------|----------------|
| `email` | `emailFieldError`, `sendingOtp` |
| `otp` | `otpFieldError`, `verifyingOtp`, `resendCooldownSec` |
| `success` | — |

Resend cooldown: `RESEND_COOLDOWN_SEC = process.env.NODE_ENV === 'test' ? 2 : 30`.

## Known gaps (audit)

| Gap | PRODUCT refs |
|-----|--------------|
| No `/api/auth/otp/*` routes | UC-E40–E42 |
| Mock client used in production page | UC-A04 |
| Success → `/chat` not `/dashboard` | UC-D31a |
| Auth strings not in `messages/*.json` | feat-0001 |
| No partner session cookie | UC-E42 |
| Dashboard has no auth guard | feat-0015 |
| Rate limiting server-side | UC-B14, UC-F53 |

## Testing

| Case | Location |
|------|----------|
| Email validation, OTP steps, resend cooldown, paste | `apps/web/components/auth/email-otp-flow.test.ts` |
| Hook unit tests | **None** (covered via component tests) |

```bash
pnpm --filter @safevoices/web exec vitest run components/auth/email-otp-flow.test.ts
pnpm --filter @safevoices/web run typecheck
```

Mock codes and 2s resend cooldown rely on `NODE_ENV=test` in Vitest.

## Related

- [feat-0013 TECH](../feat-0013-transactional-email/TECH.md) — Resend send helper
- [feat-0015 TECH](../feat-0015-investigator-dashboard/TECH.md) — protected dashboard
- [feat-0005 TECH](../feat-0005-anonymous-case-access/TECH.md) — reporter session (separate)
- `.agents/skills/resend/SKILL.md` — Resend integration patterns
