# feat-0007: Tech Spec — Get Started Save & Exit

## Context

See [`PRODUCT.md`](./PRODUCT.md). **Save & Exit** lives in `SaveAndExit.tsx`, mounted by `InnerLayout.tsx` on nested `/get-started/*` inner routes (not the hub index). Helpers: `get-started-save-exit.ts`, `GetStartedProgressContext.tsx` (UC-SE66).

## Current implementation (audit)

| File | Role | Status |
|------|------|--------|
| `components/shared/get-started/SaveAndExit.tsx` | Button + `handleSaveAndExit` | **Stub** — comment “Save progress logic here”; `navigate()` no path |
| `components/layouts/InnerLayout.tsx` | Renders `<SaveAndExit />` top-right; `<Outlet />` + `<ProgressButtons />` | Wired |
| `services/get-started-draft-storage.ts` | sessionStorage JSON for personal / address / ministry | **Used by forms**, not by SaveAndExit |
| `components/shared/get-started/personal-info-form.tsx` | Auto `writePersonalDraft` on field change | Active |
| `components/shared/get-started/home-address-form.tsx` | `writeAddressDraft` on persist | Active |
| `components/shared/get-started/MinistryInput.tsx` | `writeMinistryDraft` on persist | Active |
| `services/get-started-checkpoint.ts` | **Continue** only | Not invoked by Save & Exit |

```tsx
// apps/web/src/components/shared/get-started/SaveAndExit.tsx (today)
const handleSaveAndExit = () => {
    // Save progress logic here
    navigate();
};
```

## Route coverage (`InnerLayout`)

Registered under `minister.route.tsx` → `get-started-inner` → `element: <InnerLayout />`:

| Path segment | Component | Draft on Save & Exit |
|--------------|-----------|----------------------|
| `verify-account` | `GetVerified` | None |
| `verify-account/personal-information` | `VerifyUserInfo` | `GET_STARTED_DRAFT_KEYS.personal` |
| `verify-account/verify-document/*` | Document flow | None (gap) |
| `home-address` | `HomeAddressInfo` | `GET_STARTED_DRAFT_KEYS.address` |
| `ministry-input` | `MinistryInfo` | `GET_STARTED_DRAFT_KEYS.ministry` |
| `tour-guide` | `TourGuidePage` | None |

Hub index `/get-started` uses `GetStarted` **without** `InnerLayout` — no Save & Exit (PRODUCT UC-SE02).

## Draft storage contract

**Module:** `apps/web/src/services/get-started-draft-storage.ts`

| Key constant | sessionStorage key | Type | Writers today |
|--------------|-------------------|------|----------------|
| `GET_STARTED_DRAFT_KEYS.personal` | `troott.getStarted.draft.personal` | `PersonalDraft` | `personal-info-form` (auto) |
| `GET_STARTED_DRAFT_KEYS.address` | `troott.getStarted.draft.address` | `AddressDraft` | `home-address-form` (auto) |
| `GET_STARTED_DRAFT_KEYS.ministry` | `troott.getStarted.draft.ministry` | `MinistryDraft` | `MinistryInput` (auto) |

Storage: **sessionStorage** (tab-scoped; cleared when session ends). Not encrypted; not synced across devices.

### Personal draft — country of residence

`PersonalDraft.country` holds the **first and latest** country-of-residence selection from `personal-info-form.tsx` → `CountrySelect`.

| Event | Writer | Payload |
|-------|--------|---------|
| User changes country | `writePersonalDraft` in `persist()` / `useEffect` | `{ country: { code2, name, phoneCode, flag }, dateOfBirth? }` |
| Save & Exit on personal-information | `saveGetStartedDraftForPath` | Flush draft; country-only is valid |
| Remount personal-information | `readPersonalDraft()` | `draft?.country ?? user?.country` for `CountrySelect` value |

**Implementation note:** Ensure `persist()` runs on `onChange` from `CountrySelect`, not only when DOB is set.

