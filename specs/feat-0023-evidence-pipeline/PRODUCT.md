# feat-0023: Evidence pipeline (uploads and attachments)

> **Canonical image upload spec:** [feat-0026-image-upload](../feat-0026-image-upload/PRODUCT.md).

## Summary

**Evidence pipeline** closes the loop between reporter file upload API ([feat-0010](../feat-0010-evidence-upload-storage/PRODUCT.md)), reporting chat UI ([feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md)), and case storage ([feat-0011](../feat-0011-data-layer/PRODUCT.md)). Reporters attach images/documents during intake; files land in Supabase Storage with metadata in `CaseAttachment`; investigators view signed URLs in [feat-0021](../feat-0021-investigator-workflow/PRODUCT.md).

**Status:** Upload API exists; chat UI wiring and end-to-end flow incomplete.

## Problem

`POST /api/cases/:caseId/upload` accepts multipart files and records attachments, but the reporting chat surface does not expose a consistent attach flow, progress, or error handling. Message bubbles do not reference uploaded files. Investigators have no spec'd download path.

## Non-goals

- Video transcoding or malware sandbox in v1.
- Unlimited storage (quotas per case).
- Public CDN URLs (signed URLs only).
- OCR / automatic text extraction from images in v1.

## Actors

| Actor | Description |
|-------|-------------|
| **Reporter** | Uploads evidence during `OPEN` case |
| **Platform** | Virus scan hook (future), storage, metadata |
| **Investigator** | Downloads via signed URL |

## Use case catalog

### A. Upload from chat

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Attach image | Case `OPEN`, session valid | Pick file → upload | Thumbnail in thread; `CaseAttachment` row |
| **UC-A02** | Attach PDF | Same | Upload | File chip with name/size |
| **UC-A03** | Reject oversized | File > max | Upload | Toast error `FILE_TOO_LARGE` |
| **UC-A04** | Reject type | MIME not allowed | Upload | `FILE_TYPE_NOT_ALLOWED` |
| **UC-A05** | Upload while offline | Network loss | Retry via outbox ([feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md)) | Queued or failed state |

### B. Display in transcript

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Show attachment message | Upload success | Chat renders attachment bubble | Linked to `attachmentId` |
| **UC-B11** | Reload session | Return to case | GET messages includes attachment refs | UI restores chips |
| **UC-B12** | Submit case | User submits | Attachments frozen | No new uploads after `SUBMITTED` |

### C. Investigator access

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | List attachments | Partner on case | Detail API | Names, sizes, uploadedAt |
| **UC-C21** | Download | Authorized | GET signed URL | Time-limited link |
| **UC-C22** | Expired URL | TTL passed | Refresh signed URL | New link |

### D. Retention

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D30** | Purge case | Retention job | Delete storage objects + DB rows | [feat-0017](../feat-0017-retention-cleanup-jobs/PRODUCT.md) |

## Behavior (product rules)

1. Upload allowed only when `case.status === OPEN` (same as chat send).
2. Max file size: **10 MB** (align with API today unless changed).
3. Allowed MIME: `image/jpeg`, `image/png`, `image/webp`, `application/pdf` (configurable).
4. Max attachments per case: **20** (product default).
5. Filenames sanitized; never execute user content in browser.
6. Arabic UI: attachment errors use [feat-0019](../feat-0019-api-errors-i18n/PRODUCT.md).

## What's needed to make it work

| Layer | Requirement |
|-------|-------------|
| API | Existing upload route; add `GET .../attachments`, signed download |
| Storage | `apps/web/lib/supabase-storage.ts` — verify bucket policies |
| UI | `reporting-chat-extras.tsx` file picker + progress |
| Messages | Optional `Message.metadata.attachmentIds` or system message type |
| Store | `CaseAttachment` already in schema |
| Tests | Upload integration + UI unit |

## Implementation status

| Item | Status |
|------|--------|
| `POST .../upload` route | Done |
| Supabase helper | Done |
| Chat attach UI | Partial / not wired |
| Message ↔ attachment link | Not done |
| Investigator download API | Not done |

## Acceptance criteria (target)

1. Reporter uploads JPEG from chat; sees preview; reload preserves attachment.
2. Submit blocks further uploads.
3. Investigator opens case; downloads file via signed URL.
4. Invalid type/size shows translated toast.

## Open questions

1. Store files encrypted at rest in bucket? **Default:** Supabase private bucket + RLS.
2. Show images inline vs link-only? **Default:** inline preview for images.

## Related

- [feat-0010 PRODUCT](../feat-0010-evidence-upload-storage/PRODUCT.md)
- [feat-0008 PRODUCT](../feat-0008-reporting-chat-ai/PRODUCT.md)
- [feat-0021 PRODUCT](../feat-0021-investigator-workflow/PRODUCT.md)
