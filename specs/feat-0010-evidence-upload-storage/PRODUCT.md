# feat-0010: Evidence upload and storage

> **Canonical image upload spec:** [feat-0026-image-upload](../feat-0026-image-upload/PRODUCT.md).

## Summary

Reporters may attach **evidence images** (screenshots, photos) to support their anonymous report. Safe Voices provides a **server-side signed upload API** backed by **Supabase Storage**, plus a **client-side interim path** that embeds images as **inline data URLs** in the chat UI without calling the upload API.

**Completion (product):** reporter selects an image in reporting chat; file is stored durably, linked to the case, referenced in extraction/messages, and included in investigator review.

**Completion (today):** **API only** — `POST /api/cases/[caseId]/upload` returns a Supabase presigned URL and optionally creates a `CaseAttachment` row when `DATABASE_URL` is set. The chat page **does not** call this route; it uses `sendMessage({ files })` with inline previews. Orphan cleanup is a **stub** ([feat-0017](../feat-0017-retention-cleanup-jobs/PRODUCT.md)).

Complements [feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md) (chat attachments UI), [feat-0009](../feat-0009-case-submit-lifecycle/PRODUCT.md) (read-only after submit), and [feat-0011](../feat-0011-data-layer/PRODUCT.md) (`CaseAttachment` model).

## Problem

Large binary evidence cannot stay in chat message bodies (size limits, no durable URLs, poor investigator UX). The product needs presigned uploads scoped to the case session, MIME allowlisting, DB linkage, and eventual cleanup of abandoned objects — while the UI still works in dev without Supabase.

## Non-goals

- Video, audio files, or generic document uploads (images only today).
- Virus scanning or content moderation pipeline.
- End-user storage quota UI.
- Public unauthenticated upload URLs.
- Investigator download portal ([feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md)).
- Client-side direct upload to Supabase without session (must go through API).

## Actors

| Actor | Description |
|-------|-------------|
| **Reporter** | Attaches PNG/JPEG/WebP during intake. |
| **Platform** | Issues signed URL, records `CaseAttachment`, stores object key. |
| **Operator** | Configures Supabase bucket + env; schedules orphan cleanup. |

## Upload paths (product)

| Path | When | Storage | DB record |
|------|------|---------|-----------|
| **A. Inline data URL** (current UI) | User picks image in chat | Browser memory / AI request payload | **Not created** |
| **B. Signed upload API** (target) | UI calls upload then PUTs to Supabase | Supabase bucket `case-uploads` | `CaseAttachment` row |

Product target: **Path B** for reporting mode; Path A remains fallback when storage env missing (503 message on API suggests inline chat attach).

## Use case catalog

### A. Signed upload API

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Request signed URL | Valid session; case not submitted | POST upload `{ filename, mimeType }` | `{ signedUrl, publicUrl }` |
| **UC-A02** | Upload bytes | Signed URL returned | Client PUT to Supabase | Object in bucket |
| **UC-A03** | DB attachment row | `DATABASE_URL` + case exists | After sign | `CaseAttachment` created |
| **UC-A04** | Session required | No cookie | POST upload | 401 |
| **UC-A05** | Case mismatch | Wrong caseId in URL | POST upload | 401 |

### B. Validation

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Allowed MIME | `image/png`, `jpeg`, `webp` | POST | 200 signed URL |
| **UC-B11** | Rejected MIME | e.g. `application/pdf` | POST | 400 unsupported format |
| **UC-B12** | Missing fields | Bad JSON | POST | 400 |
| **UC-B13** | Storage not configured | No Supabase env | POST | 503 with fallback message |

### C. Chat UI (current vs target)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Pick image (today) | Reporting chat | Image button → file input | Data URL in message bubble |
| **UC-C21** | Pick image (target) | Storage configured | Sign → PUT → send message with URL | Persisted attachment |
| **UC-C22** | Attach after submit | Submitted case | Click attach | Disabled ([feat-0009](../feat-0009-case-submit-lifecycle/PRODUCT.md)) |
| **UC-C23** | Extraction `attachments` field | Upload linked | Progress UI | Field marked noted |

### D. Orphan cleanup (feat-0017)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D30** | Orphan object | Uploaded &gt;1h; no DB ref | Scheduled `cleanupOrphanUploads` | Object deleted |
| **UC-D31** | Stub today | — | Run job | `{ removed: 0 }` always |

### E. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-E40** | Filename sanitized (`[^a-zA-Z0-9._-]` → `_`, max 120 chars) |
| **UC-E41** | Object path includes `cases/{caseId}/{timestamp}-{name}` |
| **UC-E42** | Signed URL expires (60s in API request body) |
| **UC-E43** | Hono has **no** upload route ([feat-0016](../feat-0016-hono-standalone-api/PRODUCT.md)) |

## Behavior (product rules)

1. **Session-scoped:** Upload API requires same cookie auth as chat ([feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md)).

2. **Image types only:** PNG, JPEG, WebP — enforced server-side via `isAllowedUploadMime`.

3. **Graceful degradation:** 503 response text tells reporter to attach in chat when storage unset.

4. **Public URL shape:** API returns `publicUrl` for bucket public path; bucket policy must match deployment security model (may need signed read for production).

5. **Inline attach is interim:** Acceptable for demo/dev; not durable or size-safe for production.

6. **Submit lock:** No new uploads after case submitted (UI + future API guard if direct upload added).

7. **Orphan job** runs off request path; see feat-0017.

## What's needed to work

### API path (operator)

| Requirement | Purpose |
|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Sign upload server-side |
| `SUPABASE_STORAGE_BUCKET` | Default `case-uploads` |
| `DATABASE_URL` | Persist `CaseAttachment` |
| Bucket CORS | Browser PUT from web origin |

### UI path (today)

| Requirement | Purpose |
|-------------|---------|
| None | File picker + data URLs only |

## Status

| Area | Status |
|------|--------|
| `POST /api/cases/[caseId]/upload` | **Complete** (Next) |
| `supabase-storage.ts` | **Complete** |
| `CaseAttachment` Prisma model | **Complete** |
| Chat UI → upload API | **Not wired** |
| Inline data URL attach in chat | **Complete** (interim) |
| `cleanupOrphanUploads` | **Stub** |
| Hono upload route | **Missing** |
| MIME validation on inline path | **None** (client accept `image/*`) |

## Open questions

1. Public vs signed **read** URLs for investigators? **Default:** signed read for production.

2. Max file size? **Default:** 5 MB product limit; enforce at sign and PUT.

3. Link upload to `CaseMessage.attachments` JSON on send? **Default:** yes when UI wired.

4. Multiple files per message? **Default:** yes; UI already allows `multiple` on input.

## Related

- [feat-0008 PRODUCT](../feat-0008-reporting-chat-ai/PRODUCT.md) — attach button in chat
- [feat-0009 PRODUCT](../feat-0009-case-submit-lifecycle/PRODUCT.md) — read-only after submit
- [feat-0011 PRODUCT](../feat-0011-data-layer/PRODUCT.md) — attachment model
- [feat-0012 PRODUCT](../feat-0012-api-contracts/PRODUCT.md) — upload Zod schemas
- [feat-0017 PRODUCT](../feat-0017-retention-cleanup-jobs/PRODUCT.md) — orphan cleanup
- `specs/AI_CHAT_IMAGE_CONTEXT.md` — legacy media pipeline detail
