# feat-0010: Tech Spec — Evidence upload and storage

## Context

See [`PRODUCT.md`](./PRODUCT.md). Signed upload is implemented in `apps/web/app/api/cases/[caseId]/upload/route.ts` and `apps/web/lib/supabase-storage.ts`. Chat UI in `chat/page.tsx` bypasses this API and sends files through Vercel AI SDK `sendMessage({ files })` as inline parts.

## Route map

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| `POST` | `/api/cases/[caseId]/upload` | `sv_case_session` | Validate MIME → sign → optional DB row |

No upload route on Hono ([feat-0016](../feat-0016-hono-standalone-api/TECH.md)).

## POST upload API

### Request

Validated by `uploadRequestSchema` (`packages/trpc/src/schemas.ts`):

```json
{
  "filename": "screenshot.png",
  "mimeType": "image/png"
}
```

### Response (success)

```json
{
  "signedUrl": "https://.../object/upload/sign/...",
  "publicUrl": "https://.../storage/v1/object/public/case-uploads/cases/SV-.../..."
}
```

Schema: `uploadResponseSchema`.

### Errors

| Status | Condition | Body |
|--------|-----------|------|
| 401 | Session invalid / case mismatch | `{ error: 'Session expired.' }` |
| 400 | Zod fail | `{ error: 'filename and mimeType required' }` |
| 400 | MIME not allowed | `{ error: 'Unsupported format. Use PNG, JPEG, or WebP.' }` |
| 503 | `createSignedUploadUrl` null | `{ error: 'File upload storage is not configured...' }` |

Stable `code` values (`UPLOAD_UNSUPPORTED_TYPE`, `UPLOAD_NOT_CONFIGURED`) exist in `api-errors.ts` but route returns plain strings today — **gap** vs feat-0019.

### Handler excerpt

```ts
// apps/web/app/api/cases/[caseId]/upload/route.ts
const signed = await createSignedUploadUrl({ caseId, filename, mimeType });
if (process.env.DATABASE_URL) {
    await prisma.caseAttachment.create({
        data: { caseId: record.id, url: signed.publicUrl, mimeType, name: filename },
    });
}
return Response.json(signed);
```

**Note:** Attachment row is created **before** client PUT succeeds — orphan risk if upload abandoned (feat-0017).

## Supabase helper

File: `apps/web/lib/supabase-storage.ts`

| Function | Role |
|----------|------|
| `isAllowedUploadMime(mimeType)` | Whitelist PNG, JPEG, WebP |
| `createSignedUploadUrl(input)` | POST to Storage sign API |

### Object path

```
cases/{caseId}/{Date.now()}-{sanitizedFilename}
```

Sanitization: `filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)`.

### Sign request

```http
POST {NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/{bucket}/{path}
Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
Body: { "expiresIn": 60 }
```

Returns `signedURL` or `signedUrl` from JSON (handles both keys).

### Configuration null path

Returns `null` when `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` missing → route 503.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | — | Supabase API base |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Server-only sign authority |
| `SUPABASE_STORAGE_BUCKET` | `case-uploads` | Target bucket |
| `DATABASE_URL` | — | Create `CaseAttachment` row |

From `apps/web/.env.example`.

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

Linked by internal `case.id` (resolved from `trackingCode`).

## Chat UI (interim inline path)

File: `apps/web/app/[locale]/chat/page.tsx`

```tsx
<input type="file" accept="image/*" multiple onChange={onImageFilesChange} />
// onImageFilesChange → sendMessage({ files: list })
```

`UserMessageBody` renders `isFileUIPart` images via `<img src={f.url} />` (data URLs from transport).

| Concern | Inline path | Signed path (target) |
|---------|-------------|------------------------|
| Persists to bucket | No | Yes |
| `CaseAttachment` row | No | Yes |
| Chat message `attachments` JSON | No | Target |
| AI model sees image | Via UIMessage parts | URL in parts |
| Size limits | Browser / chat max chars | Bucket policy |

## Orphan cleanup stub

```ts
// packages/prisma/src/jobs/orphan-upload-cleanup.ts
export async function cleanupOrphanUploads(): Promise<{ removed: number }> {
    return { removed: 0 };
}
```

Documented: remove objects not referenced in `CaseMessage.attachments` after 1 hour. See [feat-0017](../feat-0017-retention-cleanup-jobs/TECH.md).

## Target client flow (not implemented)

```text
1. POST /api/cases/:caseId/upload { filename, mimeType }
2. PUT signedUrl with file bytes + Content-Type
3. sendMessage({ text?, metadata? }) or append attachment ref to case store
4. Update extraction.attachments field for ReportingProgress
```

Consider shared helper in `apps/web/lib/` used by chat page.

## Module map

| File | Role |
|------|------|
| `apps/web/app/api/cases/[caseId]/upload/route.ts` | Upload API |
| `apps/web/lib/supabase-storage.ts` | Sign + MIME allowlist |
| `apps/web/app/[locale]/chat/page.tsx` | File input + inline send |
| `packages/trpc/src/schemas.ts` | `uploadRequestSchema`, `uploadResponseSchema` |
| `packages/prisma/schema.prisma` | `CaseAttachment` |
| `packages/prisma/src/jobs/orphan-upload-cleanup.ts` | Stub job |

## Known gaps (audit)

| Gap | Severity |
|-----|----------|
| UI does not call upload API | High for production |
| DB row before PUT completes | Medium — orphan risk |
| No submit guard on upload route | Medium — add `isCaseSubmitted` check |
| No file size validation | Medium |
| Public URL assumption | Security review needed |
| Hono route missing | feat-0016 |
| `apiErrorResponse` codes unused | feat-0019 |
| `cleanupOrphanUploads` no-op | feat-0017 |

## Testing

| Case | Method |
|------|--------|
| MIME allowlist | Unit test `isAllowedUploadMime` (add if missing) |
| Manual sign | curl POST with session cookie + Supabase env |
| UI attach | Manual — verify data URL in DOM only |
| Typecheck | `pnpm --filter @safevoices/web run typecheck` |

Example:

```bash
curl -b cookies.txt -X POST "http://localhost:3000/api/cases/SV-XXXXX-XXXX/upload" \
  -H 'Content-Type: application/json' \
  -d '{"filename":"evidence.png","mimeType":"image/png"}'
```

Without Supabase env, expect 503.

## Related

- [feat-0008 TECH](../feat-0008-reporting-chat-ai/TECH.md) — chat file parts
- [feat-0009 TECH](../feat-0009-case-submit-lifecycle/TECH.md) — read-only after submit
- [feat-0011 TECH](../feat-0011-data-layer/TECH.md) — Prisma models
- [feat-0012 TECH](../feat-0012-api-contracts/TECH.md) — Zod contracts
- [feat-0017 TECH](../feat-0017-retention-cleanup-jobs/TECH.md) — orphan job
- `specs/AI_CHAT_IMAGE_CONTEXT.md` — image context design
