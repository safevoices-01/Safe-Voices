# feat-0011: Tech Spec — Data layer (Prisma / memory case store)

## Context

See [`PRODUCT.md`](./PRODUCT.md). Package `@safevoices/prisma` owns the Prisma schema, `CaseStore` interface, crypto helpers, and store implementations. API routes import `getCaseStore()` — they do not talk to Prisma directly.

## Stack

| Piece | Choice |
|-------|--------|
| ORM | Prisma 6.x (`schema.prisma`) |
| DB provider (schema) | SQLite (`datasource db { provider = "sqlite" }`) |
| Runtime URL | `DATABASE_URL` via `prisma.config.ts` |
| Secret hashing | `@node-rs/argon2` (`memoryCost: 19456`, `timeCost: 2`) |
| Session token hash | HMAC-SHA256 with pepper |
| In-memory fallback | `MemoryCaseStore` (`Map`-backed) |

## Store selection

```ts
// packages/prisma/src/get-case-store.ts
const explicit = process.env.CASE_STORE?.trim();
const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

if (explicit === 'memory' || (!explicit && !hasDatabase)) {
    store = new MemoryCaseStore();
} else {
    store = new PrismaCaseStore();
}
```

| Condition | Store |
|-----------|-------|
| `CASE_STORE=memory` | Memory (always) |
| No `DATABASE_URL`, `CASE_STORE` unset | Memory |
| `DATABASE_URL` set, `CASE_STORE` not `memory` | Prisma |

`resetCaseStoreForTests()` clears the singleton for unit tests.

## Schema (`packages/prisma/schema.prisma`)

| Model | Key fields |
|-------|------------|
| `Case` | `trackingCode` (unique), `secretHash`, `secretSalt`, `caseStatus`, incident fields, `failedAttempts`, `lockedUntil`, `legalHold` |
| `CaseSession` | `tokenHash` (unique), `expiresAt`, `revokedAt` |
| `CaseMessage` | `role`, `content`, `attachments` (Json), `@@unique([caseId, clientReqId])` |
| `CaseExtraction` | `schemaVersion`, `payload` (Json), `@@unique([caseId])` |
| `CaseAttachment` | `url`, `mimeType`, `name`, `sizeBytes` |
| `CrisisEvent` | `triggerType` |

Enums: `CaseStatus`, `IncidentCategory`, `RiskLevel`, `MessageRole`.

## CaseStore interface

```ts
// packages/prisma/src/case-store-types.ts
export interface CaseStore {
    createCase(): Promise<{ caseId: string; secret: string }>;
    verifyCase(input: { caseId: string; secret: string; clientKey?: string }): Promise<VerifyResult>;
    resolveSession(token: string | undefined): Promise<CaseSessionRecord | null>;
    touchSession(token: string): Promise<CaseSessionRecord | null>;
    revokeSession(token: string): Promise<void>;
    isCaseSubmitted(caseId: string): Promise<boolean>;
    markCaseSubmitted(caseId: string): Promise<boolean>;
    getCaseStatus(caseId: string): Promise<CaseStatusValue | null>;
    appendChatTurn(input: ChatPersistInput): Promise<ExtractionPatch | null>;
    listMessages(caseId: string, limit: number): Promise<Array<{ id; role; content }>>;
    getExtraction(caseId: string): Promise<ExtractionPatch | null>;
}
```

`caseId` in the interface is the **tracking code** (`SV-…`), not Prisma `Case.id`.

## Crypto (`packages/prisma/src/crypto.ts`)

| Function | Purpose |
|----------|---------|
| `generateSecret()` | 32-byte base64url secret |
| `hashSecret` / `verifySecret` | Argon2 with per-case salt + `SAFEVOICES_SECRET_PEPPER` |
| `mintSessionToken()` | 24-byte base64url session token |
| `hashSessionToken()` | HMAC-SHA256 for DB lookup |
| `generateTrackingCode(prefix)` | Human-readable case id |
| `timingSafeCompareHex` | Constant-time compare helper |

Default pepper when env unset: `safevoices-dev-pepper` (dev only).

## Constants (both stores)

| Constant | Value |
|----------|-------|
| `SESSION_TTL_MS` | 15 minutes (sliding on touch) |
| `SESSION_ABSOLUTE_MS` | 24 hours |
| `MAX_ATTEMPTS` | 5 verify failures |
| `LOCKOUT_MS` | 10 minutes |
| `NETWORK_LIMIT` | 30 / 15 min per `clientKey` (`SAFEVOICES_NETWORK_VERIFY_LIMIT`) |

