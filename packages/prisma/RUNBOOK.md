# Safe Voices database runbook

Operator guide for local development and production Postgres (Supabase).

## Prerequisites

```bash
pnpm install
pnpm --filter @safevoices/prisma run db:generate
```

Set `SAFEVOICES_SECRET_PEPPER` in every non-ephemeral environment (never use the dev default in production).

## Local development (SQLite)

```bash
export DATABASE_URL="file:./packages/prisma/dev.db"
pnpm --filter @safevoices/prisma exec prisma migrate dev
```

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `file:./packages/prisma/dev.db` |
| `CASE_STORE` | Unset (auto-selects Prisma when `DATABASE_URL` is set) |

To force in-memory stores (no DB file):

```bash
unset DATABASE_URL
export CASE_STORE=memory
```

## Production (Supabase PostgreSQL)

1. Create a Supabase project and copy the **connection pooling** URI (`postgresql://…`).
2. Set secrets on the hosting platform (`apps/web` and `apps/api` if both run):

```bash
DATABASE_URL=postgresql://...
SAFEVOICES_SECRET_PEPPER=<rotated-secret>
```

3. Apply migrations:

```bash
pnpm --filter @safevoices/prisma exec prisma migrate deploy
```

4. Verify:

```bash
pnpm --filter @safevoices/prisma exec prisma migrate status
```

If the schema provider in `schema.prisma` is still `sqlite`, switch to `postgresql` before your first production migration, or bootstrap with `prisma db push` once and baseline migrations with `prisma migrate resolve`.

## Shared state across processes

Next.js (`:3000`) and Hono (`:8787`) must use the **same** `DATABASE_URL`. Without it, each process uses an isolated in-memory store.

## Seed (optional)

```bash
DATABASE_URL="file:./packages/prisma/dev.db" pnpm --filter @safevoices/prisma run db:seed
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
| SQLite (dev) | Copy `dev.db`; not for production |
| Postgres (Supabase) | Enable automated backups; test restore quarterly |

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Cases missing between web and API | Same `DATABASE_URL` on both processes |
| `PrismaClient` validation on build | Lazy client — ensure `DATABASE_URL` only required at runtime |
| Migrate fails on CI | Run `db:generate` before typecheck |
| Upload orphans accumulate | Supabase env + `orphan-uploads` cron |

## Related specs

- [feat-0011 TECH](../../specs/feat-0011-data-layer/TECH.md)
- [feat-0024 TECH](../../specs/feat-0024-security-operations/TECH.md)
- [feat-0017 TECH](../../specs/feat-0017-retention-cleanup-jobs/TECH.md)
