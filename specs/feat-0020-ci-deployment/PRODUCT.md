# feat-0020: CI and deployment

## Summary

The monorepo uses **GitHub Actions CI** on push/PR to `main`/`master`: install with frozen lockfile, **Prisma generate**, **typecheck** (Turbo across packages), and **test** (Turbo). **Changesets** support internal version notes; packages are **private** with publishing disabled.

**There is no in-repo deployment workflow** (`.github/workflows/deploy.yml` removed). **No Dockerfile** ships with the app; production deploy is operator-defined (e.g. Vercel for `apps/web`, separate host for Hono API).

Complements [feat-0011](../feat-0011-data-layer/PRODUCT.md) (Prisma generate in CI) and [feat-0016](../feat-0016-hono-standalone-api/PRODUCT.md) (API package in typecheck graph).

## Problem

Contributors need a single green gate before merge. Without documented CI scope, teams assume deploy is automated or that Docker exists in-repo. Changesets clarify how internal package bumps are recorded even when nothing is published to npm.

## Non-goals

- Production deploy automation in this repository.
- Docker / Compose definitions (none present).
- Nx Cloud or Turbo Remote Cache configuration (optional future).
- E2E Playwright in default CI job (scripts exist at root; not in `ci.yml` today).
- npm publishing (`release` script prints disabled message).

## Actors

| Actor | Description |
|-------|-------------|
| **Contributor** | Opens PR; expects CI check job. |
| **Maintainer** | Merges when CI green; runs `pnpm changeset` for notable changes. |
| **Operator** | Deploys web/API outside this repo's workflows. |

## CI pipeline (product)

On `push` to `main`/`master` and on all `pull_request`:

| Step | Purpose |
|------|---------|
| Checkout | Source at ref |
| pnpm 10 | Match `packageManager` in root `package.json` |
| Node 22 | LTS alignment |
| `pnpm install --frozen-lockfile` | Reproducible deps |
| `pnpm --filter @safevoices/prisma run db:generate` | Prisma client for typecheck |
| `pnpm typecheck` | Turbo `typecheck` in all packages that define it |
| `pnpm test` | Turbo `test` across workspace |

**Green CI** means: install succeeds, generated client present, no TypeScript errors, unit tests pass per package scripts.

## Changesets (product)

| Command | Purpose |
|---------|---------|
| `pnpm changeset` | Author a changeset file in `.changeset/` |
| `pnpm version-packages` | Bump versions per changesets |
| `pnpm changeset status` | Preview pending bumps |

Config (`.changeset/config.json`):

- `access: restricted`, `changelog: false`, `commit: false`
- `privatePackages.version: false` — private packages not versioned for publish
- `baseBranch: main`

Publishing: **intentionally disabled** (`pnpm release` logs that monorepo is private/internal).

## Deployment (product, out of repo)

| App | Typical target | Notes |
|-----|----------------|-------|
| `apps/web` | Vercel / Node host | Next.js 15; set `NEXT_PUBLIC_SITE_URL`, AI keys |
| `apps/api` | Container or Node | Hono on `PORT`; CORS env |
| Jobs | External cron | [feat-0017](../feat-0017-retention-cleanup-jobs/PRODUCT.md) |

No `deploy.yml` — operators document runbooks separately.

## Use case catalog

### A. CI

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | PR validation | Branch with changes | Open PR | `check` job runs |
| **UC-A02** | Main branch push | Merge to main | Push | Same `check` job |
| **UC-A03** | Lockfile drift | `pnpm-lock.yaml` out of sync | CI install | Fails on `--frozen-lockfile` |
| **UC-A04** | Type error | TS regression | typecheck step | Job fails |
| **UC-A05** | Test failure | Broken test | test step | Job fails |
| **UC-A06** | Prisma schema change | Without generate | db:generate step | Client updated before tsc |

### B. Changesets

| ID | Use case | Main flow | Postcondition |
|----|----------|-----------|---------------|
| **UC-B10** | Record change | `pnpm changeset` | Markdown file in `.changeset/` |
| **UC-B11** | Version bump | Maintainer runs `version-packages` | Package.json bumps per policy |
| **UC-B12** | No publish | Release | Console message only |

### C. Local parity

| ID | Use case | Command |
|----|----------|---------|
| **UC-C20** | Pre-push check | `pnpm typecheck && pnpm test` |
| **UC-C21** | Prisma local | `pnpm --filter @safevoices/prisma run db:generate` |

### D. Not in CI (gaps)

| ID | Capability | Script exists |
|----|------------|---------------|
| **UC-D30** | E2E Playwright | `pnpm test:e2e` — not in `ci.yml` |
| **UC-D31** | Lint | `pnpm lint` — not in `ci.yml` |
| **UC-D32** | Build all | `pnpm build` — not in `ci.yml` |

## Behavior (product rules)

1. **CI is the merge gate** for type safety and unit tests; lint/build/e2e are contributor responsibility until added.

2. **Node 22 + pnpm 10** match local `.nvmrc` / `packageManager` expectations.

3. **Frozen lockfile** prevents undeclared dependency drift.

4. **Changesets** are optional for small fixes; required by team policy for user-visible releases (team norm, not enforced in CI).

5. **Deploy** is manual or platform-native (Vercel Git integration), not GitHub Actions in this repo.

## Acceptance criteria

| # | Criterion |
|---|-----------|
| AC-1 | `ci.yml` runs on PR and main/master push. |
| AC-2 | Prisma generate runs before typecheck. |
| AC-3 | Root `pnpm typecheck` and `pnpm test` succeed locally when CI succeeds. |
| AC-4 | No `deploy.yml` in `.github/workflows/`. |
| AC-5 | Changesets README documents private monorepo policy. |

## Open questions

1. Add `lint` and `build` to CI? **Default:** yes in follow-up PR.

2. Playwright in CI with secrets? **Default:** scheduled or optional workflow.

3. Turbo cache in GitHub Actions? **Default:** enable when build times hurt.

## Related

- [feat-0011 PRODUCT](../feat-0011-data-layer/PRODUCT.md) — Prisma
- [feat-0016 PRODUCT](../feat-0016-hono-standalone-api/PRODUCT.md) — API package in turbo graph
- `specs/README.md` — global run requirements
- `.changeset/README.md`
