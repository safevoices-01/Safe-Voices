# feat-0017: Tech Spec — Retention and cleanup jobs

## Context

See [`PRODUCT.md`](./PRODUCT.md). Job stubs live under `packages/prisma/src/jobs/`. They are **not** re-exported from `packages/prisma/src/index.ts` today; cron entrypoints should import directly or gain package exports when implemented.

## Job modules

| File | Export | Return type | Status |
|------|--------|-------------|--------|
| `packages/prisma/src/jobs/purge.ts` | `runRetentionPurge()` | `{ purged: number }` | Stub — always `purged: 0` |
| `packages/prisma/src/jobs/orphan-upload-cleanup.ts` | `cleanupOrphanUploads()` | `{ removed: number }` | Stub — always `removed: 0` |

### purge.ts (current)

```ts
/**
 * Stub purge job — wire to cron in deployment.
 * Skips cases with legalHold=true.
 */
export async function runRetentionPurge(): Promise<{ purged: number }> {
    // Implementation deferred until production Postgres + legal review.
    return { purged: 0 };
}
```

### orphan-upload-cleanup.ts (current)

```ts
/**
 * Removes storage objects not referenced in CaseMessage.attachments after 1 hour.
 * Wire to scheduled job when Supabase Storage is enabled.
 */
export async function cleanupOrphanUploads(): Promise<{ removed: number }> {
    return { removed: 0 };
}
```

## Schema dependencies

From `packages/prisma/schema.prisma`:

```prisma
model Case {
  legalHold Boolean @default(false)
  caseStatus CaseStatus @default(OPEN)
  // ... relations with onDelete: Cascade
}

model CaseMessage {
  attachments Json?
}

model CaseAttachment {
  url String
}
```

Purge implementation will likely:

1. `findMany` cases where `legalHold: false` AND retention predicate.
2. Delete storage objects for `CaseAttachment.url` / message attachment JSON.
3. `prisma.case.delete` (cascades children).

Orphan cleanup will likely:

1. List bucket objects older than 1 hour (Supabase Storage API).
2. Build set of referenced paths from `CaseMessage.attachments` + `CaseAttachment`.
3. Delete unreferenced keys.

## Intended cron wiring (out of repo)

No `.github/workflows/deploy.yml` or Docker image defines schedules. Expected operator patterns:

| Platform | Pattern |
|----------|---------|
| Vercel | Separate worker or external cron hitting protected admin endpoint |
| Kubernetes | `CronJob` running `node packages/prisma/dist/jobs/run-purge.js` |
| GitHub Actions | `schedule:` workflow dispatch (not in CI today) |
| Supabase | `pg_cron` or Edge Function schedule for orphan cleanup |

**Target CLI** (not implemented):

```bash
pnpm --filter @safevoices/prisma exec tsx src/jobs/run-purge.ts
```

## Environment (target)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres in production |
| `RETENTION_DAYS` | Days after terminal status before purge |
| `SUPABASE_URL` / service key | Orphan object listing/deletion |
| `SAFEVOICES_SECRET_PEPPER` | Unrelated to jobs; same package boundary |

## Implementation checklist

| Step | Owner | Status |
|------|-------|--------|
| Legal retention policy signed | Compliance | Open |
| Purge query + transaction | Engineering | Open |
| Storage delete helper (`apps/web/lib/supabase-storage.ts`) | Engineering | Partial |
| Export jobs from `@safevoices/prisma` | Engineering | Open |
| Unit tests with memory/ test DB | Engineering | Open |
| Dry-run flag | Engineering | Open |
| Runbook in ops docs | Platform | Open |

## Testing (target)

```bash
pnpm --filter @safevoices/prisma run test
```

Suggested cases:

- Case with `legalHold: true` not counted in `purged`.
- Case past mock retention deleted with messages.
- Orphan file deleted; referenced file retained.

Today: no tests reference job stubs.

## Known gaps

| Gap | Notes |
|-----|-------|
| No implementation | Stubs only |
| Not in package exports | Import path is deep |
| SQLite dev datasource | Purge policy may differ from Postgres prod |
| No idempotency / locking | Design before multi-replica cron |
| feat-0010 upload route | Orphan job blocked until uploads write to Storage |

## Related

- [feat-0010 TECH](../feat-0010-evidence-upload-storage/TECH.md)
- [feat-0011 TECH](../feat-0011-data-layer/TECH.md)
- `packages/prisma/schema.prisma`
- `apps/web/lib/supabase-storage.ts`
