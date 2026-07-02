# feat-0026: Tech Spec — Image upload

## Context

See [`PRODUCT.md`](./PRODUCT.md). Consolidates [feat-0010](../feat-0010-evidence-upload-storage/TECH.md) and [feat-0023](../feat-0023-evidence-pipeline/TECH.md) upload details. Presign JSON API (not multipart).

## Route map

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| `POST` | `/api/cases/:caseId/upload` | `sv_case_session` cookie (Next) or Bearer (Hono) | `handleCaseUploadPost` |
| `POST` | `/api/internal/jobs/orphan-uploads` | `Bearer {CRON_SECRET}` | `cleanupOrphanUploads` |

Next route: `apps/web/app/api/cases/[caseId]/upload/route.ts` (delegates to trpc).

Hono: `apps/api/src/server.ts` — same handler, Bearer token.

## Existing modules

| File | Role |
|------|------|
| `packages/trpc/src/upload-handlers.ts` | `handleCaseUploadPost` |
| `packages/trpc/src/schemas.ts` | `uploadRequestSchema`, `uploadResponseSchema` |
| `packages/trpc/src/api-errors.ts` | `UPLOAD_*`, `FILE_TOO_LARGE` codes |
| `packages/prisma/src/storage.ts` | Sign, list, delete, MIME allowlist |
| `apps/web/lib/evidence-upload.ts` | Client presign + PUT |
| `apps/web/lib/supabase-storage.ts` | Re-export from `@safevoices/prisma` |
| `apps/web/app/[locale]/chat/page.tsx` | File input, `onImageFilesChange`, bubble render |
| `apps/web/components/chat/reporting-chat-extras.tsx` | `ReportingProgress` / attachments field |
| `packages/prisma/src/jobs/orphan-upload-cleanup.ts` | Orphan object deletion |
| `packages/prisma/schema.prisma` | `CaseAttachment` model |

Run typecheck:

```bash
pnpm typecheck
pnpm --filter @safevoices/web test
```

## POST upload API

### Request

`Content-Type: application/json` — **not** multipart.

```json
{
  "filename": "screenshot.png",
  "mimeType": "image/png"
}
```

Validated by `uploadRequestSchema`.

### Response 200

```json
{
  "signedUrl": "https://…/object/upload/sign/…",
  "publicUrl": "https://…/object/public/{bucket}/cases/SV-…/…"
}
```

**Target:** add `attachmentId` when row created.

### Errors (implemented)

| Status | Code | When |
|--------|------|------|
| 401 | `SESSION_EXPIRED` | Invalid / mismatched session |
| 400 | `INVALID_JSON` | Body parse / Zod fail |
| 400 | `UPLOAD_UNSUPPORTED_TYPE` | MIME not in allowlist |
| 503 | `UPLOAD_NOT_CONFIGURED` | Supabase env missing |

**Target:** 409 `CASE_SUBMITTED_READONLY`, 413 `FILE_TOO_LARGE`, 409 attachment limit.

### Handler flow

```ts
// packages/trpc/src/upload-handlers.ts
const session = await getCaseStore().resolveSession(sessionToken);
// validate MIME → createSignedUploadUrl → optional prisma.caseAttachment.create
return Response.json(signed);
```

**Gap:** No `isCaseSubmitted` check. Row created before client PUT completes.

## Client flow

```ts
// apps/web/lib/evidence-upload.ts
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

export async function uploadEvidence(caseId: string, file: File) {
  // POST /api/cases/{caseId}/upload
  // PUT signedUrl with file body
  // return { publicUrl }
}
```

```tsx
// apps/web/app/[locale]/chat/page.tsx — onImageFilesChange
if (reportingMode && sessionOk) {
  for (const file of files) {
    try { await uploadEvidence(caseId, file); /* update extraction */ }
    catch (err) {
      if (code === 'UPLOAD_NOT_CONFIGURED') break; // fallback to inline
      toastApiError(...); return;
    }
  }
}
void sendMessage({ files: list });
```

| Concern | Today | Target |
|---------|-------|--------|
| Message parts | Data URLs from AI SDK | Include `publicUrl` when presign OK |
| `CaseMessage.attachments` JSON | Not set | Link `attachmentId` on send |
| `sizeBytes` on row | Null | Pass from client or infer after PUT |
| Return value used in chat | Discarded after presign | Pass URL into message metadata |

## Storage layer

File: `packages/prisma/src/storage.ts`

| Function | Role |
|----------|------|
| `isAllowedUploadMime` | `image/png`, `image/jpeg`, `image/webp` |
| `createSignedUploadUrl` | POST Storage sign API, `expiresIn: 60` |
| `listStorageObjects` | Orphan job listing |
| `deleteStorageObject` | Orphan job delete |
| `storageObjectPathFromPublicUrl` | Map URL → object key |

Object path:

```text
cases/{trackingCode}/{Date.now()}-{sanitizedFilename}
```

## Database

```prisma
model CaseAttachment {
  id        String   @id @default(cuid())
  caseId    String
  url       String
  mimeType  String
  name      String
  sizeBytes Int?
  createdAt DateTime @default(now())
  case      Case     @relation(...)
}
```

