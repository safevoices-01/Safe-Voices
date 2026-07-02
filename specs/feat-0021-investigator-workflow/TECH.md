# feat-0021: Tech Spec — Investigator workflow

## Context

See [`PRODUCT.md`](./PRODUCT.md). Extends [feat-0015](../feat-0015-investigator-dashboard/TECH.md) stub into partner APIs and UI. Prerequisite: [feat-0022](../feat-0022-partner-auth-backend/TECH.md).

## Target route map (web)

| URL | Component | Auth |
|-----|-----------|------|
| `/{locale}/dashboard` | Case queue (table) | Partner session |
| `/{locale}/dashboard/cases/[caseId]` | Case detail | Partner session + org scope |
| `/{locale}/auth/email` | Email OTP ([feat-0006](../feat-0006-email-otp-partner-auth/TECH.md)) | Public |

Middleware: add partner-only matcher for `/dashboard` (extend [feat-0002](../feat-0002-middleware-routing/TECH.md)).

## Target API (Next.js)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/partner/cases` | List cases (`status`, `page`, `sort`) |
| `GET` | `/api/partner/cases/:caseId` | Detail + messages + extraction + attachments |
| `PATCH` | `/api/partner/cases/:caseId/status` | `{ status, note? }` |
| `POST` | `/api/partner/cases/:caseId/notes` | Internal note |
| `GET` | `/api/partner/cases/:caseId/audit` | Audit timeline |

All routes: validate `sv_partner_session` cookie ([feat-0022](../feat-0022-partner-auth-backend/TECH.md)), check `orgId` scope.

## Schema extensions (target)

```prisma
// additions to packages/prisma/schema.prisma (planned)

model PartnerUser {
  id        String   @id @default(cuid())
  email     String   @unique
  orgId     String
  role      String   // investigator | admin
  createdAt DateTime @default(now())
}

model CaseAuditEvent {
  id        String   @id @default(cuid())
  caseId    String
  actorId   String
  action    String   // status_change | note | assign
  payload   Json?
  createdAt DateTime @default(now())
}

// Case: add orgId String?, assignedToId String?
```

## Status transition service (target)

```ts
// packages/prisma/src/case-lifecycle.ts (planned)
const ALLOWED: Record<CaseStatus, CaseStatus[]> = {
  OPEN: [],
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};
```

## UI modules (target)

| Module | Package |
|--------|---------|
| `CaseQueueTable` | `apps/web/components/dashboard/` |
| `CaseDetailPanel` | same |
| `StatusTransitionMenu` | `@safevoices/ui` + web |
| Zod contracts | `@safevoices/trpc` [feat-0012](../feat-0012-api-contracts/TECH.md) |

## Current codebase (stub only)

| File | Today |
|------|-------|
| `apps/web/app/[locale]/dashboard/page.tsx` | Static placeholder |
| `packages/prisma/schema.prisma` | `CaseStatus` enum; no partner models |
| Partner APIs | None |

## Env vars (target)

| Variable | Purpose |
|----------|---------|
| `SAFEVOICES_PARTNER_SESSION_TTL` | Partner cookie TTL |
| Same as feat-0011 | `DATABASE_URL` required for production |

## Gaps

| Gap | Owner |
|-----|-------|
| No `PartnerUser` model | feat-0021 + 0011 |
| No partner session | feat-0022 |
| Dashboard links lack locale `Link` | feat-0015 fix |
| Hono has no partner routes | feat-0016 |

## Testing (target)

```bash
pnpm --filter @safevoices/web test
pnpm --filter @safevoices/prisma test  # lifecycle transitions
```

| Case | Expected |
|------|----------|
| Reporter session on `/dashboard` | Redirect |
| Partner lists only org cases | Integration test |
| Illegal status transition | 409 + `INVALID_STATUS_TRANSITION` code |

## Related

- [feat-0021 PRODUCT](./PRODUCT.md)
- [feat-0022 TECH](../feat-0022-partner-auth-backend/TECH.md)
- [feat-0011 TECH](../feat-0011-data-layer/TECH.md)
