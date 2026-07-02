# feat-0006: Tech Spec — Studio sermon CRUD (upload, drafts, library, bin, first publish)

## Context

See [`PRODUCT.md`](./PRODUCT.md). This document maps **CRUD operations** to **API routes**, **web modules**, and **known gaps** for ministers and creators under `/studio/:studioCode`.

## Route map (web)

Parent: `studio.route.tsx` → `StudioPortal` (lowercase code redirect).

| Path under `/studio/:studioCode` | Component | CRUD |
|----------------------------------|-----------|------|
| `sermons` | `MySermons` | **R** list |
| `sermons/upload` (+ `file`, `details`, `thumbnail`, `publish`) | `SermonUploadPage` → `UploadModal` | **C** + **U** wizard |
| `sermons/:sermonId` | `SermonDetailPlaceholder` | **R** detail (stub) |
| `sermons/:sermonId/resume` | `SermonDetailPlaceholder` | **U** resume draft |
| `sermons/:sermonId/edit` | `SermonDetailPlaceholder` | **U** edit |
| `bin` | `Bin` | **R** bin list (restore / permanent delete) |

Path helpers: `apps/web/src/routes/paths.ts` — `studioUploadPath`, `studioSermonsListPath`, `PATH_SEG_BIN`, etc.

## API surface (v1)

Base prefix: `/api/v1/sermon` (`apps/api/src/routes/sermon.router.ts`).

| Operation | Method | Path | Auth | Notes |
|-----------|--------|------|------|-------|
| **Create** (audio) | POST | `/start-upload` | Protect + rate limit | Multipart; creates draft sermon |
| **Create** (cover) | POST | `/image-upload` | Protect | Thumbnail |
| **Read** (one) | GET | `/:id` | Protect | Detail / resume (signed-in only; feat-0004) |
| **Read** (by minister) | GET | `/minister/:ministerId` | optional | List + `page`, `limit`, `sort`, `q`, `status` (`draft` \| `published` \| `all` \| `bin`), dates |
| **Restore** | PUT | `/restore/:id` | Protect | Sets `status: draft`, `state: active` |
| **Update** | PUT | `/update/:id` | Protect | Metadata patch |
| **Publish / draft save** | POST | `/publish/:id` | Protect | Body includes `status: 'published' \| 'draft'` |
| **Delete soft** | PUT | `/move-to-bin/:id` | Protect | Sets deleted state; owner policy |
| **Delete hard** | DELETE | `/delete/:id` | Protect | Permanent; admin rules for published |

**Onboarding side effect (publish):** `sermon.controller` `publishSermon` / update path calls `ministerService.tryCompleteOnboardingAfterFirstPublish` or `creatorService` equivalent when user owns minister/creator profile ([feat-0005](../feat-0005/TECH.md)).

**Web client:** `apps/web/src/api/clients/sermon.ts` — mirrors paths in `apps/web/src/api/core/paths.ts`.

## Status and filters

| Field | Values (typical) | Usage |
|-------|------------------|-------|
| `status` | `draft`, `published` | List filter, publish payload |
| `state` | `active`, `deleted` | Bin exclusion in repository queries (`$ne: 'deleted'`) |

List parsing: `parseMinisterSermonsResponse` / `mapApiSermonToTableRow` in `apps/web/src/utils/sermon-list-map.util.ts`.

## Web modules by concern

### Read (library)

| Module | Role |
|--------|------|
| `MySermons.tsx` | Page; TanStack query `getSermonsByMinister` |
| `SermonsTable.tsx` | Toolbar, filters, grid/list, move-to-bin, open upload |
| `sermon-query-keys.ts` | `sermonQueryKeys.ministerList(ministerId, params)` |
| `useMinisterSermonsQuery` / inline query in `MySermons` | Server list |
| `resolveStudioSermonOwnerId` | Minister profile id, else creator’s user id for list/upload scope |

### Create / update (upload wizard)

| Module | Role |
|--------|------|
| `uploadState.tsx` | Wizard state, file, sermonId, steps |
| `UploadModal.tsx` | Step shell |
| `ReviewSubmit.tsx` | Save draft + publish; builds `PublishSermonDTO` |
| `sermon-upload.service.ts` | `startSermonAudioUpload` → `api.sermon.startUpload` |
| `useSermon.ts` | `usePublishSermonMutation`, `useUpdateSermonMutation`, `useStartSermonUploadMutation` |
| `UploadProgressStep.tsx` | Progress UI; **must** single-flight `start-upload` ([feat-0008](../feat-0008/PRODUCT.md)) |

Publish hook (first-time onboarding):

```ts
// apps/web/src/hooks/app/useSermon.ts — on published success
variables.payload.status === MediaStatus.PUBLISHED
  → api.minister.onboardingFirstSermonComplete({})
  or api.creator.onboardingFirstSermonComplete({}) by userType
```

### Drafts (client CRUD mirror)

| Module | Role |
|--------|------|
| `draftState.tsx` / `DraftProvider` | Loads drafts via minister list `status: 'draft'` |
| `sermon-draft-map.util.ts` | `ministerSermonDocToDraft`, `partialDraftToUpdateSermonDto` |
| `get-started-checkpoint.ts` | Unrelated to sermon drafts (profile onboarding only) |

Draft **save** paths in `ReviewSubmit.tsx`:

- Existing `sermonId` → `publishSermon` with `status: 'draft'`.
- Legacy `draftId` → `updateDraft` in draft context.

### Delete (bin)

