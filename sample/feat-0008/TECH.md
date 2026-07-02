# feat-0008: Tech Spec — Single `start-upload` per file

## Context

See [`PRODUCT.md`](./PRODUCT.md). Fixes the upload API storm; **no new UI**.

---

## Root cause

| File | Issue |
| ---- | ----- |
| `UploadProgressStep.tsx` | `useEffect` started `startUpload` / `startSermonAudioUpload` when deps changed |
| Progress handler | `dispatch(uploadActions.setProgress(pct))` every tick → re-render |
| Unstable deps (historical) | `dispatch`, `queryClient`, `mutateAsync` in dependency array → effect re-ran ~once per percent → **~1000 POSTs** |

```text
render → effect runs → POST start-upload
  → onUploadProgress → setProgress → render → effect runs again → POST …
```

---

## Target implementation (existing UI only)

### 1. Implemented modules (feat-0008)

| Module | Role |
| ------ | ---- |
| `hooks/upload/useStudioSermonAudioUpload.ts` | Single-flight effect, abort, progress throttle, query invalidation |
| `utils/sermon-upload-file-signature.util.ts` | `buildSermonUploadFileSignature`, `shouldSkipSermonUploadStart` |
| `utils/sermon-upload-file-signature.util.spec.ts` | Unit tests (vitest) |
| `components/shared/upload/UploadProgressStep.tsx` | UI only; calls hook |

| Rule | Implementation |
| ---- | ---------------- |
| Stable file key | `buildSermonUploadFileSignature(file)` |
| Single-flight ref | `startedForSignatureRef` in hook; cleared on cleanup / error / `clearUploadFlight()` |
| Minimal deps | `[fileSignature, uploadComplete, uploadError, retryToken]` only |
| No mutation in deps | `startSermonAudioUpload` via service; `dispatch` / `queryClient` / `file` via refs |
| Abort | `AbortController` on cleanup; `axios.isCancel` ignored in catch |
| Retry | `clearUploadFlight()` + `retryToken` + `uploadError` false |
| Minister invalidate | `ministerIdRef` at success time |
| Progress throttle | Dispatch only when rounded percent changes |
| Strict Mode | Cleanup clears flight ref so remount can start one upload |

### 2. Do not change

| Module | Reason |
| ------ | ------ |
| `UploadModal.tsx` / `UploadEntryStepModal.tsx` | Layout and steps unchanged |
| `sermon-upload.service.ts` | Already one POST per call |
| `api/clients/sermon.ts` `startUpload` | Axios progress callback is correct |
| `apps/api` `POST /sermon/start-upload` | Server rate limit may exist; client must not abuse |

### 3. Optional hardening (API)

| Item | Note |
| ---- | ---- |
| Idempotency key header | Future; not required for this fix |
| Server dedupe by session + file hash | Future |

---

## API map (unchanged)

| Method | Path | When |
| ------ | ---- | ---- |
| POST | `/api/v1/sermon/start-upload` | Once per file selection / retry |
| POST | `/api/v1/sermon/image-upload` | Thumbnail step (separate) |
| PUT/PATCH | publish / update | Review step ([feat-0006](../feat-0006/TECH.md)) |

Controller: `apps/api/src/controllers/core/sermon.controller.ts` (`uploadSermom` / start-upload handler).

---

## PRODUCT mapping

| Behaviors | Files |
| --------- | ----- |
| UC-UP01–UP02 | `UploadProgressStep.tsx` single-flight + deps |
| UC-UP03 | `AbortController` cleanup |
| UC-UP04 | `handleRetry` + `retryToken` |
| UC-UP05 | New `fileSignature` |
| UC-UP06 | Existing success branch (`setUploadComplete`, `sermonId`) |

---

## Validation

```bash
cd apps/web && pnpm test
cd apps/web && pnpm exec tsc --noEmit
pnpm dev   # from apps/web; network: filter start-upload — expect 1 request per file pick
```