## Module map

| File | Role |
|------|------|
| `schema.prisma` | Models and enums |
| `prisma.config.ts` | `DATABASE_URL` for CLI |
| `src/client.ts` | Singleton `PrismaClient` |
| `src/case-store-types.ts` | `CaseStore` + DTO types |
| `src/memory-case-store.ts` | In-memory implementation |
| `src/prisma-case-store.ts` | Prisma implementation |
| `src/get-case-store.ts` | Factory singleton |
| `src/crypto.ts` | Hashing and tokens |
| `src/index.ts` | Public exports + `getDatabaseProvider()` |
| `src/seed.ts` | Dev seed (optional) |
| `src/jobs/purge.ts` | Retention stub ([feat-0017](../feat-0017-retention-cleanup-jobs/TECH.md)) |
| `src/jobs/orphan-upload-cleanup.ts` | Storage stub |

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Prod (Prisma mode) | SQLite file or Postgres connection string |
| `CASE_STORE` | No | Set to `memory` to force in-memory |
| `SAFEVOICES_SECRET_PEPPER` | Prod | Pepper for Argon2 and session HMAC |
| `SAFEVOICES_NETWORK_VERIFY_LIMIT` | No | Override network verify cap (default 30) |

`getDatabaseProvider()` returns `'postgresql'` when URL starts with `postgres`, else `'sqlite'`.

## Commands

```bash
pnpm install
pnpm --filter @safevoices/prisma exec prisma generate

# SQLite local (example)
export DATABASE_URL="file:./packages/prisma/dev.db"
pnpm --filter @safevoices/prisma exec prisma migrate dev

pnpm --filter @safevoices/prisma run typecheck
```

## Implementation status

| Area | Status |
|------|--------|
| Schema + migrations path | Complete |
| `MemoryCaseStore` | Complete |
| `PrismaCaseStore` | Complete |
| Chat + extraction persist | Complete |
| Crisis events on append | Complete |
| Attachment create from upload route | Partial ([feat-0010](../feat-0010-evidence-upload-storage/TECH.md)) |
| Investigator status updates | Not implemented |
| Retention purge | Stub |

## Known gaps

| Gap | Impact |
|-----|--------|
| Memory not shared across processes | Hono + Next dev on different ports see different cases unless `DATABASE_URL` shared |
| Dev pepper default | Production misconfig weakens secrets |
| `Case.id` vs `trackingCode` | Callers must use tracking code in APIs |
| Network limit map in Prisma store | In-process only (not Redis) |
| No attachment delete API on store | Orphans rely on [feat-0017](../feat-0017-retention-cleanup-jobs/TECH.md) |

## What's needed to make it work

| Step | Action |
|------|--------|
| 1 | `pnpm --filter @safevoices/prisma exec prisma generate` after clone |
| 2 | Set `DATABASE_URL` and run migrations for persistent mode |
| 3 | Set `SAFEVOICES_SECRET_PEPPER` in staging/production |
| 4 | Avoid `CASE_STORE=memory` in production unless intentional ephemeral deploy |
| 5 | Point all API processes at the same database for shared case state |
| 6 | Configure backups and monitor disk (SQLite) or connection pool (Postgres) |
| 7 | Document legal-hold process before enabling purge job |

## Testing

| Case | Command |
|------|---------|
| Package typecheck | `pnpm --filter @safevoices/prisma run typecheck` |
| Store reset in tests | `resetCaseStoreForTests()` from `@safevoices/prisma` |
| Integration | Consumed via Next API route tests / manual curl |

No dedicated `CaseStore` unit test file in package today; behavior covered indirectly via web tests and manual flows.

## Related

- [feat-0005 TECH](../feat-0005-anonymous-case-access/TECH.md)
- [feat-0008 TECH](../feat-0008-reporting-chat-ai/TECH.md)
- [feat-0010 TECH](../feat-0010-evidence-upload-storage/TECH.md)
- [feat-0012 TECH](../feat-0012-api-contracts/TECH.md)
- [feat-0016 TECH](../feat-0016-hono-standalone-api/TECH.md)
- [feat-0017 TECH](../feat-0017-retention-cleanup-jobs/TECH.md)