**Implication:** On many steps, fields are **already auto-saved** while typing. Save & Exit must still **flush** latest values and **navigate**; product value is explicit exit + confirmation toast.

## Hub progress bar (replace client-only completion)

**Today (`GetStarted.tsx`):** `onboarding_progress` in **localStorage**; `handleStepComplete(stepId)` runs when the user clicks the accordion inner CTA — increments `completedSteps.length` and the bar **without** server validation. Save & Exit does not touch this today, but the bar can show **3/4** while the server is still on step 1.

**Target:** derive completed hub groups from session onboarding state.

### `getHubCompletedGroupIds(minister, creator, user, userType)`

Returns subset of `['1','2','3','4']` matching [PRODUCT](./PRODUCT.md) milestone table:

| Id | Predicate (minister) | Predicate (creator — target) |
|----|------------------------|------------------------------|
| `1` | `(minister?.onboarding?.step ?? 0) >= 2` | Creator document milestone / `step >= 2` |
| `2` | `step >= 4` | Ministry milestone / `step >= 4` |
| `3` | `step >= 5` | Tour milestone / `step >= 5` |
| `4` | `step >= 6` **or** `onboarding.status === 'completed'` | Same on `creator.onboarding` + `user.onboard` |

```ts
const n = completedIds.length;
const progressPercentage = (n / OnboardingItems.length) * 100;
```

### `GetStarted.tsx` changes

1. Remove `handleStepComplete` from accordion navigate buttons (UC-SE72).
2. Remove or stop writing `localStorage` `onboarding_progress` for bar math (optional: delete key on mount to clear stale 3/4).
3. Read `minister` / `user` / `creator` from context (`useMinister`, `useContextType`) and recompute when session refreshes.
4. `completedSteps.includes(item.id)` → `completedIds.includes(item.id)` for **Completed** button state (UC-SE77–SE78).
5. **Save & Exit** must not import or call any hub completion helper.

### Save & Exit ↔ hub (explicit non-coupling)

```ts
// SaveAndExit.tsx — must NOT call:
// handleStepComplete, setCompletedSteps, localStorage onboarding_progress
```

## Target implementation

### 1. `saveGetStartedDraftForPath(pathname)`

Central helper (new module or extend `get-started-draft-storage.ts`):

| Pathname | Action |
|----------|--------|
| `…/personal-information` | Read form state or call exposed `flush()` from form — prefer **read draft keys** after optional flush from shared form callbacks |
| `…/home-address` | Ensure `writeAddressDraft` from current DOM state |
| `…/ministry-input` | Ensure `writeMinistryDraft` |
| Document routes | No-op + `saved: false` |
| Tour / verify shell | No-op + `saved: false` |

Because forms already auto-persist, minimal implementation: **force final read from forms** OR rely on auto-save + document “already saved” toast.

### 2. `resolveGetStartedExitPath()`

```ts
// Pseudocode — align with portal-onboarding.util + studio-nav
function resolveGetStartedExitPath(): string {
  if (!isAuthenticated()) return PATH_LOGIN;
  if (isStudioOnboardingComplete(userType, minister, user, creator)) {
    const code = getStoredStudioCode();
    return code ? studioHomePath(code) : PATH_GET_STARTED;
  }
  return PATH_GET_STARTED;
}
```

Uses:

- `isStudioOnboardingComplete` from `portal-onboarding.util.ts`
- `getStoredStudioCode` / `studioHomePath` from `studio-nav.util.ts` / `paths.ts`
- `PATH_GET_STARTED` from `paths.ts`

### 3. `SaveAndExit.tsx` handler

```ts
async function handleSaveAndExit() {
  const path = location.pathname;
  const { saved, message } = await saveDraftForCurrentStep(path);
  const target = resolveGetStartedExitPath();
  if (saved) toast.success(message ?? 'Progress saved. Continue from Get Started.');
  else if (hasDraftSupport(path)) toast.success('Progress saved.');
  else toast.message('You can return from Get Started. This step does not store partial progress locally.');
  navigate(target);
}
```