Linked by internal `Case.id` (resolved from `trackingCode` in handler).

Memory case store: **no** attachment persistence without `DATABASE_URL`.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | — | Supabase API base |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Server presign |
| `SUPABASE_STORAGE_BUCKET` | `case-uploads` | Bucket name |
| `DATABASE_URL` | — | `CaseAttachment` rows |
| `ORPHAN_UPLOAD_AGE_MS` | `3600000` | Orphan TTL |
| `CRON_SECRET` | — | Job auth |

From `.env.example`, `packages/prisma/RUNBOOK.md`.

## i18n keys

| Key | Namespace |
|-----|-----------|
| `UPLOAD_NOT_CONFIGURED` | `errors` |
| `UPLOAD_UNSUPPORTED_TYPE` | `errors` |
| `FILE_TOO_LARGE` | `errors` |
| `UPLOAD_FAILED` | `errors` |
| `uploadFailedTitle` | `chat` |
| `uploadedImage` | `chat` |
| `progress.attachments` | `progress` |

Parity: `apps/web/messages/key-parity.test.ts`.

## Target investigator APIs

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/partner/cases/:caseId/attachments` | List metadata (optional split from detail) |
| `GET` | `/api/partner/cases/:caseId/attachments/:id/url` | Signed download |

Today: `getPartnerCaseDetail` embeds `attachments[]` with stored `url`.

## Testing matrix

| Layer | Scope | Tool | CI today |
|-------|-------|------|----------|
| **Unit** | `uploadEvidence`, `isAllowedUploadMime` | Vitest | Partial (no upload tests) |
| **Unit** | `format-extraction` | Vitest | Yes |
| **Integration** | `handleCaseUploadPost` + memory store | Vitest + mock storage | No |
| **E2E** | Attach PNG in reporting chat | Playwright | No |
| **Manual** | curl presign + PUT | Shell | Ad hoc |

### Local commands

```bash
pnpm --filter @safevoices/web test
pnpm --filter @safevoices/web run test:e2e   # target: reporter-upload.spec.ts
pnpm typecheck
```

### Manual presign

```bash
curl -b "sv_case_session=TOKEN" -X POST \
  "http://localhost:3000/api/cases/SV-XXXXX-XXXX/upload" \
  -H 'Content-Type: application/json' \
  -d '{"filename":"evidence.png","mimeType":"image/png"}'
```

### Target unit test sketch

```ts
// apps/web/lib/evidence-upload.test.ts
describe('uploadEvidence', () => {
  it('rejects files over 10MB', async () => { /* … */ });
  it('POST then PUT on success', async () => { /* mock fetch */ });
});
```

### Target E2E sketch

```ts
// apps/web/e2e/reporter-upload.spec.ts
test('attaches image in reporting chat', async ({ page }) => {
  // create case, verify, goto chat, setInputFiles, expect img visible
});
```

## Target handler improvements

```ts
// upload-handlers.ts — target additions
if (await getCaseStore().isCaseSubmitted(caseId)) {
  return apiErrorResponse(API_ERROR_CODES.CASE_SUBMITTED_READONLY, 409);
}
// Optional: count attachments, reject if >= 20
// Create CaseAttachment AFTER successful PUT via confirm endpoint (target)
```

## Known gaps

| Gap | Severity | Owner |
|-----|----------|-------|
| No server submit guard on upload | Medium | feat-0026 |
| `CaseAttachment` before PUT completes | Medium | feat-0026 |
| No `attachmentId` in API response | Low | feat-0026 |
| Message ↔ attachment not linked | Medium | feat-0026 |
| Chat uses data URLs not storage URLs | Medium | feat-0026 |
| No server size validation | Medium | feat-0026 |
| Investigator signed download | Medium | feat-0021, 0026 |
| Upload E2E not in CI | Medium | feat-0025 |
| Case purge does not delete storage objects | Medium | feat-0017 |
| Private bucket + signed read undocumented in ops | High | feat-0024 |
| feat-0010 / feat-0023 TECH partially stale | Low | docs |

Maintain [`../SPEC_GAPS.md`](../SPEC_GAPS.md) when closing items.

## Implementation status

| Area | Status |
|------|--------|
| Presign API (Next + Hono) | Complete |
| Client `uploadEvidence` | Complete |
| Chat picker + fallback | Complete |
| Orphan cleanup job | Complete |
| Submit guard (API) | Open |
| Post-PUT attachment confirm | Open |
| Message attachment refs | Open |
| Investigator signed URL | Open |
| Upload tests | Open |

## Related

- [feat-0026 PRODUCT](./PRODUCT.md)
- [feat-0010 TECH](../feat-0010-evidence-upload-storage/TECH.md)
- [feat-0023 TECH](../feat-0023-evidence-pipeline/TECH.md)
- [feat-0016 TECH](../feat-0016-hono-standalone-api/TECH.md)
- [feat-0017 TECH](../feat-0017-retention-cleanup-jobs/TECH.md)
- [feat-0025 TECH](../feat-0025-testing-release/TECH.md)
- [AI_CHAT_IMAGE_CONTEXT.md](../AI_CHAT_IMAGE_CONTEXT.md)
