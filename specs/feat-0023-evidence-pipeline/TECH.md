# feat-0023: Tech Spec — Evidence pipeline

## Context

See [`PRODUCT.md`](./PRODUCT.md). Connects [feat-0010](../feat-0010-evidence-upload-storage/TECH.md) API, [feat-0008](../feat-0008-reporting-chat-ai/TECH.md) UI, and Supabase.

## Existing API

| Method | Path | File |
|--------|------|------|
| `POST` | `/api/cases/[caseId]/upload` | `apps/web/app/api/cases/[caseId]/upload/route.ts` |

Expected: multipart `file` field, case session cookie, returns `{ attachmentId, url? }`.

## Storage layer

| File | Role |
|------|------|
| `apps/web/lib/supabase-storage.ts` | Upload + signed URL helpers |

Env:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server upload |
| `SUPABASE_STORAGE_BUCKET` | Bucket name (e.g. `case-evidence`) |

## Target chat UI integration

| File | Change |
|------|--------|
| `apps/web/components/chat/reporting-chat-extras.tsx` | Wire file input → `FormData` POST upload |
| `apps/web/app/[locale]/chat/page.tsx` | Pass `onAttachment` / render attachment parts |
| `packages/ui/.../message.tsx` | Attachment bubble variant (if needed) |

### Upload client sketch

```ts
async function uploadEvidence(caseId: string, file: File) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`/api/cases/${caseId}/upload`, {
    method: 'POST',
    body: fd,
    credentials: 'include',
  });
  if (!res.ok) throw await res.json(); // { code } for i18n
  return res.json();
}
```

## Message model options

**Option A (recommended):** System message after upload:

```json
{ "role": "user", "content": "", "metadata": { "type": "attachment", "attachmentId": "..." } }
```

**Option B:** Extend `POST /messages` to accept `attachmentIds[]` alongside text.

Persist via [feat-0011](../feat-0011-data-layer/TECH.md) `CaseMessage` + `CaseAttachment.caseId`.

## Target investigator APIs

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/partner/cases/:caseId/attachments` | List metadata |
| `GET` | `/api/partner/cases/:caseId/attachments/:id/url` | Signed download |

Auth: [feat-0022](../feat-0022-partner-auth-backend/TECH.md) partner session.

## Validation (server)

```ts
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
```

Return [feat-0019](../feat-0019-api-errors-i18n/TECH.md) codes: `FILE_TOO_LARGE`, `FILE_TYPE_NOT_ALLOWED`, `UPLOAD_FAILED`.

## Outbox / offline

If [feat-0008](../feat-0008-reporting-chat-ai/TECH.md) message outbox (`apps/web/lib/message-outbox.ts`) applies to uploads:

- Queue upload jobs with local blob reference (IndexedDB) — **v2**; v1 online-only acceptable.

## Retention

[feat-0017](../feat-0017-retention-cleanup-jobs/TECH.md) `purge.ts` must delete storage objects by `storagePath` before DB row delete.

## Gaps

| Gap | Owner |
|-----|-------|
| No attach button wired in chat | feat-0023 |
| Upload route may not link message | feat-0023 |
| Bucket RLS not documented | feat-0024 |
| No upload tests in CI | feat-0025 |

## Testing

```bash
pnpm --filter @safevoices/web test
```

| Test | Scope |
|------|-------|
| Upload route unit | Mock storage, assert 413/415 |
| Chat component | Mock fetch, assert UI state |
| E2E (optional) | Playwright file chooser |

## Related

- [feat-0023 PRODUCT](./PRODUCT.md)
- [feat-0010 TECH](../feat-0010-evidence-upload-storage/TECH.md)
- [specs/AI_CHAT_IMAGE_CONTEXT.md](../AI_CHAT_IMAGE_CONTEXT.md) — AI vision context (future)
