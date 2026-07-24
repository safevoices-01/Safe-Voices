# feat-0029: Tech Spec — Case create reliability

## Context

See [`PRODUCT.md`](./PRODUCT.md). Fixes production/local `POST /api/cases` failures when Prisma cannot reach Postgres.

## Observed failure

```text
prisma:error (ENOTFOUND) tenant/user postgres.<project-ref> not found
[api/cases] create failed DriverAdapterError
POST /api/cases 500
```

DNS for the pooler host may succeed while Supabase rejects the tenant (wrong password, paused project, or invalid pooler user).

## Modules

| File | Change |
|------|--------|
| `packages/prisma/src/db-errors.ts` | Detect connectivity / tenant errors |
| `packages/prisma/src/get-case-store.ts` | `forceMemoryCaseStore()`, export helpers |
| `apps/web/app/api/cases/route.ts` | Fallback + error codes |
| `packages/trpc/src/api-errors.ts` | `DATABASE_UNAVAILABLE` |
| `apps/web/messages/en.json` / `ar.json` | Error copy |
| `apps/web/components/auth/case-access-flow.tsx` | Prefer `DATABASE_UNAVAILABLE` message |

## Store selection (updated)

```text
CASE_STORE=memory          → MemoryCaseStore
CASE_STORE=prisma          → PrismaCaseStore (no fallback)
DATABASE_URL unset         → MemoryCaseStore
DATABASE_URL set           → PrismaCaseStore
  └─ create fails (dev)    → force MemoryCaseStore + retry once
  └─ create fails (prod)   → 503 DATABASE_UNAVAILABLE
```

## Connectivity detection

Treat as connectivity if message/cause includes any of:

- `ENOTFOUND`, `ECONNREFUSED`, `ETIMEDOUT`, `ECONNRESET`
- `tenant/user` + `not found`
- Prisma `P1001`, `P1000`, `P1017`
- `DriverAdapterError`

## Operator fix (production)

1. Confirm Supabase project is active.
2. Copy **session** URI (`:5432`) for `prisma migrate deploy`.
3. Set Vercel `DATABASE_URL` to **transaction pooler** (`:6543?pgbouncer=true`) with correct password (URL-encoded).
4. Redeploy after migrate succeeds.

## Testing

```bash
# Dev with bad URL should still create (memory fallback)
CASE_STORE= # leave unset
# DATABASE_URL pointing at unreachable tenant → POST /api/cases → 200

pnpm --filter @safevoices/prisma test
pnpm --filter @safevoices/web test
```

## Related

- [feat-0029 PRODUCT](./PRODUCT.md)
- [feat-0011 TECH](../feat-0011-data-layer/TECH.md)
