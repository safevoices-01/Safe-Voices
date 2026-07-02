# feat-0008: Studio upload — single `start-upload` per file (no API storm)

## Summary

When a studio user selects audio and lands on the **Upload progress** step (`/studio/{code}/sermons/upload/file`), the client must call **`POST /sermon/start-upload` exactly once per selected file** (until explicit retry or file change). Today a `useEffect` in `UploadProgressStep` can re-run on every progress tick and fire **hundreds or thousands** of parallel uploads. This spec fixes that behavior **without changing** the existing upload wizard UI (same `UploadEntryStepModal`, `UploadModal`, `UploadProgressStep` shell per [feat-0006](../feat-0006/PRODUCT.md)).

## Problem

- **Observed:** After picking an audio file, the API logs show a burst of `start-upload` requests (user reports up to ~1000).
- **Cause:** Upload progress updates `dispatch(setProgress)` → re-render → upload `useEffect` re-executes when unstable values (`dispatch`, `mutateAsync`, or `queryClient`) sit in the dependency array.
- **Impact:** Duplicate draft sermon rows, server load, broken progress UI, aborted requests (`request aborted` / `ECONNABORTED` in logs).

## Non-goals

- New upload screens, steps, or Figma layouts.
- Changing multipart contract or `start-upload` response shape (see [feat-0006 TECH](../feat-0006/TECH.md)).
- Mobile listener upload (web studio only).
- Chunked/resumable upload protocol (future).

## Figma

Not applicable — retain existing upload wizard from [feat-0006](../feat-0006/PRODUCT.md).

## Consumer

Ministers and creators on studio upload routes (`SermonUploadPage` → `UploadModal` → progress step).

## Behavior

### A. Single flight (mandatory)

1. **One** in-flight `start-upload` per stable file identity (`name + size + lastModified`).
2. Progress callbacks (`onUploadProgress` → `setProgress`) must **not** restart the upload effect.
3. While upload is in flight, mounting/unmounting the progress step must not start a second upload for the same file signature unless the user chose **Retry upload**.
4. **Retry upload** (error state) clears the single-flight guard and runs **one** new `start-upload` for the same file.
5. **Remove audio** / **Cancel upload** / **reset upload** clears in-flight state and aborts the active request (`AbortController`).

### B. UI (unchanged)

6. User flow stays as [feat-0006](../feat-0006/PRODUCT.md) **UC-C01–C05**: entry modal → file route → progress → details → settings → review/publish.
7. Progress step still shows percent, finalizing, complete, remove-audio dialog, cancel dialog — same components and copy.
8. `embedded` full-page wizard ([`SermonUploadPage`](../../../apps/web/src/app/studio/SermonUploadPage.tsx)) behavior unchanged.

### C. API contract (unchanged)

9. **One** successful `POST /api/v1/sermon/start-upload` returns `data.id` (sermon id) and optional `uploadRef`; client stores on upload context (`sermonId`, `uploadRef`).
10. List invalidation after success: `sermonQueryKeys.all` and minister list root when owner id known ([feat-0006](../feat-0006/TECH.md) invalidation table).
11. Server must not require multiple `start-upload` calls to finish one user-selected file.

### D. Observability

12. Dev: selecting one ~10MB file produces **one** `start-upload` line in network tab (plus progress events on same request).
13. Dev: no repeating `start-upload` while percent increases 0 → 100.
14. API logs: no burst of duplicate `start-upload` for a single user action.

## Use cases

| ID | Actor | Intent | Trigger | Expected |
| -- | ----- | ------ | ------- | -------- |
| **UC-UP01** | Studio user | Upload once | Valid file on progress step | Single `start-upload`; progress 0–100 |
| **UC-UP02** | Studio user | Progress updates | Axios `onUploadProgress` | UI percent only; **no** new POST |
| **UC-UP03** | Studio user | Navigate away mid-upload | Leave route / close wizard | Abort; no further POSTs |
| **UC-UP04** | Studio user | Retry after error | **Retry upload** | Exactly one new POST |
| **UC-UP05** | Studio user | Replace file | New file on entry step | New signature → one new POST |
| **UC-UP06** | Studio user | Complete upload | 100% + success body | `uploadComplete`; details tab enabled per wizard rules |

## Implementation status

| Item | Status |
| ---- | ------ |
| Single-flight upload | Done — `useStudioSermonAudioUpload`, `UploadProgressStep` |
| Unit tests (start gate) | Done — `sermon-upload-file-signature.util.spec.ts`; `pnpm test` in `apps/web` |
| R-01 … R-22 | Out of scope — see below |

## Acceptance criteria

1. Network panel shows **1** `start-upload` per file selection (not N≈progress ticks).
2. `UploadProgressStep` effect deps exclude `dispatch`, `queryClient`, and mutation handles.
3. Single-flight guard (`startedForSignature` or equivalent) prevents duplicate starts.
4. Existing feat-0006 upload UI and routes unchanged.
5. [feat-0006](../feat-0006/PRODUCT.md) **UC-C02** remains satisfied.

## Out of scope (remaining upload problems)

