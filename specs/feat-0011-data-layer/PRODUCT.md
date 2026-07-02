# feat-0011: Data layer (Prisma / memory case store)

## Summary

Safe Voices persists **anonymous case data** through a shared **`CaseStore`** interface in `@safevoices/prisma`. Reporters receive a human-readable **tracking code** (`caseId`, e.g. `SV-ABCDE-1234`) and a one-time **secret**; sessions, chat turns, extractions, attachments, and crisis events hang off the same case graph.

**Implemented today:** Prisma schema (SQLite provider), `MemoryCaseStore` and `PrismaCaseStore`, singleton `getCaseStore()`, Argon2 secret hashing, session tokens (HMAC-SHA256), verify lockout, and chat persistence APIs used by Next.js and Hono routes.

**Store selection:** `CASE_STORE=memory` forces in-memory; otherwise `DATABASE_URL` selects `PrismaCaseStore`; with neither, dev defaults to memory.

Complements [feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md) (credentials), [feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md) (chat persistence), [feat-0009](../feat-0009-case-submit-lifecycle/PRODUCT.md) (submit status), [feat-0010](../feat-0010-evidence-upload-storage/PRODUCT.md) (attachments), and [feat-0017](../feat-0017-retention-cleanup-jobs/PRODUCT.md) (purge stubs).

## Problem

Reporting flows need durable case state without accounts. Engineers need one abstraction so API routes work in local dev (no DB), CI, and production (SQLite or Postgres via `DATABASE_URL`). Without a spec, it is unclear which models exist, how secrets are hashed, when memory vs Prisma is chosen, and what is **not** persisted (e.g. cross-process memory).

## Non-goals

- Investigator partner accounts or RBAC ([feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md)).
- Email or notification side effects ([feat-0013](../feat-0013-transactional-email/PRODUCT.md)).
- Full retention purge implementation ([feat-0017](../feat-0017-retention-cleanup-jobs/PRODUCT.md) stubs).
- Reporter self-service delete.
- Multi-tenant org isolation.

## Actors

| Actor | Description |
|-------|-------------|
| **Reporter** | Creates a case, verifies secret, holds session token; never sees internal `Case.id` (cuid). |
| **API layer** | Next.js `/api/cases/*` and Hono (`feat-0016`) call `getCaseStore()`. |
| **Developer** | Runs with memory store or `DATABASE_URL` + `prisma migrate`. |
| **Platform** | Operates DB, sets `SAFEVOICES_SECRET_PEPPER`, backups, legal hold. |

## Domain model (product view)

| Entity | Purpose |
|--------|---------|
| **Case** | Tracking code, hashed secret, status, incident fields, lockout counters, `legalHold`. |
| **CaseSession** | Opaque session token (hashed at rest), TTL, optional revoke. |
| **CaseMessage** | User/assistant turns; optional `clientReqId` for idempotency. |
| **CaseExtraction** | Structured intake fields (JSON) from AI reporting. |
| **CaseAttachment** | Evidence metadata (URL, mime, size). |
| **CrisisEvent** | Safety escalation audit trail. |

**Case statuses:** `OPEN` → `SUBMITTED` → `UNDER_REVIEW` → `RESOLVED` → `CLOSED` (investigator transitions are future).

## Use case catalog

### A. Store selection and operations

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Dev without database | No `DATABASE_URL` | Start web or API | `MemoryCaseStore` active |
| **UC-A02** | Force memory in prod test | `CASE_STORE=memory` | Start process | Memory store even if URL set |
| **UC-A03** | Persistent dev/prod | `DATABASE_URL` set; `CASE_STORE` not `memory` | `prisma migrate` + start app | `PrismaCaseStore` active |
| **UC-A04** | Shared store across routes | Same process + store mode | Create on Next, verify on Hono | Same case visible (same process only for memory) |

### B. Case creation and credentials

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Create anonymous case | Store reachable | `createCase()` | Returns `caseId` (tracking code) + plaintext `secret` (shown once) |
| **UC-B11** | Unique tracking code | Collision on generate | Retry generate (up to 8) | Unique `trackingCode` in DB |
| **UC-B12** | Secret never stored plain | Create | Argon2 hash + per-case salt | Only `secretHash` / `secretSalt` persisted |

### C. Verify and lockout

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Successful verify | Valid `caseId` + `secret` | `verifyCase()` | Session token + `expiresAt`; failed attempts reset |
| **UC-C21** | Wrong secret | Valid case | Verify | `invalid`; `failedAttempts` incremented |
| **UC-C22** | Lockout after 5 failures | 5 failed attempts | Verify | `locked` for 10 minutes |
| **UC-C23** | Network rate limit | `clientKey` over limit (30 / 15 min) | Verify | `locked` (network guard) |
| **UC-C24** | Unknown case | Bad tracking code | Verify | `invalid` |