| Test | Steps | Expected |
| ---- | ----- | -------- |
| Single POST | Pick MP3 → `/sermons/upload/file` | 1× `start-upload` |
| Progress | Watch during upload | Same request; progress events only |
| Retry | Force error → Retry | 1× new POST |
| Replace file | New file from entry | 1× POST for new signature |
| feat-0006 regression | Complete wizard to publish | Unchanged UX |

---

## Gaps closed

| Gap | Resolution |
| --- | ---------- |
| feat-0006 UC-C02 API storm | feat-0008 |
| `request aborted` noise from duplicate POSTs | Reduced when client sends one request |

---

## Remaining gaps (not in feat-0008)

Maps to PRODUCT **R-01** … **R-22**. Implementation references for triage.

### Residual / ops

| ID | Module / layer | Detail |
| -- | -------------- | ------ |
| R-01 | DB / admin | Many `status: draft` rows from pre-fix client; no dedupe job in repo |
| R-02 | `UploadProgressStep.tsx` | `ac.abort()` on cleanup → axios cancel; harmless if only one POST |
| R-03 | `sermon-upload.security.mdw` | Rate limiter on `start-upload` route |

### API

| ID | Module / layer | Detail |
| -- | -------------- | ------ |
| R-04 | `sermon.router.ts` | `requireMinisterProfile` on `/start-upload`; creators need parallel middleware |
| R-05 | Web `useMinisterSermonsQuery`, API `getSermonsByminister` | 404 when route param does not resolve to minister profile |
| R-06 | `uploadSermonCover` | `image-upload` without sermon id |
| R-07 | `sermon.service.ts` | Replace flow: document same-id vs new-id |
| R-08 | `sermon.controller.ts` | No `Idempotency-Key` handling |

### Web wizard

| ID | Module / layer | Detail |
| -- | -------------- | ------ |
| R-09 | `UploadModal.tsx`, `upload-wizard-route.util.ts` | `setStep` does not `navigate` to matching segment |
| R-10 | `_data/onboarding.tsx`, `ProgressButtons.tsx`, `SermonUploadPage.tsx` | Entry redirect vs deep links |
| R-11 | `SermonUploadPage`, API upload handler | Partial multipart + early sermon doc creation undefined |
| R-12 | `UploadProgressStep.tsx` `handleConfirmRemove` | `resetUpload()` only; copy implies server draft move |
| R-13 | `UploadProgressStep.tsx` `handleConfirmCancelUpload` | Same as R-12 for in-flight upload |

### Draft / list

| ID | Module / layer | Detail |
| -- | -------------- | ------ |
| R-14 | `MySermons.tsx`, `SermonsTable.tsx` | List query after invalidation shows new draft immediately |
| R-15 | `ministerSermonDocToDraft` / table columns | Empty audio when canonical `item` / `playbackUrl` missing |
| R-16 | `draftState.tsx` | `useMinister` + `resolveMinisterId` only |
| R-17 | `ReviewSubmit.tsx` `handleAutoSaveDraft` | `catch` → `console.error` only |
| R-18 | `ReviewSubmit.tsx` publish/save handlers | Guard `sermonId` before save |

### Onboarding

| ID | Module / layer | Detail |
| -- | -------------- | ------ |
| R-19 | API onboarding milestones, web `usePublishSermonMutation` | Step &lt; 5 → 400 |
| R-20 | feat-0005 / feat-0006 UC-F05 | Draft vs published milestone |

### Testing

| ID | Detail |
| -- | ------ |
| R-21 | Hook integration / e2e still manual; `sermon-upload-file-signature.util.spec.ts` covers start gate |
| R-22 | `api.sermon.startUpload` single multipart POST; no tus/chunk |

---

## Related

- [feat-0008 PRODUCT](./PRODUCT.md) — **Out of scope (remaining upload problems)** (R-01 … R-22)
- [feat-0006 TECH](../feat-0006/TECH.md) — upload wizard map + known gaps
- [`04 - sermon-upload-draft.md`](../../04%20-%20sermon-upload-draft.md)
