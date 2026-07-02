# Specification gaps and ownership

Living index of known gaps between specs and implementation. Update this file when closing a gap or adding a new feat.

## Recommended specs (added)

| ID | Topic | PRODUCT | TECH | Blocks |
|----|-------|---------|------|--------|
| 0021 | Investigator workflow | [PRODUCT](./feat-0021-investigator-workflow/PRODUCT.md) | [TECH](./feat-0021-investigator-workflow/TECH.md) | Partner MVP |
| 0022 | Partner auth backend | [PRODUCT](./feat-0022-partner-auth-backend/PRODUCT.md) | [TECH](./feat-0022-partner-auth-backend/TECH.md) | 0021, dashboard |
| 0023 | Evidence pipeline | [PRODUCT](./feat-0023-evidence-pipeline/PRODUCT.md) | [TECH](./feat-0023-evidence-pipeline/TECH.md) | Upload UX |
| 0024 | Security and operations | [PRODUCT](./feat-0024-security-operations/PRODUCT.md) | [TECH](./feat-0024-security-operations/TECH.md) | Production |
| 0025 | Testing and release | [PRODUCT](./feat-0025-testing-release/PRODUCT.md) | [TECH](./feat-0025-testing-release/TECH.md) | Ship gate |

## Recently closed (reporter + partner MVP path)

| Item | Feat | Notes |
|------|------|-------|
| Reporter access `return` URL | 0005 | `safe-return-path.ts` + `CaseAccessFlow` |
| Stable API error codes | 0019 | Shared `@safevoices/trpc` handlers |
| `x-sv-extraction` on client | 0008 | Chat transport decodes header |
| Evidence presign upload | 0023 | `evidence-upload.ts` in reporting chat |
| Partner OTP API + session | 0022 | `/api/auth/partner/*`; mock gated by `NEXT_PUBLIC_MOCK_OTP` |
| Investigator dashboard data | 0021 | `/api/partner/cases/*` + queue/detail UI |
| Hono case route parity | 0016 | Shared `case-handlers` on `apps/api` |
| Hono partner + upload routes | 0016 | Shared `partner-handlers` + `upload-handlers` |
| Security headers + CSP | 0024 | `next.config.ts` |
| Purge cron endpoint | 0017, 0024 | `POST /api/internal/jobs/purge` + `runRetentionPurge` (memory) |
| Orphan upload cleanup | 0017 | `POST /api/internal/jobs/orphan-uploads` + Supabase list/delete |
| Deploy workflow | 0020 | `.github/workflows/deploy.yml` (post-CI gate) |
| Playwright E2E in CI | 0025 | Reporter, locale, partner specs |
| Investigator extraction labels | 0008, 0021 | `format-extraction.ts` + dashboard detail |
| Documentation page shell i18n | 0003, 0004 | Title, TOC, section headings en/ar |

## Incomplete implementations (remaining)

| Gap | Owner feat | Notes |
|-----|------------|-------|
| Submit email not wired | [0009](./feat-0009-case-submit-lifecycle/PRODUCT.md), [0013](./feat-0013-transactional-email/PRODUCT.md) | `sendCaseReceivedEmail` exists; anonymous MVP has no email |
| Resend in production | [0013](./feat-0013-transactional-email/PRODUCT.md) | Partner OTP logs code in dev when Resend unset |

## Recently closed (feat-0028)

| Item | Feat | Notes |
|------|------|-------|
| Message ↔ attachment linkage | 0028 | `messageAttachments` on chat POST; `CaseMessage.attachments` JSON |
| Storage URLs in chat bubbles | 0028 | Reporting chat sends `publicUrl` file parts after presign upload |
| Upload submit guard | 0026, 0028 | Presign + confirm return 409 when case submitted |

## Cross-cutting gaps (no dedicated feat yet)

| Gap | Suggested owner | Priority |
|-----|-----------------|----------|
| Marketing home body copy i18n | 0003, 0004 | Medium |
| Documentation body copy i18n | 0003, 0004 | Medium |
| Live tRPC (health only today) | 0012 | Low |
| Structured LLM extraction surfacing | 0008, AI_CHATBOT_SPEC | Low (reporter progress + investigator detail done) |
| Multi-tenant RBAC / admin console | **0021** (future) | Post-MVP |
| Reporter self-service (status portal) | Future feat | Post-MVP |
| Standalone crisis workflow doc | 0008 (in-product) | Low |
| Accessibility audit | **0025** | Medium |
| Contributor i18n guide | 0001 | Low |

## Broken references

| Reference | Status |
|-----------|--------|
| `docs/access-and-identity-spec.md` | Missing — use [feat-0005](./feat-0005-anonymous-case-access/PRODUCT.md) |
| `docs/chat-experience-spec.md` | Missing — use [feat-0008](./feat-0008-reporting-chat-ai/PRODUCT.md) |
| `docs/i18n.md` | Missing — use [feat-0001](./feat-0001-i18n/TECH.md) |

## Dependency graph (partner + evidence path)

```text
feat-0022 (partner auth)
    └── feat-0021 (investigator workflow)
            └── feat-0013 (email notifications)

feat-0010 (upload API)
    └── feat-0023 (evidence pipeline)
            └── feat-0021 (investigator download)

feat-0024 (security/ops) + feat-0025 (testing) → production ship
```

## Reporter MVP ship order

1. Close gaps in 0005–0009, 0019 (reporter path). **Done**
2. **0023** — evidence UI (optional for MVP). **Done**
3. **0022** → **0021** — partner path. **Done**
4. **0024** checklist + **0025** E2E in CI. **Done** (production checklist items still operator-owned)
