# Safe Voices — Feature Specifications

Specifications follow the **PRODUCT + TECH** pattern (`sample/feat-XXXX/`): each major capability has a product spec (behavior, use cases, acceptance) and a tech spec (routes, APIs, modules, env, gaps).

## How to read

| Document | Audience | Contents |
|----------|----------|----------|
| **PRODUCT.md** | PM, design, QA, stakeholders | Summary, actors, use-case catalog, behavior rules, what users need, acceptance criteria |
| **TECH.md** | Engineers | File map, API contracts, env vars, dependencies, implementation status, test commands, gaps |

## What you need to run the product (global)

| Requirement | Purpose |
|-------------|---------|
| Node 22+, pnpm 10 | Monorepo toolchain (`package.json`, `.github/workflows/ci.yml`) |
| `pnpm install` | Install workspace dependencies |
| `pnpm dev:web` | Next.js app on port 3000 (or next free port) |
| `AI_GATEWAY_API_KEY` | Streaming AI chat (`packages/ai`) |
| `SAFEVOICES_SECRET_PEPPER` | Production session/credential crypto (`packages/prisma/src/crypto.ts`) |
| `DATABASE_URL` (optional) | Persistent cases; omit for in-memory dev store |

```bash
pnpm install
pnpm --filter @safevoices/prisma exec prisma generate
pnpm dev:web
```

## Feature index

| ID | Feature | PRODUCT | TECH | Status |
|----|---------|---------|------|--------|
| 0001 | Internationalization (en / ar, RTL) | [PRODUCT](./feat-0001-i18n/PRODUCT.md) | [TECH](./feat-0001-i18n/TECH.md) | Complete |
| 0002 | Middleware and locale routing | [PRODUCT](./feat-0002-middleware-routing/PRODUCT.md) | [TECH](./feat-0002-middleware-routing/TECH.md) | Complete |
| 0003 | Marketing landing page | [PRODUCT](./feat-0003-marketing-landing/PRODUCT.md) | [TECH](./feat-0003-marketing-landing/TECH.md) | Complete |
| 0004 | Documentation hub | [PRODUCT](./feat-0004-documentation-hub/PRODUCT.md) | [TECH](./feat-0004-documentation-hub/TECH.md) | Complete (EN content) |
| 0005 | Anonymous case access | [PRODUCT](./feat-0005-anonymous-case-access/PRODUCT.md) | [TECH](./feat-0005-anonymous-case-access/TECH.md) | Complete (Next.js) |
| 0006 | Email OTP (partner auth) | [PRODUCT](./feat-0006-email-otp-partner-auth/PRODUCT.md) | [TECH](./feat-0006-email-otp-partner-auth/TECH.md) | UI only; mock backend |
| 0007 | General AI chat (demo) | [PRODUCT](./feat-0007-general-ai-chat/PRODUCT.md) | [TECH](./feat-0007-general-ai-chat/TECH.md) | Complete |
| 0008 | Reporting chat and AI intake | [PRODUCT](./feat-0008-reporting-chat-ai/PRODUCT.md) | [TECH](./feat-0008-reporting-chat-ai/TECH.md) | Mostly complete |
| 0009 | Case submit and lifecycle | [PRODUCT](./feat-0009-case-submit-lifecycle/PRODUCT.md) | [TECH](./feat-0009-case-submit-lifecycle/TECH.md) | Submit only |
| 0010 | Evidence upload and storage | [PRODUCT](./feat-0010-evidence-upload-storage/PRODUCT.md) | [TECH](./feat-0010-evidence-upload-storage/TECH.md) | Superseded by [0026](./feat-0026-image-upload/PRODUCT.md) |
| 0011 | Data layer (Prisma / memory store) | [PRODUCT](./feat-0011-data-layer/PRODUCT.md) | [TECH](./feat-0011-data-layer/TECH.md) | Core complete |
| 0012 | API contracts (Zod) | [PRODUCT](./feat-0012-api-contracts/PRODUCT.md) | [TECH](./feat-0012-api-contracts/TECH.md) | Complete |
| 0013 | Transactional email | [PRODUCT](./feat-0013-transactional-email/PRODUCT.md) | [TECH](./feat-0013-transactional-email/TECH.md) | Library only |
| 0014 | UI kit and chat primitives | [PRODUCT](./feat-0014-ui-kit/PRODUCT.md) | [TECH](./feat-0014-ui-kit/TECH.md) | Complete |
| 0015 | Investigator dashboard | [PRODUCT](./feat-0015-investigator-dashboard/PRODUCT.md) | [TECH](./feat-0015-investigator-dashboard/TECH.md) | Stub |
| 0016 | Hono standalone API | [PRODUCT](./feat-0016-hono-standalone-api/PRODUCT.md) | [TECH](./feat-0016-hono-standalone-api/TECH.md) | Partial parity |
| 0017 | Retention and cleanup jobs | [PRODUCT](./feat-0017-retention-cleanup-jobs/PRODUCT.md) | [TECH](./feat-0017-retention-cleanup-jobs/TECH.md) | Stub |
| 0018 | SEO, PWA, and metadata | [PRODUCT](./feat-0018-seo-pwa-metadata/PRODUCT.md) | [TECH](./feat-0018-seo-pwa-metadata/TECH.md) | Complete |
| 0019 | API errors and client translation | [PRODUCT](./feat-0019-api-errors-i18n/PRODUCT.md) | [TECH](./feat-0019-api-errors-i18n/TECH.md) | Complete |
| 0020 | CI and deployment | [PRODUCT](./feat-0020-ci-deployment/PRODUCT.md) | [TECH](./feat-0020-ci-deployment/TECH.md) | CI only |
| 0021 | Investigator workflow | [PRODUCT](./feat-0021-investigator-workflow/PRODUCT.md) | [TECH](./feat-0021-investigator-workflow/TECH.md) | Spec only |
| 0022 | Partner auth backend | [PRODUCT](./feat-0022-partner-auth-backend/PRODUCT.md) | [TECH](./feat-0022-partner-auth-backend/TECH.md) | Spec only |
| 0023 | Evidence pipeline | [PRODUCT](./feat-0023-evidence-pipeline/PRODUCT.md) | [TECH](./feat-0023-evidence-pipeline/TECH.md) | Superseded by [0026](./feat-0026-image-upload/PRODUCT.md) |
| 0024 | Security and operations | [PRODUCT](./feat-0024-security-operations/PRODUCT.md) | [TECH](./feat-0024-security-operations/TECH.md) | Spec only |
| 0025 | Testing and release | [PRODUCT](./feat-0025-testing-release/PRODUCT.md) | [TECH](./feat-0025-testing-release/TECH.md) | Spec only |
| 0026 | Image upload | [PRODUCT](./feat-0026-image-upload/PRODUCT.md) | [TECH](./feat-0026-image-upload/TECH.md) | Canonical; partial impl |

