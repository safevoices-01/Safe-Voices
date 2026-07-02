# feat-0009: Tech Spec — Case submit and lifecycle

## Context

See [`PRODUCT.md`](./PRODUCT.md). Submit is a thin Next.js route delegating to `markCaseSubmitted` on the shared case store. Read-only enforcement spans store flag (`submittedAt`), `caseStatus`, session GET, chat POST guard, and client `inputDisabled`.

## Route map

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| `POST` | `/api/cases/[caseId]/submit` | `sv_case_session` | `markCaseSubmitted(caseId)` |
| `GET` | `/api/cases/session` | Cookie | Returns `submitted`, `caseStatus` |
| `POST` | `/api/cases/[caseId]/chat` | Cookie | 409 if submitted |

File: `apps/web/app/api/cases/[caseId]/submit/route.ts`.

## POST submit

### Handler flow

```ts
// apps/web/app/api/cases/[caseId]/submit/route.ts
1. resolveSession(cookie) — must match caseId
2. if isCaseSubmitted(caseId) → 409 plain JSON
3. markCaseSubmitted(caseId) — false → 404
4. submitCaseResponseSchema.parse({ ok: true, caseId, submittedAt })
```

### Response (success)

```json
{
  "ok": true,
  "caseId": "SV-ABCDE-FGHJ",
  "submittedAt": "2026-06-29T12:00:00.000Z"
}
```

Schema: `submitCaseResponseSchema` in `packages/trpc/src/schemas.ts`.

### Error bodies (today)

| Status | Body | Stable `code` |
|--------|------|---------------|
| 401 | `{ error: 'Session expired...' }` | **No** (plain string) |
| 409 | `{ error: 'This report has already been submitted.' }` | **No** |
| 404 | `{ error: 'Case not found' }` | **No** |

Chat route uses `apiErrorResponse` with codes; submit route does not yet — **parity gap** with [feat-0019](../feat-0019-api-errors-i18n/TECH.md).

## Store implementation

```ts
// packages/prisma/src/prisma-case-store.ts
async markCaseSubmitted(caseId: string): Promise<boolean> {
    await prisma.case.update({
        data: {
            submittedAt: new Date(),
            caseStatus: 'SUBMITTED',
        },
    });
    return true;
}

async isCaseSubmitted(caseId: string): Promise<boolean> {
    return Boolean(record?.submittedAt);
}
```

Memory store mirror: same semantics in `memory-case-store.ts`.

## Schema (`packages/prisma/schema.prisma`)

```prisma
enum CaseStatus {
  OPEN
  SUBMITTED
  UNDER_REVIEW
  RESOLVED
  CLOSED
}

model Case {
  caseStatus   CaseStatus @default(OPEN)
  submittedAt  DateTime?
  legalHold    Boolean    @default(false)
  // incidentCategory, riskLevel, ...
}
```

No API updates `caseStatus` beyond `OPEN` → `SUBMITTED` today.

## Web client

### Submit trigger

`apps/web/app/[locale]/chat/page.tsx`:

```ts
const handleSubmitReport = async () => {
    const res = await fetch(`/api/cases/${caseId}/submit`, { method: 'POST' });
    // toast on success; setSubmitted(true); setSubmitDone(true);
};
```

### Session hydration

On mount with `caseId`:

```ts
const sessionRes = await fetch('/api/cases/session');
// setSubmitted(Boolean(sessionJson.submitted));
```

### Read-only gating

```ts
const inputDisabled = reportingMode && (!sessionOk || submitted || submitDone);
```

Reporting chat POST will fail with 409 if client bypasses UI.

### UI component

`components/chat/reporting-chat-extras.tsx`:

- Submit button when `!submitDone && !submitted`
- Success panel when `submitDone`
- Uses `toastApiSuccess` / `toastApiError` + `translateApiError`

## Session GET (`/api/cases/session`)

```json
{
  "ok": true,
  "caseId": "SV-…",
  "expiresAt": "…",
  "submitted": true,
  "caseStatus": "SUBMITTED"
}
```

401 `{ ok: false }` when no session.

## Target investigator APIs (not implemented)

| Method | Path | Transition |
|--------|------|------------|
| `PATCH` | `/api/cases/[caseId]/status` | `SUBMITTED` → `UNDER_REVIEW` → … |
| Requires | Partner session ([feat-0006](../feat-0006-email-otp-partner-auth/TECH.md)) | RBAC in feat-0015 |

## Email hook (not wired)

```ts
// packages/emails/src/index.ts
export async function sendCaseReceivedEmail({ to, caseId })
```

Not invoked from submit route — anonymous reporters typically have no email on file.

## Hono gap

`apps/api/src/server.ts` has **no** `POST /api/cases/:caseId/submit`. See [feat-0016](../feat-0016-hono-standalone-api/TECH.md).

## Known gaps (audit)

| Gap | Notes |
|-----|-------|
| Status enum values unused except SUBMITTED | UC-C20–C23 |
| Submit errors lack `code` | feat-0019 |
| No confirmation email | feat-0013 |
| No extraction completeness check | Product open question |
| Hono submit | feat-0016 |
| Investigator PATCH status | feat-0015 |

## Testing

| Case | Method |
|------|--------|
| Manual submit + chat 409 | Browser / curl with session cookie |
| Store unit behavior | Via prisma package tests if present |
| Web typecheck | `pnpm --filter @safevoices/web run typecheck` |

Suggested curl flow:

```bash
# After verify sets cookie:
curl -b cookies.txt -X POST "http://localhost:3000/api/cases/SV-XXXXX-XXXX/submit"
curl -b cookies.txt -X POST "http://localhost:3000/api/cases/SV-XXXXX-XXXX/chat" \
  -H 'Content-Type: application/json' \
  -d '{"messages":[]}'
# Expect 409 on second call
```

## Related

- [feat-0008 TECH](../feat-0008-reporting-chat-ai/TECH.md) — chat guard
- [feat-0011 TECH](../feat-0011-data-layer/TECH.md) — Case model
- [feat-0012 TECH](../feat-0012-api-contracts/TECH.md) — `submitCaseResponseSchema`
- [feat-0013 TECH](../feat-0013-transactional-email/TECH.md) — email helper
- [feat-0016 TECH](../feat-0016-hono-standalone-api/TECH.md) — missing route
