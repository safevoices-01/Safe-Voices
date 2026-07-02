# feat-0025: Testing and release

## Summary

**Testing and release** defines the test pyramid, CI scope, E2E strategy, release checklist, and versioning for Safe Voices. It extends [feat-0020](../feat-0020-ci-deployment/PRODUCT.md) (CI without deploy) into a shippable quality gate.

**Status:** Unit tests exist for web auth flows, AI reporting, i18n key parity; no Playwright E2E in CI; no release checklist enforced.

## Problem

Critical paths (access → chat → submit → partner review) lack automated E2E coverage. CI runs `typecheck` + `test` but not locale smoke or upload flows. Deploy workflow was removed; releases are undefined.

## Non-goals

- 100% line coverage mandate.
- Load testing in default CI (separate job optional).
- Visual regression suite in v1.

## Test pyramid

| Layer | Scope | Tool | CI today |
|-------|-------|------|----------|
| **Unit** | Pure functions, hooks, AI keywords | Vitest | Yes |
| **Integration** | API routes with memory store | Vitest + `fetch` | Partial |
| **E2E** | Reporter + partner journeys | Playwright | No |
| **i18n** | Key parity en/ar | Vitest | Yes |
| **Contract** | Zod schemas shared | Vitest | Partial |

## Critical user journeys (E2E target)

### Reporter (P0)

1. Land `/en` → navigate to access.
2. Create case → save tracking code + secret.
3. Open chat → send message → receive streamed reply (mock AI in CI).
4. Submit case → confirm read-only state.

### Reporter Arabic (P0)

1. `/ar` RTL layout smoke.
2. Access flow strings render Arabic.
3. API error toast translated.

### Partner (P1, after feat-0022)

1. Request OTP → verify (test email sink).
2. Open dashboard → see submitted case from reporter journey.

### Evidence (P1, after feat-0023)

1. Upload small PNG in chat → visible in thread.

## CI pipeline (target)

Current (`.github/workflows/ci.yml`):

```yaml
- pnpm install --frozen-lockfile
- pnpm --filter @safevoices/prisma run db:generate
- pnpm typecheck
- pnpm test
```

Target additions:

| Step | Purpose |
|------|---------|
| `pnpm lint` | ESLint across workspace |
| `pnpm --filter @safevoices/web exec playwright test` | E2E (chromium only) |
| Build `apps/web` | Catch Next build errors |
| Optional: `prisma migrate diff` | Schema drift check |

## Local commands

```bash
pnpm typecheck
pnpm test
pnpm --filter @safevoices/web test
pnpm --filter @safevoices/ai test
pnpm --filter @safevoices/web exec playwright test   # target
pnpm --filter @safevoices/web build
```

## Release process (target)

1. **Version** — Changesets ([`.changeset/`](../.changeset/)) for publishable packages; app deploys from `main` tag or Vercel Git integration.
2. **Changelog** — Aggregate feat specs + changeset summaries.
3. **Staging** — Deploy preview; run E2E against preview URL.
4. **Production** — Manual approval; run [feat-0024](../feat-0024-security-operations/PRODUCT.md) checklist.
5. **Post-deploy** — Smoke URLs `/en`, `/ar`, `/api/health` (if exists).

## Ship checklist (reporter MVP)

| # | Item | Feat |
|---|------|------|
| 1 | i18n en/ar key parity passes | 0001 |
| 2 | Access + session flows unit tests pass | 0005 |
| 3 | Chat streams with locale | 0007, 0008 |
| 4 | Submit locks case | 0009 |
| 5 | API errors translated | 0019 |
| 6 | No mock OTP in prod | 0022 |
| 7 | `DATABASE_URL` set (not memory-only) | 0011 |
| 8 | Encryption key not default | 0024 |
| 9 | E2E reporter journey green | 0025 |
| 10 | Staging smoke documented | 0024 |

## Test data

| Fixture | Location |
|---------|----------|
| Case seeds | `packages/testing/src/case-fixtures.ts` |
| Memory store | `getCaseStore()` when no `DATABASE_URL` |

E2E should use memory store or ephemeral test DB — never production.

## Acceptance criteria (target)

1. Playwright reporter P0 runs in CI on PRs to `main`.
2. `pnpm build` for web in CI.
3. `specs/SPEC_GAPS.md` updated when closing gaps.
4. Release checklist attached to production deploy runbook.

## Related

- [feat-0020 PRODUCT](../feat-0020-ci-deployment/PRODUCT.md)
- [feat-0024 PRODUCT](../feat-0024-security-operations/PRODUCT.md)
- [feat-0021](../feat-0021-investigator-workflow/PRODUCT.md) — E2E partner path
