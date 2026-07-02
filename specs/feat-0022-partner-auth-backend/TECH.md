# feat-0022: Tech Spec — Partner authentication backend

## Context

See [`PRODUCT.md`](./PRODUCT.md). Wires [feat-0006](../feat-0006-email-otp-partner-auth/TECH.md) UI to server and [feat-0013](../feat-0013-transactional-email/TECH.md) email.

## Current implementation (mock)

| File | Behavior |
|------|----------|
| `apps/web/lib/auth-otp-mock.ts` | Client generates/verifies OTP |
| `apps/web/hooks/use-email-otp-auth.ts` | Calls mock |
| `apps/web/components/auth/email-otp-flow.tsx` | UI |
| `packages/emails/src/index.ts` | `sendPartnerOtpEmail` — **not called from web today** |

## Target API routes

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/api/auth/partner/otp` | `{ email }` | `{ ok: true }` |
| `POST` | `/api/auth/partner/verify` | `{ email, code }` | `{ ok: true }` + Set-Cookie |
| `POST` | `/api/auth/partner/logout` | — | Clear cookie |

Locale: unprefixed under `app/api/` ([feat-0002](../feat-0002-middleware-routing/TECH.md)).

## Cookie contract

| Name | Value | Attributes |
|------|-------|------------|
| `sv_partner_session` | Signed JWT or opaque session id | `HttpOnly; Path=/; Max-Age=28800` |

Signing: reuse pattern from reporter session in `apps/web/lib/case-access.ts` or shared `@safevoices/prisma` helper.

**Distinct from:** `sv_case_session` (reporter).

## OTP storage (target)

```prisma
model PartnerOtpChallenge {
  id        String   @id @default(cuid())
  email     String
  codeHash  String
  attempts  Int      @default(0)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([email])
}
```

Alternative: Redis `SET partner:otp:{email} {hash} EX 600`.

## Server flow (otp request)

```ts
// apps/web/app/api/auth/partner/otp/route.ts (planned)
// 1. validate email (Zod)
// 2. check allowlist / PartnerUser
// 3. rate limit by IP + email
// 4. generate 6-digit code
// 5. hash + upsert challenge
// 6. await sendPartnerOtpEmail({ to, code })
// 7. return { ok: true }
```

## Server flow (verify)

```ts
// 1. load challenge by email
// 2. check expiry, attempts < MAX
// 3. constant-time compare hash
// 4. delete challenge
// 5. create partner session (partnerUserId)
// 6. Set-Cookie sv_partner_session
```

## Client changes

| File | Change |
|------|--------|
| `use-email-otp-auth.ts` | `fetch('/api/auth/partner/otp')` / `verify` |
| `auth-otp-mock.ts` | Remove or gate behind `NEXT_PUBLIC_MOCK_OTP` |
| `email-otp-flow.test.ts` | Mock `fetch` |

## Env vars

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | Prod | Send OTP email |
| `EMAIL_FROM` | Optional | From address |
| `SAFEVOICES_SESSION_SECRET` | Prod | Sign cookies / hash pepper |
| `PARTNER_ALLOWLIST` | Dev MVP | Comma-separated emails |
| `OTP_MAX_ATTEMPTS` | Optional | Default 5 |
| `OTP_RESEND_COOLDOWN_SEC` | Optional | Default 60 |

## Error codes (extend feat-0019)

| Code | HTTP |
|------|------|
| `OTP_INVALID` | 401 |
| `OTP_EXPIRED` | 401 |
| `OTP_RATE_LIMITED` | 429 |
| `PARTNER_NOT_ALLOWED` | 403 (internal only; client sees generic) |

## Middleware (target)

```ts
// apps/web/middleware.ts — add partner guard
if (pathname.includes('/dashboard') && !hasPartnerSession(request)) {
  return redirectToSignIn(locale);
}
```

## Gaps

| Gap | Notes |
|-----|-------|
| Mock still default | Must flip for production |
| No `PartnerUser` seed | Add to `packages/prisma/src/seed.ts` |
| Hono parity | [feat-0016](../feat-0016-hono-standalone-api/TECH.md) optional |

## Testing

```bash
pnpm --filter @safevoices/web test
```

| Test | Assert |
|------|--------|
| `email-otp-flow.test.ts` | API integration with mocked Resend |
| New `partner-auth.test.ts` | Hash verify, rate limit |

## Related

- [feat-0022 PRODUCT](./PRODUCT.md)
- [feat-0006 TECH](../feat-0006-email-otp-partner-auth/TECH.md)
- [feat-0013 TECH](../feat-0013-transactional-email/TECH.md)