See [SPEC_GAPS.md](./SPEC_GAPS.md) for gap ownership and ship order.

## Legacy monolithic specs

These predate the feat split; prefer the feat docs above for ownership. They remain useful for deep chat/media detail.

| Document | Scope |
|----------|--------|
| [IMAGE_UPLOAD_SPEC.md](./IMAGE_UPLOAD_SPEC.md) | Index → [feat-0026](./feat-0026-image-upload/PRODUCT.md) |
| [AI_CHATBOT_SPEC.md](./AI_CHATBOT_SPEC.md) | Broad chat + architecture reference |
| [AI_CHAT_IMAGE_CONTEXT.md](./AI_CHAT_IMAGE_CONTEXT.md) | Media, voice, attachment pipeline detail |

## Cross-feature reporter journey

```text
/{locale} (marketing) → /{locale}/access (feat-0005)
  → verify session cookie → /{locale}/chat?caseId=… (feat-0008)
  → submit (feat-0009) → read-only chat
```

## Related docs outside `specs/`

- [SPEC_GAPS.md](./SPEC_GAPS.md) — gap index and implementation status
- `docs/access-and-identity-spec.md` — missing; see [feat-0005](./feat-0005-anonymous-case-access/PRODUCT.md)
- `docs/chat-experience-spec.md` — missing; see [feat-0008](./feat-0008-reporting-chat-ai/PRODUCT.md)
