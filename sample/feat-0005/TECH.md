# feat-0005: Tech Spec — Minister and creator onboarding (Get Started)

## Context

See [`PRODUCT.md`](./PRODUCT.md). **Ministers** and **creators** share the same web UI under `/get-started`. Implementation today is **minister-centric** for checkpoints and post-auth; creators use **`user.onboard.status`** for sidebar gating. This spec tracks **product parity** (same process) and **engineering gaps** for creators.

## Personas and completion gates

| Persona | Web helper | Complete when |
|---------|------------|---------------|
| Minister | `isMinisterOnboardingComplete(minister)` | `minister.onboarding.status === 'completed'` |
| Creator | `isStudioOnboardingComplete` → creator branch | `user.onboard.status === 'completed'` |
| Both | `shouldShowGetStartedNavItem` | Either persona incomplete |

```ts
// apps/web/src/utils/portal-onboarding.util.ts
if (ut === UserType.MINISTER) return isMinisterOnboardingComplete(minister);
if (ut === UserType.CREATOR) return user?.onboard?.status === 'completed';
```

**Target:** creator gate also reads `creator.onboarding.status` after API milestones exist; `user.onboard` stays in sync via `syncOnboarding`-style updates on creator service.

## Route map (shared UI)

Parent: authenticated dashboard layout. File: `apps/web/src/routes/minister.route.tsx` (used by **all** studio content roles).

| URL path | Component | Checkpoint (`runGetStartedCheckpoint`) |
|----------|-----------|----------------------------------------|
| `/get-started` | `GetStarted` | — |
| `/get-started/verify-account` | `GetVerified` | — |
| `/get-started/verify-account/personal-information` | `VerifyUserInfo` | Personal + minister `onboardingPersonalComplete` |
| `/get-started/verify-account/verify-document/…` | Document flow | Minister `onboardingDocumentComplete` on upload path — UI detail [feat-0013](../feat-0013/TECH.md) |
| `/get-started/home-address` | `HomeAddressInfo` | Address + `onboardingAddressComplete` |
| `/get-started/ministry-input` | `MinistryInfo` | Ministry + `onboardingMinistryComplete` |
| `/get-started/tour-guide` | `TourGuidePage` | `onboardingTourComplete` |
| `/studio/{code}/sermons/upload/…` | Upload wizard | Minister `onboardingFirstSermonComplete` + sermon publish hook |

Constants: `apps/web/src/routes/paths.ts`.

Nav: `navdata.tsx` lists Get Started for `[UserType.MINISTER, UserType.CREATOR]`.

## API milestones

### Minister (implemented)

| Client (`minister.ts`) | Service | Step after |
|------------------------|---------|------------|
| `onboardingPersonalComplete` | `onboardingPersonalComplete` | 1 |
| `onboardingDocumentComplete` | `onboardingDocumentComplete` | 2 |
| `onboardingAddressComplete` | `onboardingAddressComplete` | 3 |
| `onboardingMinistryComplete` | `onboardingMinistryComplete` | 4 |
| `onboardingTourComplete` | `onboardingTourComplete` | 5 |
| `onboardingFirstSermonComplete` | `onboardingFirstSermonComplete` | 6 / completed |
| `skipMinisterOnboarding` | `skipMinisterOnboarding` | 6 / SKIPPED |
| `submitMinisterVerification` | `submitVerification` | → 2 |

Paths: `apps/web/src/api/core/paths.ts` (`URL_MINISTER_ONBOARDING_*`).

Publish: `sermon.controller` → `tryCompleteOnboardingAfterFirstPublish` (minister user id).

### Creator (gaps)

| Area | Status |
|------|--------|
| `creator.model` / `ICreatorDoc` | `onboarding.step`, `onboarding.status` fields exist |
| `creator.service` | **No** `onboarding*Complete` methods (unlike minister) |
| `apps/web/src/api/clients` | **No** creator client; only `URL_CREATOR` path constant |
| `get-started-checkpoint.ts` | Calls **minister** + **user** APIs only |
| `useRedirectAfterAuth` | **No** creator incomplete → `/get-started` (only minister branch) |
| `sessionState` hydrator | `ministerCtx.refresh` for ministers; **no** creator context refresh |
| Studio provision | `provisionDefaultStudioForCreator` on `createCreator` (parity with minister) |

