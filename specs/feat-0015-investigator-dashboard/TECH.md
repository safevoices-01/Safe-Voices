# feat-0015: Tech Spec — Investigator dashboard

## Context

See [`PRODUCT.md`](./PRODUCT.md). The investigator dashboard is a **Next.js App Router** page under `apps/web/app/[locale]/dashboard/`. It is a **UI stub** with no data fetching, no server actions, and no route protection.

## Stack

| Piece | Choice |
|-------|--------|
| Framework | Next.js 15 App Router |
| UI | `@safevoices/ui` `Button` only |
| Auth | None on dashboard (links out to `/auth/email`) |
| API | None |

## Route map

| URL | File | Behavior |
|-----|------|----------|
| `/{locale}/dashboard` | `apps/web/app/[locale]/dashboard/page.tsx` | Static placeholder |
| Layout wrapper | `apps/web/app/[locale]/dashboard/layout.tsx` | Gray background shell + metadata |

Locale segment inherited from `apps/web/app/[locale]/layout.tsx` ([feat-0002](../feat-0002-middleware-routing/TECH.md)).

## Page implementation (`page.tsx`)

```tsx
// Summarized behavior
<h1>Investigator dashboard</h1>
<p>Case queue and assignment workflow for partner accounts (Tier 3)…</p>
<ul>
  <li>Review submitted anonymous reports</li>
  <li>Assign investigators and update case status</li>
  <li>Send status notifications via Resend when email is on file</li>
</ul>
<Button render={<Link href="/auth/email" />}>Partner sign-in</Button>
<Button render={<Link href="/access" />}>Reporter access</Button>
```

**Note:** Links use paths **without** locale prefix (`/auth/email`, `/access`). Middleware / i18n navigation may rewrite; verify against [feat-0002](../feat-0002-middleware-routing/TECH.md) (`Link` from `@/i18n/navigation` is target for locale-aware hrefs).

## Layout metadata (`layout.tsx`)

| Field | Value |
|-------|-------|
| `title` | Dashboard |
| `description` | Collections dashboard mock based on the Figma design node. |
| `openGraph.url` | `/dashboard` |
| Background | `min-h-dvh bg-[#f5f5f7]` |

## Dependencies

| Package | Usage |
|---------|-------|
| `@safevoices/ui/components/button` | CTA buttons |
| `next/link` | Navigation (not i18n `Link`) |

No imports from `@safevoices/prisma`, `@safevoices/trpc`, or `@safevoices/emails`.

## Related routes (not dashboard)

| Route | Feature | Relation |
|-------|---------|----------|
| `/{locale}/auth/email` | [feat-0006](../feat-0006-email-otp-partner-auth/TECH.md) | Target entry after partner sign-in click |
| `/{locale}/access` | [feat-0005](../feat-0005-anonymous-case-access/TECH.md) | Reporter access CTA |
| `/{locale}/chat` | [feat-0008](../feat-0008-reporting-chat-ai/TECH.md) | Reporter chat (not linked from dashboard) |

## Implementation status

| Item | Status |
|------|--------|
| Placeholder page | **Stub** |
| Layout + metadata | **Stub** |
| Partner auth gate | **Not implemented** |
| Case queue API | **Not implemented** |
| Case detail view | **Not implemented** |
| Status transitions | **Not implemented** |
| Resend notifications | **Not implemented** ([feat-0013](../feat-0013-transactional-email/TECH.md)) |
| Prisma partner model | **Not in schema** |
| Figma implementation | **Not started** (metadata references Figma node) |

## Target architecture (not built)

```text
/{locale}/dashboard
  layout.tsx          → requirePartnerSession()
  page.tsx            → CaseQueueTable (SUBMITTED, UNDER_REVIEW, …)
  [caseId]/page.tsx   → read-only messages + extraction + status actions

GET  /api/partner/cases?status=
PATCH /api/partner/cases/:caseId  { status, assigneeId? }
```

Store extensions ([feat-0011](../feat-0011-data-layer/TECH.md)):

- `updateCaseStatus(caseId, status, actorId)`
- `listCasesForPartner(filter)`
- Optional `PartnerUser` / `Assignment` models

Schemas ([feat-0012](../feat-0012-api-contracts/TECH.md)):

- `partnerCaseListItemSchema`, `updateCaseStatusRequestSchema`, etc.

## Known gaps

| Gap | Severity |
|-----|----------|
| No auth on `/dashboard` | High before any real data |
| Links omit locale prefix | Medium i18n bug risk |
| No `loading.tsx` / `error.tsx` | Low |
| Metadata still says "mock" / Figma | Low |
| No tests for dashboard route | Low |

## What's needed to make it work

### Stub (today)

| Step | Action |
|------|--------|
| 1 | `pnpm dev:web` |
| 2 | Open `/en/dashboard` (or default locale) |

No environment variables required.

### Production feature (target)

| Step | Action |
|------|--------|
| 1 | Implement partner session (cookie/JWT) after OTP verify |
| 2 | Add middleware or layout guard redirecting unauthenticated users |
| 3 | Extend Prisma schema + `CaseStore` for partner queries and status updates |
| 4 | Add Zod schemas + API routes under `apps/web/app/api/partner/` |
| 5 | Build queue UI with `@safevoices/ui` Table, Badge, Sheet |
| 6 | Wire Resend on status change ([feat-0013](../feat-0013-transactional-email/TECH.md)) |
| 7 | Add i18n keys; use `Link` from `@/i18n/navigation` |
| 8 | Security review: no secret leakage, audit log |
| 9 | Vitest + e2e for auth gate and status transitions |

## Commands

```bash
pnpm dev:web
# Visit http://localhost:3000/en/dashboard

pnpm --filter @safevoices/web run typecheck
```

## Testing

| Case | Status |
|------|--------|
| Web typecheck | CI |
| Dashboard route test | **Gap** |
| Auth gate test | **Gap** (future) |

## Related

- [feat-0002 TECH](../feat-0002-middleware-routing/TECH.md)
- [feat-0006 TECH](../feat-0006-email-otp-partner-auth/TECH.md)
- [feat-0009 TECH](../feat-0009-case-submit-lifecycle/TECH.md)
- [feat-0011 TECH](../feat-0011-data-layer/TECH.md)
- [feat-0012 TECH](../feat-0012-api-contracts/TECH.md)
- [feat-0013 TECH](../feat-0013-transactional-email/TECH.md)
- [feat-0014 TECH](../feat-0014-ui-kit/TECH.md)
