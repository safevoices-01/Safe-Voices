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

1. Create a Supabase project and copy the **transaction pooler** URI
   (`postgresql://…@…pooler.supabase.com:6543/postgres?pgbouncer=true`).
2. Set secrets on the hosting platform (`apps/web`):

```bash
DATABASE_URL=postgresql://...
SAFEVOICES_SECRET_PEPPER=<rotated-secret>
```

3. Apply migrations **before** or as part of first deploy (from a machine that
   can reach Supabase — use session-mode port `5432` if migrate fails on
   `pgbouncer=true`):

```bash
export DATABASE_URL="postgresql://…@…pooler.supabase.com:5432/postgres"
pnpm --filter @safevoices/prisma exec prisma migrate deploy
```

4. Verify:

```bash
pnpm --filter @safevoices/prisma exec prisma migrate status
```

5. Redeploy `apps/web` so the runtime uses the fixed Prisma client + adapter.

### Vercel checklist

| Env var | Required |
|---------|----------|
| `DATABASE_URL` | Yes (Postgres) |
| `SAFEVOICES_SECRET_PEPPER` | Yes |
| `AI_GATEWAY_API_KEY` | Yes (chat) |
| `CASE_STORE` | Leave unset |

If migrations are missing, `POST /api/cases` returns `500` /
`CASE_CREATE_FAILED` (tables do not exist).

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
