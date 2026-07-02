# feat-0024: Tech Spec — Security and operations

## Context

See [`PRODUCT.md`](./PRODUCT.md). Consolidates NFRs and operational procedures referenced across the monorepo.

## Crypto and sessions (implemented)

| Concern | Implementation |
|---------|----------------|
| Field encryption | `packages/prisma/src/crypto.ts` — `SAFEVOICES_ENCRYPTION_KEY` |
| Case session | `apps/web/lib/case-access.ts` — signed cookie |
| Reporter verify rate limit | Case store / route handlers ([feat-0005](../feat-0005-anonymous-case-access/TECH.md)) |

## Gaps (security)

| Gap | Risk | Remediation |
|-----|------|-------------|
| Partner OTP mock | High | [feat-0022](../feat-0022-partner-auth-backend/TECH.md) |
| No CSP | Medium | Add to `next.config.ts` headers |
| `x-sv-extraction` unused on client | Low | Remove or wire in [feat-0008](../feat-0008-reporting-chat-ai/TECH.md) |
| Hono errors without `code` | Medium | Align with [feat-0019](../feat-0019-api-errors-i18n/TECH.md) |
| Deploy workflow deleted | Ops | Restore in [feat-0020](../feat-0020-ci-deployment/TECH.md) |

## Env example (target `.env.example` at repo root)

```bash
# Database
DATABASE_URL=

# Crypto / sessions
SAFEVOICES_ENCRYPTION_KEY=
SAFEVOICES_SESSION_SECRET=

# Email
RESEND_API_KEY=
EMAIL_FROM=noreply@thesafevoices.org

# AI
OPENAI_API_KEY=

# Supabase (evidence)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=case-evidence

# Optional
PARTNER_ALLOWLIST=
OTP_MAX_ATTEMPTS=5
```

## Next.js headers (target)

```ts
// apps/web/next.config.ts
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ],
  }];
}
```

## Supabase storage policy (target)

- Bucket: **private**
- Reporter upload: server uses service role; path `cases/{caseId}/{attachmentId}`
- Investigator download: signed URL from server only
- No `anon` INSERT on production bucket

## Logging policy

| Do log | Do not log |
|--------|------------|
| `caseId`, `trackingCode`, error `code` | Message plaintext, secrets, OTP |
| Request duration, status | Email addresses in prod info logs |

Use structured JSON in API routes; avoid `console.log` of bodies in prod.

## Retention job wiring

| Piece | Path |
|-------|------|
| Purge logic | `packages/prisma/src/jobs/purge.ts` |
| Trigger | Cron → `POST /internal/jobs/purge` with `CRON_SECRET` (target) |
| Legal hold | `Case.legalHold === true` skip |

## Monitoring (target)

| Signal | Tool |
|--------|------|
| Uptime | Vercel / synthetic |
| 5xx rate | Platform logs |
| Resend bounces | Resend webhooks ([feat-0013](../feat-0013-transactional-email/TECH.md)) |
| Failed OTP rate | Custom metric |

## Production checklist (cross-ref feat-0025)

- [ ] `DATABASE_URL` + migrations applied
- [ ] Encryption key rotated from dev default
- [ ] Mock OTP disabled
- [ ] Resend domain verified
- [ ] Supabase bucket private
- [ ] Partner allowlist populated
- [ ] CI green on `main`
- [ ] Smoke E2E on staging

## Related

- [feat-0024 PRODUCT](./PRODUCT.md)
- [feat-0025 TECH](../feat-0025-testing-release/TECH.md)