| Module | Role |
|--------|------|
| `useMoveSermonToBinMutation` | `api.sermon.moveSermonToBin` |
| `SermonsTable.tsx` | Confirm dialog + invalidate list |
| `Bin.tsx` | Bin list via `status=bin`; restore + permanent delete actions |

**Bin list contract:** `GET /sermon/minister/:ownerId?status=bin` returns soft-deleted rows for that owner. Restore: `PUT /sermon/restore/:id`. Permanent delete: `DELETE /sermon/delete/:id` (owner policy applies).

### First-time publish integration

| Layer | Behavior |
|-------|----------|
| Web `usePublishSermonMutation` | Calls onboarding milestone when `status === published` |
| API `publishSermon` / update handler | `tryCompleteOnboardingAfterFirstPublish` for minister or creator |
| feat-0005 gate | Get Started hidden when `isStudioOnboardingComplete` |

**Ordering:** Tour complete (step 5) before first publish is enforced server-side on onboarding milestones; publish should not complete onboarding if step &lt; 5 (API returns 400).

## Personas: minister vs creator

| Concern | Minister (today) | Creator (target / gaps) |
|---------|------------------|-------------------------|
| List scope | `GET /sermon/minister/:ownerId` | Owner id = minister `_id` or user id (creator uploads) |
| Publish payload `minister` | `resolveStudioSermonOwnerId` | Minister id or user id for creators |
| `start-upload` | `requireMinisterProfile` | Minister **or** creator profile |
| Onboarding on publish | `minister.onboardingFirstSermonComplete` | `creator.onboardingFirstSermonComplete` (implemented feat-0005) |
| Draft provider | `useMinister` + `resolveMinisterId` | Extend to creator profile id or shared studio owner key |

## Query invalidation contract

After **publish**, **save draft**, **move to bin**, or **update**:

1. `invalidateQueries({ queryKey: sermonQueryKeys.all })`
2. `invalidateQueries({ queryKey: sermonQueryKeys.ministerListRoot(ministerId) })` when `ministerId` known

Ensures UC-R01 list refresh without manual reload.

## Upload wizard ↔ URL

**Create sermon / first-time entry (UC-C01, UC-F03):**

| Module | Role |
|--------|------|
| `useCreateSermonEntry` | Entry modal + `openCreateSermon` location state + navigate to upload after file |
| `constants/create-sermon-nav.ts` | `OPEN_CREATE_SERMON_STATE` |
| `EmptySermonsState` / `SermonsTable` | **Create sermon** → `openEntry()` |
| `_data/onboarding.tsx` | Step 4 action → `/studio/{code}/sermons` + `openCreateSermon` (not bare upload URL) |
| `ProgressButtons.tsx` | Post-tour → `studioSermonsListPath` + `openCreateSermon` |
| `SermonUploadPage` | No audio and no `resumeSermonId` → replace navigate to sermons + open entry modal |

`SermonUploadPage` opens `UploadModal` only after audio is in upload context (from entry modal or resume). Closing the wizard returns to `/studio/{code}/sermons`.

| Segment | Typical step |
|---------|----------------|
| `sermons/upload` | Wizard (after entry modal file pick) |
| `sermons/upload/file` | File / progress |
| `sermons/upload/details` | Metadata |
| `sermons/upload/thumbnail` | Cover |
| `sermons/upload/publish` | Review |

## Security and policy (API)

`sermonService.validateDeletePolicy`:

- Non-admin **owner** cannot `move-to-bin` or `delete` **published** sermons.
- Admin hard-delete published requires `allowPublishedDelete=true`.

Web must surface 403 messages in toast (see `isApiHttp2xxErrorEnvelope`).

## Known gaps (audit)

| Gap | Area | Notes |
|-----|------|-------|
| Series/Playlists tabs | Web | Non-functional tabs in `SermonsTable` (non-goal) |
| Legacy docs use `/minister/:id/audio` | Docs | Point to feat-0006 routes |
| URL ↔ wizard step | Web | Tab clicks sync URL via `uploadPathSegmentFromStep` (feat-0018) |
| `image-upload` without `sermonId` | API | Still creates orphan draft row (legacy) |

## Testing and validation

```bash
cd apps/web && pnpm exec tsc --noEmit
```

| Case | Minister | Creator |
|------|----------|---------|
| start-upload → draft on list | Yes | Yes (same wizard) |
| Save draft | publish `status: draft` | Same |
| Publish | List + onboarding complete if first | Same + creator milestone |
| Move draft to bin | Success | Same |
| Move published to bin | 403 for owner | Same |
| Bin page | Lists deleted (when implemented) | Same |
| First publish completes Get Started | minister.onboarding | creator.onboarding + user.onboard |

Manual: upload → save draft → appears on `/studio/{lowercaseCode}/sermons` → publish → Get Started hidden → move another draft to bin → open `/studio/{code}/bin`.

## Related

- [feat-0008](../feat-0008/PRODUCT.md) — single `start-upload` per file (fixes progress-step API storm)
- [feat-0005 TECH](../feat-0005/TECH.md) — onboarding + upload route row
- [feat-0004 TECH](../feat-0004/TECH.md) — sidebar URLs to sermons/bin/upload
- `apps/api/src/services/core/sermon.service.ts`
- `apps/api/src/controllers/core/sermon.controller.ts`
- [`04 - sermon-upload-draft.md`](../../04%20-%20sermon-upload-draft.md)
- [`05 - sermon-view-trash.md`](../../05%20-%20%20sermon-view-trash.md)
- [feat-0018 PRODUCT](../feat-0018/PRODUCT.md) — Figma-aligned My Sermons + upload + drafts UI
