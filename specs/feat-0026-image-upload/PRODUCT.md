# feat-0026: Image upload

## Summary

**Image upload** lets reporters attach **PNG, JPEG, or WebP** evidence during anonymous reporting chat. Files are stored in **Supabase Storage** via a **presigned two-step upload** (server sign → browser PUT). When storage is unset, chat **falls back** to inline file parts so dev and demo still work.

**Status:** Presign API, chat picker, and orphan cleanup job are implemented. Message↔attachment linkage, investigator signed download, server submit guard, and automated upload tests remain open.

Complements [feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md) (chat UI), [feat-0009](../feat-0009-case-submit-lifecycle/PRODUCT.md) (read-only after submit), [feat-0010](../feat-0010-evidence-upload-storage/PRODUCT.md) (storage API), [feat-0023](../feat-0023-evidence-pipeline/PRODUCT.md) (end-to-end pipeline), and [feat-0021](../feat-0021-investigator-workflow/PRODUCT.md) (case detail).

## Problem

Evidence images cannot live only in chat payloads: message size limits, no durable URLs for investigators, and lost attachments on reload. The product needs session-scoped presigned uploads, MIME and size validation, metadata in `CaseAttachment`, and cleanup of abandoned objects — without breaking local dev when Supabase is not configured.

## Non-goals

- PDF, video, audio, or generic documents in v1.
- Virus scanning or automated content moderation.
- Per-reporter storage quota UI.
- Direct browser upload to Supabase without server presign.
- Public anonymous upload URLs.
- OCR or automatic text extraction from images.
- Offline upload queue (IndexedDB outbox) in v1.

## Upload paths

| Path | When | Storage | DB row | Chat bubble |
|------|------|---------|--------|-------------|
| **A. Presigned** | Supabase env set; presign succeeds | Bucket `cases/{caseId}/…` | `CaseAttachment` on presign | Data URL via SDK + filename in progress |
| **B. Inline fallback** | `UPLOAD_NOT_CONFIGURED` (503) | None | None | Data URL only |

Target: Path A is primary in reporting mode; Path B is acceptable for dev/demo only.

## Use case catalog

### A. Presign API

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Request signed URL | Valid session; case not submitted | POST `{ filename, mimeType }` | `{ signedUrl, publicUrl }` |
| **UC-A02** | Upload bytes | Signed URL returned | Client PUT to Supabase | Object in bucket |
| **UC-A03** | DB attachment row | `DATABASE_URL` + case exists | On presign | `CaseAttachment` created |
| **UC-A04** | Session required | No cookie / token | POST upload | 401 `SESSION_EXPIRED` |
| **UC-A05** | Case mismatch | Session caseId ≠ URL | POST upload | 401 |

### B. Validation

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Allowed MIME | png / jpeg / webp | POST | 200 |
| **UC-B11** | Rejected MIME | e.g. PDF | POST or client | 400 `UPLOAD_UNSUPPORTED_TYPE` |
| **UC-B12** | Oversized file | &gt; 10 MB | Client check | `FILE_TOO_LARGE` toast |
| **UC-B13** | Storage not configured | No Supabase env | POST | 503 `UPLOAD_NOT_CONFIGURED` |
| **UC-B14** | Missing fields | Bad JSON | POST | 400 `INVALID_JSON` |
| **UC-B15** | Max attachments | &gt; 20 per case | POST | 409 (target; not implemented) |

### C. Chat UI

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Pick image | Reporting chat, session OK | Image button → file input | Thumbnail in thread |
| **UC-C21** | Presign then chat | Storage configured | `uploadEvidence` → `sendMessage({ files })` | Bucket object + bubble |
| **UC-C22** | Attach after submit | Case submitted | Click attach | Disabled (UI); API reject (target) |
| **UC-C23** | Progress evidence field | Upload succeeds | `ReportingProgress` | `attachments` noted |
| **UC-C24** | Reload session | Return to case | GET messages | Images from history (inline parts today) |

### D. Investigator

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D30** | List attachments | Partner session | Case detail API | Names + links |
| **UC-D31** | Download | Authorized | Signed read URL (target) | Time-limited link |
| **UC-D32** | View today | Prisma store | Public URL in detail | Works if bucket public |

### E. Retention and ops

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-E40** | Orphan cleanup | Object &gt;1h, no DB ref | Cron orphan job | Object deleted |
| **UC-E41** | Case purge | Retention job | [feat-0017](../feat-0017-retention-cleanup-jobs/PRODUCT.md) | DB rows cascade; storage delete (target) |

### F. Edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-F50** | Filename sanitized; max 120 chars |
| **UC-F51** | Sign URL expires in 60 seconds |
| **UC-F52** | Multiple files in one picker action processed sequentially |
| **UC-F53** | Arabic errors via [feat-0019](../feat-0019-api-errors-i18n/PRODUCT.md) |
| **UC-F54** | AI receives image via inline `FileUIPart` (storage URL in parts: target) |