**Target implementation:** duplicate minister milestone pattern in `creator.service` + `creator.controller` + web `creator` client + branch checkpoints by `userType` (or shared checkpoint service).

## Web modules (shared)

| Module | Minister | Creator |
|--------|----------|---------|
| `_data/onboarding.tsx` | Shared hub actions | Same |
| `GetStarted.tsx` | Shared | Same |
| `ProgressButtons.tsx` | Shared | Same |
| `get-started-checkpoint.ts` | Minister APIs | Needs creator branch |
| `portal-onboarding.util.ts` | Minister gate | `user.onboard` gate |
| `useRedirectAfterAuth.ts` | Incomplete → get-started | **Gap:** goes to studio |
| `ministerState` / `useMinister` | Yes | N/A |
| `useSermon` publish hook | `onboardingFirstSermonComplete` | Should run for creator when applicable |

## Post-auth (feat-0001 alignment)

Current `useRedirectAfterAuth.ts`:

1. Admin → `/admin/users`
2. **Minister** incomplete → `PATH_GET_STARTED`
3. **`isStudioContentRole`** (minister complete + **creator**) → `navigateToStudioPortal`

**Required for PRODUCT UC-A02:**

```ts
if (isStudioContentRole(ut) && !isStudioOnboardingComplete(ut, minister, user)) {
  navigate(PATH_GET_STARTED, replace);
  return;
}
await navigateToStudioPortal(...);
```

Apply **before** studio navigation for **both** minister and creator.

## Session hydration

| Persona | Today | Target |
|---------|-------|--------|
| Minister | `SessionHydrator` → `ministerCtx.refresh` | Keep |
| Creator | User slice only; no creator profile fetch | `creatorCtx.refresh` + `creator.onboarding` for UI |

## Step flow

Same `OnboardingItems` + `ProgressButtons` for both. Tour exit uses `getStoredStudioCode()` + `studioUploadPath` (lowercase code).

## Known gaps (audit)

| Gap | Personas | PRODUCT refs |
|-----|----------|--------------|
| Creator post-auth skips get-started | Creator | UC-A02, UC-A02a |
| Checkpoints minister-only | Creator | UC-C22a, UC-C32a, UC-C51 |
| Completion gate split (`user` vs `creator.onboarding`) | Creator | Completion table |
| No creator API client on web | Creator | API section |
| Hub localStorage ≠ server step | Both | UC-L114 |
| `SaveAndExit` stub | Both | feat-0007; was UC-I83 |
| `onboardingFirstSermonComplete` on publish for creator | Creator | UC-C72a |

## Testing and validation

| Case | Minister | Creator (target) |
|------|----------|------------------|
| Register + activate | → get-started | → get-started |
| Login incomplete | → get-started | → get-started |
| Login complete | → studio | → studio |
| Sidebar Get Started | visible / hidden | same |
| Personal checkpoint | minister APIs | creator APIs |
| Publish completes gate | minister.onboarding | user.onboard + creator.onboarding |

```bash
cd apps/web && pnpm exec tsc --noEmit
```

Manual: repeat ladder as **creator** account; confirm same URLs and gates as minister after gaps closed.

## Related

- [feat-0013 PRODUCT](../feat-0013/PRODUCT.md) / [TECH](../feat-0013/TECH.md) — document verification upload modal (NIN, license, passport)
- [feat-0006 PRODUCT](../feat-0006/PRODUCT.md) / [TECH](../feat-0006/TECH.md) — upload wizard, publish, drafts, bin, first-time sermon
- [feat-0007 PRODUCT](../feat-0007/PRODUCT.md) / [TECH](../feat-0007/TECH.md) — Save & Exit
- [feat-0001 TECH](../feat-0001/TECH.md) — extend post-auth for creator onboarding
- [feat-0004 TECH](../feat-0004/TECH.md)
- `apps/api/src/services/core/minister.service.ts`
- `apps/api/src/services/core/creator.service.ts` — add milestones (target)
