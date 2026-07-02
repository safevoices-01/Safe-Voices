# feat-0020: Tech Spec — CI and deployment

## Context

See [`PRODUCT.md`](./PRODUCT.md). Single workflow `.github/workflows/ci.yml`. Former `deploy.yml` **deleted** (git status). No `Dockerfile` in repository.

## CI workflow

File: `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: [main, master]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @safevoices/prisma run db:generate
      - run: pnpm typecheck
      - run: pnpm test
```

### Step rationale

| Step | Why |
|------|-----|
| `db:generate` | `@safevoices/prisma` client must exist for imports in web/api |
| `typecheck` | `turbo run typecheck` — all packages with script |
| `test` | `turbo run test` — vitest / node:test per package |

Not run in CI today: `lint`, `build`, `test:e2e`, `format`.

## Root scripts (relevant)

From `package.json`:

```json
{
  "packageManager": "pnpm@10.28.2",
  "scripts": {
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:e2e": "playwright test",
    "lint": "turbo run lint",
    "build": "turbo run build",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "node -e \"console.log('release is disabled: private/internal monorepo')\""
  }
}
```

## Turbo graph (typecheck / test)

Packages with `typecheck` typically include:

- `@safevoices/web` — `tsc` / Next
- `@safevoices/api` — `tsc --noEmit`
- `@safevoices/prisma`, `@safevoices/ai`, `@safevoices/trpc`, `@safevoices/ui`, etc.

Verify locally:

```bash
pnpm install --frozen-lockfile
pnpm --filter @safevoices/prisma run db:generate
pnpm typecheck
pnpm test
```

Scoped tests:

```bash
pnpm test:unit      # ai, emails, prisma, testing, trpc, ui
pnpm test:integration  # api, web
```

## Prisma generate

```bash
pnpm --filter @safevoices/prisma run db:generate
```

Maps to `prisma generate` in `packages/prisma/package.json`. Required after `schema.prisma` changes.

## Changesets

| File | Role |
|------|------|
| `.changeset/config.json` | Changesets config |
| `.changeset/README.md` | Contributor docs |
| `.changeset/*.md` | Pending changeset entries (e.g. `forty-flowers-press.md` may be empty frontmatter) |

Config highlights:

```json
{
  "changelog": false,
  "commit": false,
  "access": "restricted",
  "baseBranch": "main",
  "privatePackages": { "version": false, "tag": false }
}
```

Dev dependency: `@changesets/cli` at root.

## Deployment (out of repo)

| Artifact | Suggested hosting |
|----------|-------------------|
| `apps/web` | Vercel (Next.js) — connect GitHub repo; build `pnpm --filter @safevoices/web build` |
| `apps/api` | Fly.io, Railway, ECS, etc. — `node`/`tsx` `src/server.ts` |
| Database | Managed Postgres when leaving in-memory store |
| Cron | [feat-0017](../feat-0017-retention-cleanup-jobs/TECH.md) external scheduler |

### Env at deploy (cross-ref)

| Var | App |
|-----|-----|
| `NEXT_PUBLIC_SITE_URL` | web |
| `AI_GATEWAY_API_KEY` | web + api |
| `DATABASE_URL`, `SAFEVOICES_SECRET_PEPPER` | web + api |
| `SAFEVOICES_CORS_ORIGINS` | api |

No Docker build context in repo — operators supply their own image if needed.

## Removed / absent

| Item | Status |
|------|--------|
| `.github/workflows/deploy.yml` | Deleted |
| `Dockerfile` | Not in repo |
| `docker-compose.yml` | Not in repo |
| npm publish in CI | Disabled by design |

## Recommended CI extensions (gaps)

| Addition | Command | Priority |
|----------|---------|----------|
| Lint | `pnpm lint` | High |
| Web build | `pnpm --filter @safevoices/web run build` | High |
| E2E | `pnpm test:e2e` with browser install | Medium |
| Turbo cache | `actions/cache` or Turbo remote | Low |

## Husky / lint-staged

Root has `husky` and `lint-staged` devDependencies; pre-commit behavior is local (not documented in `ci.yml`).

## Related

- [feat-0011 TECH](../feat-0011-data-layer/TECH.md)
- [feat-0016 TECH](../feat-0016-hono-standalone-api/TECH.md)
- [feat-0018 TECH](../feat-0018-seo-pwa-metadata/TECH.md) — `NEXT_PUBLIC_SITE_URL` at deploy
- `specs/README.md`
- `turbo.json` (if present) — pipeline definitions