Disable button while `ProgressButtons` busy (lift busy via context or module event — product UC-SE66).

### 4. Optional: clear drafts after checkpoint

On `runGetStartedCheckpoint` success, clear the draft key for that step (avoid UC-SE33 stale override). Map pathname → `clearPersonalDraft()` etc.

## API and server

| Action | Save & Exit | Continue |
|--------|-------------|----------|
| `PUT` user profile | No | Yes (personal / address paths) |
| `PUT` minister / creator profile | No | Yes (ministry / creator branches) |
| `POST` `/minister/onboarding/*-complete` | No | Yes |
| `POST` `/creator/onboarding/*-complete` | No | Yes (when wired) |
| `submitMinisterVerification` | No | Document upload path only |

## Minister vs creator

| Concern | Implementation note |
|---------|---------------------|
| Draft keys | Same keys for both personas (no prefix by `userType`) |
| Exit when incomplete | Both → `/get-started` |
| Forms | `get-started-checkpoint.ts` already branches creator vs minister on **Continue**; Save & Exit stays client-only |

## UI / accessibility

| Item | Spec |
|------|------|
| Component | `Button variant="ghost"` + `Save` icon (lucide) + “Save & Exit” |
| Placement | `InnerLayout` — `flex justify-end` above `max-w-3xl` column |
| `aria-label` | “Save progress and return to Get Started” |
| Loading | Optional spinner on button during flush |

## Known gaps (implementation backlog)

| Gap | PRODUCT ref | Target |
|-----|-------------|--------|
| `SaveAndExit` | UC-SE10–SE24 | `SaveAndExit.tsx`, `get-started-save-exit.ts` |
| No document drafts | UC-SE15, UC-SE43 | Phase 2 draft or server-backed partial save |
| No draft clear after Continue | UC-SE34 | `clearDraftForCheckpointPath` in `ProgressButtons` after ok |
| No disabled state during Continue busy | UC-SE66 | `GetStartedProgressProvider` |
| Hub bar from localStorage clicks | UC-SE70–SE79 | Server-derived `getHubCompletedGroupIds` |
| Residence not guaranteed on first pick | UC-SE10a | Country `onChange` → `writePersonalDraft` |
| feat-0005 UC-I83 | Overlaps this feature | Superseded by feat-0007 |
| feat-0005 UC-B11 local-only hub | Both | Superseded for bar; feat-0007 H section |

## Testing and validation

```bash
cd apps/web && pnpm exec tsc --noEmit
```

| Case | Steps | Expected |
|------|-------|----------|
| Personal draft | Edit country/DOB → Save & Exit → hub → re-enter personal | Fields restored |
| Residence only | Pick country → Save & Exit (no DOB) → re-enter personal | Country restored |
| Hub bar Save & Exit | step 0 → personal only + Save & Exit | Bar **0/4** (not 1/4) |
| Hub bar verify done | Document milestone (step 2) | Bar **1/4**, item 1 **Completed** |
| Hub CTA click | Open verify from hub without milestones | Bar unchanged (no localStorage bump) |
| Address draft | Partial address → Save & Exit → hub → home-address | Fields restored |
| Ministry draft | Partial ministry → Save & Exit → hub → ministry-input | Fields restored |
| No server step bump | Note `minister.onboarding.step` → Save & Exit → refresh session | Step unchanged |
| Document exit | Save & Exit on document upload | Exit hub; toast explains no local save |
| Tour exit | Save & Exit on tour | Exit hub |
| Incomplete exit target | Incomplete onboarding | `/get-started` |
| Creator persona | Repeat as creator | Same as minister |
| Continue still works | Save & Exit then Continue with valid fields | Milestone advances |

## Related

- [feat-0005 TECH](../feat-0005/TECH.md)
- [feat-0007 PRODUCT](./PRODUCT.md)
- `apps/web/src/components/layouts/InnerLayout.tsx`
- `apps/web/src/services/get-started-draft-storage.ts`
