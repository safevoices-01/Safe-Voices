# feat-0029: Case create reliability

## Summary

**Case create reliability** ensures `POST /api/cases` either creates an anonymous report successfully or returns a **clear, translated error** — never a silent bare 500. When Postgres is misconfigured or unreachable in **development**, the platform falls back to the in-memory case store so reporters can still test access and chat. In **production**, create must use Postgres; connectivity failures return `DATABASE_UNAVAILABLE`.

**Status:** Implemented with this feat.

Complements [feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md) (access UI), [feat-0011](../feat-0011-data-layer/PRODUCT.md) (store selection), and [feat-0019](../feat-0019-api-errors-i18n/PRODUCT.md) (error codes).

## Problem

With `DATABASE_URL` set to an unreachable or invalid Supabase pooler (wrong password, paused project, bad tenant), Prisma throws `DriverAdapterError` / `ENOTFOUND tenant/user …`. The access UI only shows “Unable to create case right now,” blocking all reporter onboarding locally and in production.

## Non-goals

- Auto-healing production when the database is down (no silent memory fallback in prod).
- Replacing Supabase credentials for the operator.
- Multi-region failover.

## Actors

| Actor | Description |
|-------|-------------|
| **Reporter** | Clicks continue anonymously; expects case ID + secret or a clear failure. |
| **Developer** | Runs local Next with optional `DATABASE_URL`; must not be blocked by a bad remote URL. |
| **Operator** | Sets production `DATABASE_URL` + runs migrations. |

## Behavior rules

1. **Production** (`NODE_ENV=production`): always use Prisma when `DATABASE_URL` is set. On create failure from connectivity/auth, return **`DATABASE_UNAVAILABLE`** (503). Never fall back to memory.
2. **Development / test**: if Prisma create fails with a connectivity-class error, **once** switch the process to `MemoryCaseStore`, log a warning, and retry create. Subsequent requests use memory until restart.
3. Explicit `CASE_STORE=memory` always uses memory (unchanged).
4. Explicit `CASE_STORE=prisma` never falls back; returns `DATABASE_UNAVAILABLE` / `CASE_CREATE_FAILED`.
5. Client access flow prefers translated `errors.DATABASE_UNAVAILABLE` when that code is present; otherwise `createFailed`.

## Use case catalog

| ID | Use case | Flow | Postcondition |
|----|----------|------|---------------|
| **UC-01** | Healthy Postgres | POST create | 200 + caseId + secret |
| **UC-02** | Dev + bad DATABASE_URL | POST create | Warning log; 200 via memory |
| **UC-03** | Prod + bad DATABASE_URL | POST create | 503 `DATABASE_UNAVAILABLE` |
| **UC-04** | Forced memory | `CASE_STORE=memory` | Memory store; no Prisma |
| **UC-05** | Forced prisma + down | `CASE_STORE=prisma` | 503; no memory fallback |

## Acceptance criteria

1. Local create works even when Supabase pooler returns tenant ENOTFOUND (dev fallback).
2. Production returns stable `DATABASE_UNAVAILABLE` with en/ar copy.
3. Spec + TECH document env matrix and operator fix (migrate + valid URL).

## Related

- [feat-0029 TECH](./TECH.md)
- [packages/prisma/RUNBOOK.md](../../packages/prisma/RUNBOOK.md)
