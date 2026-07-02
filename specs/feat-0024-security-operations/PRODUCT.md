# feat-0024: Security and operations

## Summary

**Security and operations** is the cross-cutting spec for threat model, secrets/env matrix, data classification, retention enforcement, deployment runbook, and incident response for Safe Voices. It does not replace feature specs; it defines **non-functional requirements** that [feat-0021](../feat-0021-investigator-workflow/PRODUCT.md)–[feat-0025](../feat-0025-testing-release/PRODUCT.md) must satisfy before production.

**Status:** Partially implemented ad hoc across crypto ([feat-0011](../feat-0011-data-layer/PRODUCT.md)), middleware ([feat-0002](../feat-0002-middleware-routing/TECH.md)), and CI ([feat-0020](../feat-0020-ci-deployment/PRODUCT.md)); no consolidated runbook.

## Problem

Sensitive survivor reporting data spans browser sessions, encrypted fields, LLM calls, email, and object storage. Without a single security/ops spec, gaps (mock OTP, missing deploy workflow, unsigned headers) are easy to miss at ship time.

## Non-goals

- Formal SOC 2 certification process in this doc.
- Pen-test report (reference external engagement).
- Full disaster recovery multi-region architecture in v1.

## Threat model (summary)

| Threat | Mitigation | Owner feat |
|--------|------------|------------|
| Case secret brute force | Rate limit verify; high-entropy secrets | 0005, 0024 |
| Session hijack | HttpOnly cookies, TLS, short TTL | 0005, 0022 |
| OTP enumeration | Generic responses, rate limits | 0022 |
| XSS stealing secrets | No secret in localStorage; CSP | 0024 |
| IDOR on cases | Session bound to caseId | 0012 |
| LLM prompt injection | Reporting system prompt boundaries | 0008, AI spec |
| Data leak via logs | No PII in logs; structured codes only | 0019 |
| Storage bucket public read | Private bucket + signed URLs | 0023, 0024 |
| Insider abuse (partner) | Audit log, RBAC | 0021 |
| Retention violation | Scheduled purge + legal hold | 0017 |

## Data classification

| Data | Examples | At rest | In transit |
|------|----------|---------|------------|
| **Tier 1 — Secret** | Case secret, OTP codes | Hashed / encrypted | TLS only |
| **Tier 2 — Sensitive** | Chat transcript, extraction | Encrypted fields ([feat-0011](../feat-0011-data-layer/PRODUCT.md)) | TLS |
| **Tier 3 — Operational** | Tracking code, status | DB plaintext OK | TLS |
| **Tier 4 — Public** | Marketing copy | N/A | TLS |

## Environment matrix

| Variable | Dev | Staging | Prod | Notes |
|----------|-----|---------|------|-------|
| `DATABASE_URL` | Memory or local PG | PG | PG (Supabase) | Required prod |
| `SAFEVOICES_ENCRYPTION_KEY` | Dev key | Secret manager | Secret manager | 32-byte |
| `SAFEVOICES_SESSION_SECRET` | Dev | Secret | Secret | Cookie signing |
| `RESEND_API_KEY` | Optional | Required | Required | OTP + notifications |
| `OPENAI_API_KEY` / gateway | Optional | Required | Required | AI routes |
| `SUPABASE_*` | Optional | Required if uploads | Required | Evidence |
| `NEXT_PUBLIC_*` | Public | Public | Public | No secrets |

**Rule:** No production secrets in repo; `.env.example` documents keys only.

## Operations runbook (target)

### Deploy

1. Merge to `main` → CI green ([feat-0020](../feat-0020-ci-deployment/PRODUCT.md)).
2. Run `prisma migrate deploy` against prod DB.
3. Deploy web (Vercel or container) with env from secret store.
4. Smoke: `/en`, `/ar`, `/access`, health check.
5. Verify Resend domain + Supabase bucket policies.

### Rollback

1. Revert deployment artifact.
2. DB: forward-only migrations; use compensating migration if needed.

### Incidents

| Severity | Example | Action |
|----------|---------|--------|
| S1 | Active data breach | Rotate keys, disable partner login, notify legal |
| S2 | OTP spam / abuse | Tighten rate limits, Resend pause |
| S3 | AI outage | Degraded mode message in chat |

### Retention

- Default reporter data TTL: align with [feat-0017](../feat-0017-retention-cleanup-jobs/PRODUCT.md) (document days in PRODUCT).
- `legalHold` skips purge.
- Cron: external scheduler hits purge job or `apps/api` worker.

## Security headers (target)

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000` (prod) |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | Tighten incrementally; allow AI/stream endpoints |

Configure in `next.config.ts` or middleware.

## Access control summary

| Surface | Auth |
|---------|------|
| Reporter chat | `sv_case_session` |
| Partner dashboard | `sv_partner_session` ([feat-0022](../feat-0022-partner-auth-backend/PRODUCT.md)) |
| `/api/*` | Route-specific |
| Marketing | Public |

## Acceptance criteria (target)

1. Env matrix documented and `.env.example` complete.
2. No mock OTP in production build flag.
3. Evidence bucket not publicly listable.
4. Deploy runbook executed once on staging.
5. Security headers present on prod responses.

## Related

- [feat-0011 PRODUCT](../feat-0011-data-layer/PRODUCT.md) — encryption
- [feat-0017 PRODUCT](../feat-0017-retention-cleanup-jobs/PRODUCT.md) — purge
- [feat-0020 PRODUCT](../feat-0020-ci-deployment/PRODUCT.md) — CI
- [feat-0025 PRODUCT](../feat-0025-testing-release/PRODUCT.md) — ship checklist