feat-0008 fixes **only** the progress-step `start-upload` storm. The following stay open in [feat-0006](../feat-0006/PRODUCT.md), [`04 - sermon-upload-draft.md`](../../04%20-%20sermon-upload-draft.md), or need a follow-on feature.

### Residual effects of the storm (not fixed here)

| ID | Problem | Notes |
| -- | ------- | ----- |
| **R-01** | Duplicate draft rows in DB | Historical burst may have created many partial sermons; needs ops/admin dedupe or script |
| **R-02** | `request aborted` in API logs | Expected when user navigates away or `AbortController` cancels; should drop after single-flight fix |
| **R-03** | Rate limit hits | `sermonUploadRateLimiter` may still 429 if client regresses or user retries rapidly |

### API and personas

| ID | Problem | Notes |
| -- | ------- | ----- |
| **R-04** | Creators blocked on `start-upload` | Route uses `requireMinisterProfile` only; feat-0006 target: minister **or** creator profile |
| **R-05** | `GET /sermon/minister/:id` → 404 | Wrong owner id (user id vs minister `_id`); `resolveStudioSermonOwnerId` mitigates list scope but contract must align API + web |
| **R-06** | Orphan rows from `image-upload` | Cover POST without `sermonId` still creates orphan drafts (feat-0006 known gap) |
| **R-07** | Replace-audio contract | UC-C05 / UC-U4: same sermon id vs new id on re-upload not fully specified in API docs |
| **R-08** | No server idempotency | Duplicate POSTs from any future client bug still create duplicate rows; optional idempotency key is future work |

### Wizard UX (existing UI, behavior gaps)

| ID | Problem | Notes |
| -- | ------- | ----- |
| **R-09** | URL ↔ step out of sync | Route sets initial step; tab clicks do not update URL (feat-0006 known gap) |
| **R-10** | First-time entry without file | Get Started / tour must not open wizard without audio; some links may still bypass entry modal (UC-F03) |
| **R-11** | Close while uploading — server policy | Client abort is defined; whether partial draft stays, is deleted, or marked failed is **undefined** ([04 § Draft states](../../04%20-%20sermon-upload-draft.md#draft-states-and-closing-the-modal)) |
| **R-12** | Remove audio vs UI copy | Dialog says “Move audio to draft”; implementation only `resetUpload()` locally — no API detach; server row with `sermonId` may remain |
| **R-13** | Cancel upload | Local reset + abort; unclear if server deletes incomplete draft or leaves it for My Sermons |

### Draft, list, metadata

| ID | Problem | Notes |
| -- | ------- | ----- |
| **R-14** | Mid-upload draft on My Sermons | UC-DR01: row may appear as soon as `start-upload` creates id; “incomplete” badge/filter not fully defined |
| **R-15** | Draft without audio in table | UC-DR02 empty audio column depends on server fields |
| **R-16** | Creator `DraftProvider` | Minister-scoped; creator studio owner key is feat-0006 gap |
| **R-17** | Review auto-save silent failure | `ReviewSubmit` auto-save logs to console only; user may think metadata is persisted |
| **R-18** | Save without finished upload | UC-DR04: metadata save must not run without `sermonId` from completed upload |

### Onboarding and publish (upload-adjacent)

| ID | Problem | Notes |
| -- | ------- | ----- |
| **R-19** | Publish before tour complete | API should 400; web must show toast (feat-0006 security) |
| **R-20** | First publish vs draft save | UC-F05: draft save must not complete Get Started; only publish does |

### Validation and ops

| ID | Problem | Notes |
| -- | ------- | ----- |
| **R-21** | No automated regression test | feat-0008 validation is manual (network tab = 1 POST) |
| **R-22** | Chunked / resumable upload | Explicit non-goal; large files depend on single long POST |

### Suggested follow-on work

| Priority | Topic | Likely owner spec |
| -------- | ----- | ----------------- |
| P0 | Creator `start-upload` + list owner id (R-04, R-05) | feat-0006 extension or new feat |
| P1 | Cancel / remove audio server policy + align copy (R-11–R-13) | New feat or [`04`](../../04%20-%20sermon-upload-draft.md) amendment |
| P1 | URL ↔ wizard step sync (R-09) | feat-0006 known gap |
| P2 | Orphan draft cleanup + `image-upload` guard (R-01, R-06) | API + ops |
| P2 | Replace-audio API contract (R-07) | API doc + feat-0006 |
| P3 | Auto-save UX + automated single-flight test (R-17, R-21) | feat-0008 TECH or test feat |

Technical detail for **R-*** items: [TECH.md § Remaining gaps](./TECH.md#remaining-gaps-not-in-feat-0008).

## Related docs

- Implementation: [TECH.md](./TECH.md)
- Parent: [feat-0006 PRODUCT](../feat-0006/PRODUCT.md)
- Legacy detail: [`04 - sermon-upload-draft.md`](../../04%20-%20sermon-upload-draft.md)
- Entry / routes: [feat-0005](../feat-0005/PRODUCT.md), [feat-0004](../feat-0004/PRODUCT.md)
