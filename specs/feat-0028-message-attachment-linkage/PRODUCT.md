# feat-0028: Message attachment linkage and storage URLs

## Summary

Reporting chat **links uploaded evidence to the user message** that introduced it, renders **storage URLs** in bubbles (not base64 data URLs when storage is configured), and **rejects uploads** on submitted read-only cases at every upload API entry point.

Extends [feat-0026](../feat-0026-image-upload/PRODUCT.md) and [feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md).

## Problem

Today `CaseAttachment` rows exist after confirm, but chat persistence stores only plain text on `CaseMessage`. Reload loses image context in the transcript, bubbles embed huge data URLs, and investigators cannot trace which message included which file.

## Behavior

| Area | Rule |
|------|------|
| Upload guard | `POST …/upload` and `POST …/upload/confirm` return 409 `CASE_SUBMITTED_READONLY` when case is submitted |
| Linkage | Client sends `messageAttachments` with chat POST; server validates IDs belong to case and stores JSON on the user `CaseMessage` |
| Bubble URLs | After presign upload, UI and persisted messages use `publicUrl` (https), not data URLs |
| Fallback | When `UPLOAD_NOT_CONFIGURED`, client may still send inline file parts; no DB linkage |
| History | `GET …/messages` returns `attachments` per message; client restores file parts |

## Acceptance

- [ ] Upload after submit → 409 on presign and confirm
- [ ] Image message persists `attachments` array on user row
- [ ] Reload shows images from storage URLs
- [ ] Invalid `attachmentId` on chat POST → 400

## Status

Implemented in feat-0028.