### D. Sessions

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D30** | Resolve session | Valid token | `resolveSession(token)` | `caseId` + `expiresAt` |
| **UC-D31** | Sliding expiry | Active session | `touchSession(token)` | TTL extended (15 min idle) |
| **UC-D32** | Absolute cap | Session older than 24h | Resolve/touch | Session invalid |
| **UC-D33** | Revoke | Logout or security event | `revokeSession(token)` | Token no longer resolves |

### E. Chat and extraction

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-E40** | Persist chat turn | Open case | `appendChatTurn()` | User + assistant messages stored |
| **UC-E41** | Idempotent message | Same `clientReqId` | Append | No duplicate user turn |
| **UC-E42** | Update extraction | AI returns fields | Append with `extraction` | `CaseExtraction` upserted |
| **UC-E43** | Crisis signal | `crisisTriggered` | Append | `CrisisEvent` row created |
| **UC-E44** | List history | Session valid | `listMessages(caseId, limit)` | Ordered messages for UI |

### F. Submit lifecycle

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-F50** | Check submitted | Case exists | `isCaseSubmitted(caseId)` | Boolean from `submittedAt` / status |
| **UC-F51** | Mark submitted | Open case | `markCaseSubmitted(caseId)` | `SUBMITTED` + `submittedAt` |
| **UC-F52** | Read status | Case exists | `getCaseStatus(caseId)` | Status enum or null |

### G. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-G60** | Memory store: data lost on process restart |
| **UC-G61** | Memory store: not shared across Next and separate Hono process |
| **UC-G62** | Missing `SAFEVOICES_SECRET_PEPPER` in prod → dev default pepper (insecure) |
| **UC-G63** | `legalHold=true` → future purge skips case ([feat-0017](../feat-0017-retention-cleanup-jobs/PRODUCT.md)) |
| **UC-G64** | Attachment rows without Storage delete → orphan risk ([feat-0010](../feat-0010-evidence-upload-storage/PRODUCT.md)) |

## Behavior (product rules)

1. **Public identifier** is `trackingCode` (exposed as `caseId` in APIs), not internal cuid.

2. **Secrets** are shown once at creation; recovery is impossible by design.

3. **Verify lockout** is per-case (5 failures, 10-minute lock) plus optional network key limit.

4. **Sessions** are opaque bearer values; only HMAC hash stored in `CaseSession`.

5. **Submitted cases** remain readable for history; chat writes blocked at API layer ([feat-0009](../feat-0009-case-submit-lifecycle/PRODUCT.md)).

6. **SQLite** is the schema default provider; production may use Postgres URL with same models.

## Acceptance criteria

| # | Criterion |
|---|-----------|
| AC-1 | `getCaseStore()` returns memory when no `DATABASE_URL` and no explicit Prisma override. |
| AC-2 | `createCase` + `verifyCase` round-trip works in both stores. |
| AC-3 | Wrong secret increments lockout; fifth failure locks verify. |
| AC-4 | `appendChatTurn` persists messages and extraction in Prisma mode. |
| AC-5 | Schema includes `Case`, `CaseSession`, `CaseMessage`, `CaseExtraction`, `CaseAttachment`, `CrisisEvent`. |

## What's needed to make it work

| Requirement | Owner | Notes |
|-------------|-------|-------|
| `pnpm install` + `prisma generate` | Developer | Required for Prisma client |
| `DATABASE_URL` | Platform | e.g. `file:./dev.db` (SQLite) or Postgres URL |
| `prisma migrate dev` | Developer | Apply schema to persistent DB |
| `SAFEVOICES_SECRET_PEPPER` | Platform | **Required in production** for secret/session crypto |
| `CASE_STORE=memory` | Developer | Optional; forces ephemeral store |
| Single shared DB | Platform | If Next and Hono run separately, both need same `DATABASE_URL` |
| Backups + encryption at rest | Platform | Not in repo; required for production |
| Legal hold workflow | Product / legal | Before enabling purge ([feat-0017](../feat-0017-retention-cleanup-jobs/PRODUCT.md)) |

## Open questions

1. Postgres vs SQLite in production? **Default:** Postgres for multi-instance; SQLite for single-node pilot.

2. Migrate `CaseAttachment` to signed URL lifecycle only? **Default:** align with [feat-0010](../feat-0010-evidence-upload-storage/PRODUCT.md).

3. Expose investigator status transitions on store? **Default:** new methods when [feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md) ships.

## Related

- [feat-0005 PRODUCT](../feat-0005-anonymous-case-access/PRODUCT.md)
- [feat-0008 PRODUCT](../feat-0008-reporting-chat-ai/PRODUCT.md)
- [feat-0009 PRODUCT](../feat-0009-case-submit-lifecycle/PRODUCT.md)
- [feat-0010 PRODUCT](../feat-0010-evidence-upload-storage/PRODUCT.md)
- [feat-0016 PRODUCT](../feat-0016-hono-standalone-api/PRODUCT.md)
- [feat-0017 PRODUCT](../feat-0017-retention-cleanup-jobs/PRODUCT.md)
