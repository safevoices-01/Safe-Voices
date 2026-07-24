# Safe Voices database runbook

Operator guide for local development and production Postgres (Supabase).

## Prerequisites

```bash
pnpm install
pnpm --filter @safevoices/prisma run db:generate
```

Set `SAFEVOICES_SECRET_PEPPER` in every non-ephemeral environment (never use the
dev default in production).

## Local development

### Option A — in-memory (fastest)

```bash
unset DATABASE_URL
# or: export CASE_STORE=memory
pnpm dev:web
```

No migrations needed. Data is lost on process restart.

### Option B — PostgreSQL (matches production)

```bash
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/safevoices"
pnpm --filter @safevoices/prisma exec prisma migrate deploy
pnpm --filter @safevoices/prisma run db:generate
```

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://…` (required for Prisma store) |
| `CASE_STORE` | Unset (auto-selects Prisma when `DATABASE_URL` is set) |

Prisma 7 uses `@prisma/adapter-pg`. SQLite `file:` URLs are **not** supported at
runtime.

## Production (Supabase PostgreSQL)

Vercel **web build** runs `db:migrate:deploy` automatically before `next build`
(`apps/web` → `packages/prisma/scripts/migrate-deploy.mjs`).

1. Create a Supabase project.
2. Set secrets on Vercel (`apps/web` / Production):

```bash
# App runtime (transaction pooler)
DATABASE_URL=postgresql://…@…pooler.supabase.com:6543/postgres?pgbouncer=true

# Migrations during deploy (session pooler) — strongly recommended
DIRECT_URL=postgresql://…@…pooler.supabase.com:5432/postgres

SAFEVOICES_SECRET_PEPPER=<rotated-secret>
```

3. Deploy. The build will apply pending migrations. If only `DATABASE_URL`
   (pooler) is set, the script rewrites `:6543` → `:5432` and strips
   `pgbouncer=true` for migrate. Prefer setting `DIRECT_URL` explicitly.

4. Verify after deploy:

```bash
export DATABASE_URL="postgresql://…@…pooler.supabase.com:5432/postgres"
pnpm --filter @safevoices/prisma run db:migrate:status
```

### Vercel checklist

| Env var | Required |
|---------|----------|
| `DATABASE_URL` | Yes — Supabase **transaction pooler** (`:6543?pgbouncer=true`) |
| `DIRECT_URL` | Strongly recommended — session pooler (`:5432`) for migrate-on-deploy |
| `SAFEVOICES_SECRET_PEPPER` | Yes (non-dev value) |
| `GOOGLE_GENERATIVE_AI_API_KEY` or `AI_GATEWAY_API_KEY` | Yes (chat) |
| `CASE_STORE` | Leave unset |

Manual migrate (optional / recovery):

```bash
export DIRECT_URL="postgresql://…@…pooler.supabase.com:5432/postgres"
pnpm --filter @safevoices/prisma run db:migrate:deploy
```

If `POST /api/cases` returns `DATABASE_UNAVAILABLE` / 503:

1. Confirm the Supabase project is **Active** (not paused).
2. Re-copy the pooler URI and password (URL-encode special characters).
3. Confirm Vercel has `DATABASE_URL` (+ `DIRECT_URL`) and redeploy so migrate runs.
4. Check build logs for `[prisma] Migrations applied.`

## Shared state across processes

Next.js (`:3000`) and Hono (`:8787`) must use the **same** `DATABASE_URL`.
Without it, each process uses an isolated in-memory store.

## Seed (optional)

```bash
DATABASE_URL="postgresql://…" pnpm --filter @safevoices/prisma run db:seed
```

## Retention and storage jobs

Configure cron to call the web app (Bearer `CRON_SECRET`):

| Job | Endpoint |
|-----|----------|
| Case purge | `POST /api/internal/jobs/purge` |
| Orphan uploads | `POST /api/internal/jobs/orphan-uploads` |

| Variable | Default | Purpose |
|----------|---------|---------|
| `RETENTION_DAYS` | `90` | Terminal case age before purge |
| `ORPHAN_UPLOAD_AGE_MS` | `3600000` | Unreferenced upload age |
| `CRON_SECRET` | — | Bearer token for job routes |

Cases with `legalHold = true` are never purged.

## Backup and recovery

| Provider | Recommendation |
|----------|----------------|
| Postgres (Supabase) | Enable automated backups; test restore quarterly |

## Troubleshooting

| Symptom | Check |
|---------|-------|
| `POST /api/cases` 500 | Logs: Prisma needs adapter + Postgres URL; run `migrate deploy` |
| `client engine requires adapter` | Ensure deploy includes `@prisma/adapter-pg` and updated `client.ts` |
| Cases missing between web and API | Same `DATABASE_URL` on both processes |
| Migrate fails on pooler `:6543` | Use session mode `:5432` for migrate |
| `PrismaClient` validation on build | Lazy client — `DATABASE_URL` only required at runtime |
| Upload orphans accumulate | Supabase env + `orphan-uploads` cron |

## Related specs

- [feat-0011 TECH](../../specs/feat-0011-data-layer/TECH.md)
- [feat-0024 TECH](../../specs/feat-0024-security-operations/TECH.md)
- [feat-0017 TECH](../../specs/feat-0017-retention-cleanup-jobs/TECH.md)