## Behavior (product rules)

1. **Session-scoped:** Same auth as case chat ([feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md)).
2. **Images only:** PNG, JPEG, WebP — server and client allowlists.
3. **Max size:** 10 MB per file (client today; server target).
4. **Max count:** 20 attachments per case (product default; not enforced yet).
5. **Graceful degradation:** 503 → inline attach without blocking chat.
6. **Submit lock:** No new uploads after submit ([feat-0009](../feat-0009-case-submit-lifecycle/PRODUCT.md)).
7. **Progress:** Filenames update extraction `attachments` for reporter progress UI.
8. **Investigator access:** Partner sees attachments on submitted cases only.
9. **Private bucket target:** Production uses signed read, not permanent public URLs ([feat-0024](../feat-0024-security-operations/PRODUCT.md)).

## Critical user journeys

### Reporter upload (P0)

1. Create case → verify → open `/{locale}/chat?caseId=…`.
2. Tap attach → select PNG (&lt; 10 MB).
3. See thumbnail in thread; progress shows **Evidence** noted.
4. Submit case → attach control disabled.

### Reporter fallback (P1)

1. Dev env without Supabase.
2. Attach image → chat still works via inline parts.
3. Toast or copy explains storage not configured (optional).

### Investigator (P1)

1. Partner opens submitted case detail.
2. Sees attachment name/link (signed download: target).

### E2E target ([feat-0025](../feat-0025-testing-release/PRODUCT.md))

1. Upload small PNG in reporting chat → visible in thread.
2. Invalid type/size → translated error toast.

## What's needed to work

### Reporter (product)

| Requirement | Purpose |
|-------------|---------|
| Verified case session | Upload auth |
| Case status `OPEN` | Upload allowed |
| Modern browser with `fetch` + `File` API | Presign + PUT |

### Operator (production)

| Requirement | Purpose |
|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Storage API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server presign |
| `SUPABASE_STORAGE_BUCKET` | Target bucket (default `case-uploads`) |
| Bucket CORS for browser PUT | Client upload to signed URL |
| `DATABASE_URL` | Persist `CaseAttachment` |
| `CRON_SECRET` + orphan cron | Cleanup abandoned objects |
| Private bucket + signed read policy | Production security |

## Ship checklist (image upload)

| # | Item | Feat | Status |
|---|------|------|--------|
| 1 | Presign API with stable error codes | 0010, 0019 | Done |
| 2 | Chat attach wired to presign | 0023, 0026 | Done |
| 3 | Inline fallback when storage unset | 0026 | Done |
| 4 | MIME + size validation (client) | 0026 | Done |
| 5 | Submit disables attach (UI) | 0009 | Done |
| 6 | Submit rejects upload (API) | 0009, 0026 | Open |
| 7 | `CaseAttachment` after successful PUT | 0026 | Open |
| 8 | Message stores attachment ref | 0026 | Open |
| 9 | Investigator signed download | 0021, 0026 | Open |
| 10 | Upload unit + E2E in CI | 0025, 0026 | Open |
| 11 | Private bucket runbook | 0024 | Open |

## Acceptance criteria (target)

1. Reporter uploads 2 MB PNG with Supabase configured; object exists under `cases/{caseId}/…`.
2. With `DATABASE_URL`, `CaseAttachment` row matches file name and MIME type.
3. Chat shows image preview; progress marks evidence.
4. After submit, attach is disabled and API returns 409 if called.
5. Without Supabase, reporter can attach inline without hard failure.
6. PDF or 15 MB file shows translated error (en/ar).
7. Investigator downloads via signed URL (not permanent public link).
8. Orphan job removes unreferenced objects past TTL.

## Open questions

1. Create `CaseAttachment` before or after PUT? **Default:** after PUT success.
2. Return `attachmentId` from presign response? **Default:** yes (target).
3. Store `publicUrl` in message parts vs data URLs? **Default:** storage URL when presign succeeds.
4. Enforce 20 attachments per case server-side? **Default:** yes before production.

## Related

- [feat-0026 TECH](./TECH.md)
- [feat-0010 PRODUCT](../feat-0010-evidence-upload-storage/PRODUCT.md)
- [feat-0023 PRODUCT](../feat-0023-evidence-pipeline/PRODUCT.md)
- [feat-0008 PRODUCT](../feat-0008-reporting-chat-ai/PRODUCT.md)
- [feat-0025 PRODUCT](../feat-0025-testing-release/PRODUCT.md)
- [AI_CHAT_IMAGE_CONTEXT.md](../AI_CHAT_IMAGE_CONTEXT.md)
