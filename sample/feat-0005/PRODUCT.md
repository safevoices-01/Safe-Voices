# feat-0005: Minister and creator onboarding (Get Started)

## Summary

**Ministers** and **creators** share the same **Get Started** experience on web (`/get-started`): verify account, complete profile, tour, and first sermon upload under `/studio/{code}/…`. Both personas use the same routes, hub checklist, inner step flows, and ProgressButtons pattern. They must finish onboarding before the portal treats them as studio-ready.

**Completion (product):** same six-step ladder and the same user-visible outcome — Get Started hidden, post-auth enters studio.

**Completion (gates today, may differ by persona until API parity):**

| Persona | Primary gate on web |
|---------|---------------------|
| **Minister** | `minister.onboarding.status === 'completed'` |
| **Creator** | `user.onboard.status === 'completed'` (feat-0002 / `portal-onboarding.util.ts`; `creator.onboarding` exists on API model for future alignment) |

Until creator milestone APIs match the minister ladder, creators still follow the **same UI process**; checkpoints and post-auth should be brought in line (see TECH gaps).

Complements [feat-0001](../feat-0001/PRODUCT.md), [feat-0002](../feat-0002/PRODUCT.md) (Get Started nav for minister **and** creator), and [feat-0004](../feat-0004/PRODUCT.md).

## Problem

Get Started spans a shared hub, verify-account tree, profile forms, tour, and studio upload. State is split across local drafts, minister-only checkpoint APIs, minister context, `user.onboard`, and `creator.onboarding`. Without one spec covering **both** studio personas, it is unclear whether a creator bug is missing post-auth redirect, wrong completion gate, or minister-only API calls on shared screens.

## Non-goals

- **Listener** onboarding (mobile; not web portal).
- **Admin / super-admin** Get Started (never shown per feat-0002).
- Separate creator-only route tree (product uses the same `/get-started` paths as ministers).
- Backend verification adjudication beyond submit + status fields.
- Mobile onboarding screens.
- Full upload wizard and sermon CRUD detail ([feat-0006](../feat-0006/PRODUCT.md); legacy UC-U/V in [`04 - sermon-upload-draft.md`](../../04%20-%20sermon-upload-draft.md), [`05 - sermon-view-trash.md`](../../05%20-%20%20sermon-view-trash.md)).

## Figma

Figma: none provided. Baseline: shared Get Started hub, verify flows, ministry/address forms (same components for both personas), tour, studio upload wizard.

## Actors

| Actor | Persona | Description |
|-------|---------|-------------|
| **New studio user** | Minister or creator | Self-registers, activates email, enters Get Started. |
| **Returning studio user (incomplete)** | Minister or creator | Signed in; onboarding not complete per gate above. |
| **Returning studio user (complete)** | Minister or creator | Onboarding complete; uses `/studio/{code}/…`. |
| **Invited studio user** | Minister or creator | Accepts invitation, sets password, same ladder when web exposes accept. |
| **Platform** | — | Step order on minister APIs today; publish may complete minister step 6. |

## Shared process (minister = creator)

Both personas:

1. Land on **`/get-started`** when onboarding is incomplete (product target; see UC-A02).
2. Complete the **same four hub items**: Verify account, Complete profile, How to use troott, Upload first sermon.
3. Follow the **same URL ladder** under `/get-started` (see TECH route map).
4. Use **Continue** to run checkpoints (personal → document → address → ministry → tour).
5. Finish with **first sermon publish** (or equivalent completion signal) then enter **studio** with lowercase `studioCode` on web.
6. See **Get Started** in the sidebar until complete; **Main** studio links follow feat-0004.

Copy may say “ministry” on forms for both; creators still supply the same profile fields (name, site, description, HQ) for their studio presence.

## Completion and step ladder (source of truth)

Server ladder for **ministers** (`apps/api/src/services/core/minister.service.ts`). **Product default:** creators follow the **same numbered steps** and stages; API should expose parallel `POST /creator/onboarding/*-complete` (or shared studio-persona endpoints) — see TECH gaps.

| Step | Stage (`user.onboard.stage`) | Milestone | Typical UI block |
|------|------------------------------|-----------|------------------|
| 1 | `MINISTER_PERSONAL` (minister) / creator equivalent | Personal complete | Country + date of birth |
| 2 | `MINISTER_DOCUMENT` / creator equivalent | Document complete | Passport, NIN, or driver's license |
| 3 | `MINISTER_ADDRESS` / creator equivalent | Address complete | Home address + phone |
| 4 | `MINISTER_MINISTRY` / creator equivalent | Profile complete | Ministry/studio name, site, description, HQ |
| 5 | `MINISTER_TOUR` / creator equivalent | Tour complete | Tour page |
| 6 | `MINISTER_FIRST_SERMON` / creator equivalent | First sermon / completed | Publish first sermon (or skip API) |

**Minister complete:** `minister.onboarding.status === 'completed'`.

**Creator complete (web today):** `user.onboard.status === 'completed'`.

**Creator complete (target alignment):** `creator.onboarding.status === 'completed'` synced with `user.onboard`, same as minister pattern.

**Skip (minister API today):** `POST /minister/onboarding/skip`. Product default: creator skip only when a symmetric creator skip exists; support-only unless UI added.

## Use case catalog

Persona column: **Both** = minister and creator unless noted.

### A. Entry and routing

| ID | Persona | Use case | Preconditions | Main flow | Postcondition |
|----|---------|----------|---------------|-----------|---------------|
| **UC-A01** | Both | Self-register → activate → Get Started | Register as minister or creator; OTP success | Register → activate → persist → post-auth | `/get-started`; profile context loading |
| **UC-A02** | Both | Login with incomplete onboarding | Active account; gate not complete | Login → refresh → post-auth | **`/get-started`**, not `/studio/{code}` (product target for both) |
| **UC-A03** | Both | Login with complete onboarding | Gate complete | Login → post-auth → `navigateToStudioPortal` | `/studio/{code}` (lowercase code on web) |
| **UC-A04** | Both | Open Get Started hub | Incomplete onboarding | Sidebar or post-auth → `/get-started` | Four accordion groups; local progress optional |
| **UC-A05** | Both | Incomplete user blocked from studio | Onboarding incomplete | Bookmark `/studio/{code}` or disabled Main | Get Started or disabled links (feat-0004); no bare `/dashboard` |
| **UC-A06** | Both | Deep link after login | `returnTo` under `/get-started/…` allowed | Login → `returnTo` | Lands on requested step |
| **UC-A07** | — | Listener / non-portal | Listener or unknown type | Login | `/unauthorized` |

| ID | Persona | Note |
|----|---------|------|
| **UC-A02a** | Creator | **Implementation gap:** post-auth may send creator to studio without checking `user.onboard` (minister-only branch today). Product = same as UC-A02. |

### B. Get Started hub (checklist)

| ID | Persona | Use case | Preconditions | Main flow | Postcondition |
|----|---------|----------|---------------|-----------|---------------|
| **UC-B10** | Both | View checklist | On hub index | Four items: Verify, Complete profile, Tour, Upload first sermon | Any item openable (no server lock on hub today) |
| **UC-B11** | Both | Mark item complete locally | On hub | ~~Complete on accordion~~ | **Superseded:** [feat-0007](../feat-0007/PRODUCT.md) — no local mark on navigate |
| **UC-B12** | Both | Hub progress bar | Server milestones | Bar shows n/4 | **Only** fully completed groups; not Save & Exit ([feat-0007](../feat-0007/PRODUCT.md)) |
| **UC-B13** | Both | Jump to verify | Any | → `/get-started/verify-account` | Verify shell |
| **UC-B14** | Both | Jump to profile | Any | → `/get-started/home-address` | Address (+ ministry via Continue) |
| **UC-B15** | Both | Jump to tour | Any | → `/get-started/tour-guide` | Tour |
| **UC-B16** | Both | Jump to upload | Studio code in storage | → `/studio/{code}/sermons/upload/…` | Wizard when code exists; placeholder `/_/…` if missing |

### C. Verify account — personal (step 1)

| ID | Persona | Use case | Preconditions | Main flow | Postcondition |
|----|---------|----------|---------------|-----------|---------------|
| **UC-C20** | Both | Open verify shell | Authenticated | `/get-started/verify-account` | Outlet for sub-routes |
| **UC-C21** | Both | Personal information | Verify flow | `/get-started/verify-account/personal-information` | Draft saved |
| **UC-C22** | Both | Continue personal (success) | Country + DOB | Checkpoint → profile update + **personal milestone** | Step ≥ 1 |
| **UC-C23** | Both | Continue personal (fail) | Missing fields | Continue | Toast; stay on form |
| **UC-C24** | Both | Idempotent personal | Step ≥ 1 | Continue | API accepts already recorded |

| ID | Persona | Note |
|----|---------|------|
| **UC-C22a** | Creator | Checkpoint calls **minister** APIs today; creator path needs `updateCreator` + creator personal milestone (gap). |

### D. Verify account — document (step 2)

| ID | Persona | Use case | Preconditions | Main flow | Postcondition |
|----|---------|----------|---------------|-----------|---------------|
| **UC-C30** | Both | Select document type | Step ≥ 1 | Verify document index | NIN, Driver's License, International Passport — [feat-0013](../feat-0013/PRODUCT.md) |
| **UC-C31** | Both | Document sub-routes | Type chosen | document1 / select / upload | Capture UI |
| **UC-C32** | Both | Submit verification | Images captured | Submit verification API | Verification stored |
| **UC-C33** | Both | Continue document milestone | After submit | `onboardingDocumentComplete` (minister) / creator equivalent | Step ≥ 2 |
| **UC-C34** | Both | Document before personal | Step &lt; 1 | Continue | API 400 |
| **UC-C35** | Both | Admin verification outcome | Submitted | Back office | `verification.status` updated |

| ID | Persona | Note |
|----|---------|------|
| **UC-C32a** | Creator | Use `submitCreatorVerification` when creator checkpoint exists; minister submit today. |

### E. Complete profile — address (step 3)

| ID | Persona | Use case | Preconditions | Main flow | Postcondition |
|----|---------|----------|---------------|-----------|---------------|
| **UC-C40** | Both | Home address | Step ≥ 2 | `/get-started/home-address` | Draft |
| **UC-C41** | Both | Continue address (success) | Required fields | User location update + address milestone | Step ≥ 3 |
| **UC-C42** | Both | Continue address (fail) | Missing fields | Continue | Toast |
| **UC-C43** | Both | Legacy URL | Bookmark `/complete-profile` | Redirect | → `home-address` |

### F. Complete profile — ministry / studio profile (step 4)

| ID | Persona | Use case | Preconditions | Main flow | Postcondition |
|----|---------|----------|---------------|-----------|---------------|
| **UC-C50** | Both | Ministry / studio profile | Step ≥ 3 | `/get-started/ministry-input` | Name required; optional site, description, HQ |
| **UC-C51** | Both | Continue profile (success) | Name present | `updateMinister` or `updateCreator` + ministry milestone | Step ≥ 4 |
| **UC-C52** | Both | Continue before address | Step &lt; 3 | Continue | API 400 |

### G. Tour (step 5)

| ID | Persona | Use case | Preconditions | Main flow | Postcondition |
|----|---------|----------|---------------|-----------|---------------|
| **UC-C60** | Both | Tour page | Step ≥ 4 | `/get-started/tour-guide` | Back → ministry-input |
| **UC-C61** | Both | Continue tour | On tour | Tour milestone | Step ≥ 5 |
| **UC-C62** | Both | After tour → upload | Code available | → `/studio/{code}/sermons/upload` | Upload entry |
| **UC-C63** | Both | After tour, no code | No `studioCode` | Continue | Return hub until code exists |

### H. Upload first sermon (step 6)

| ID | Persona | Use case | Preconditions | Main flow | Postcondition |
|----|---------|----------|---------------|-----------|---------------|
| **UC-C70** | Both | Upload from hub | Code resolved | Studio upload paths | Wizard |
| **UC-C71** | Both | Save draft in wizard | In upload | Save / close | Per upload spec |
| **UC-C72** | Both | Publish first sermon | Step 5 done | Publish + completion hooks | Gates show complete |
| **UC-C73** | Minister | Publish completes onboarding (API) | Minister on step 5 | `tryCompleteOnboardingAfterFirstPublish` | Minister step 6 |
| **UC-C74** | Both | After publish | Published | Navigate | `/studio/{code}/sermons` or hub |

| ID | Persona | Note |
|----|---------|------|
| **UC-C72a** | Creator | Confirm publish sets `user.onboard.status` and/or `creator.onboarding` + optional `onboardingFirstSermonComplete` for creators. |

### I. Progress navigation

| ID | Persona | Use case |
|----|---------|----------|
| **UC-I80** | Both | Back within step group |
| **UC-I81** | Both | Continue within step group |
| **UC-I82** | Both | Finish last sub-step in group |
| **UC-I83** | Both | Save and exit — see [feat-0007](../feat-0007/PRODUCT.md) (full use cases) |

### J. Session, sidebar, and studio

| ID | Persona | Use case |
|----|---------|----------|
| **UC-J90** | Both | Get Started nav visible when incomplete |
| **UC-J91** | Both | Get Started hidden when complete |
| **UC-J92** | Both | Main links disabled without code on get-started (feat-0004) |
| **UC-J93** | Both | Upload links with cached code |
| **UC-J94** | Minister | Session loads `minister` via `ministerCtx.refresh` |
| **UC-J95** | Both | Default studio at signup (`provisionDefaultStudioForMinister` / `provisionDefaultStudioForCreator`) |
| **UC-J96** | Creator | Session should load **creator** profile for gates (gap: no `creatorCtx.refresh` in hydrator today) |

### K. Invitation

| ID | Persona | Use case |
|----|---------|----------|
| **UC-K100** | Both | Accept invitation → onboarding message |
| **UC-K101** | Both | First login after invite → Get Started if incomplete |
| **UC-K102** | Minister | Admin invites minister (platform) |
| **UC-K103** | Creator | Admin/platform invites creator |

### L. Negative and edge cases

| ID | Persona | Expected behavior |
|----|---------|-------------------|
| **UC-L110** | Both | Unauthenticated `/get-started` → login |
| **UC-L111** | Both | Studio persona on `/admin/*` → unauthorized |
| **UC-L112** | Both | Session expiry mid-flow → login; drafts may remain |
| **UC-L113** | Both | Checkpoint API error → toast; stay on step |
| **UC-L114** | Both | Hub “Completed” vs server step mismatch |
| **UC-L115** | Minister | Skip onboarding API (support-only) |
| **UC-L116** | Both | Minister vs creator on same account — product uses single `userType` gate |

## Behavior (product rules)

### A. Shared studio personas

1. **Minister and creator** use the **same** Get Started routes and hub (no separate `/creator/get-started`).

2. **Post-auth** must treat incomplete onboarding the same: **Get Started before studio** for both (feat-0001 order applies to all `isStudioContentRole` with incomplete gate).

3. **Completion** for sidebar and Get Started visibility uses `isStudioOnboardingComplete(userType, minister, user)` — minister branch vs creator branch inside one helper.

4. **feat-0002:** Get Started nav for **minister and creator** only; never admin/super-admin.

5. **feat-0004:** Same studio-scoped Main link rules on `/get-started` and `/admin/*` (super-admin).

### B. Routing and paths

6. Canonical prefix `/get-started` + `PATH_SEG_GET_STARTED_*` in `paths.ts`.

7. Routes registered in `minister.route.tsx` (name is historical; applies to **both** personas).

### C. Verify and profile steps

8–10. Same document types and step ordering as minister ladder (personal → document → address → ministry → tour → first sermon).

### D. Completion signals

11. **Minister:** `minister.onboarding.status === 'completed'` (and sync to `user.onboard` on API).

12. **Creator (target):** same six steps; **creator** `onboarding.status === 'completed'` aligned with `user.onboard.status`.

13. **Publish** completes step 6 for ministers; creators receive equivalent on first publish. **Upload first sermon** uses the same UI as **Create sermon** on `/studio/{code}/sermons` ([feat-0006](../feat-0006/PRODUCT.md) UC-F03 / UC-C01).

### E. Hub vs server

14. Client-only `onboarding_progress` applies to both; should eventually reflect server step per persona.

## Open questions

1. Hub **lock** until server step matches? **Default:** yes later; today open for both.

2. Verification **blocks publish**? **Default:** policy TBD; same for both.

3. **Save & Exit** — specified in [feat-0007](../feat-0007/PRODUCT.md).

4. Creator checkpoints: **mirror minister endpoints** under `/creator/onboarding/*` or **single** `/studio-onboarding/*`? **Default:** mirror minister shape on creator service.

## Related

- [feat-0001 PRODUCT](../feat-0001/PRODUCT.md)
- [feat-0002 PRODUCT](../feat-0002/PRODUCT.md)
- [feat-0004 PRODUCT](../feat-0004/PRODUCT.md)
- [feat-0006 PRODUCT](../feat-0006/PRODUCT.md) — upload, drafts, publish, bin
- [feat-0007 PRODUCT](../feat-0007/PRODUCT.md) — Save & Exit on inner Get Started steps
- [`04 - sermon-upload-draft.md`](../../04%20-%20sermon-upload-draft.md)
- `apps/api` — `minister.service` onboarding; `creator.model` onboarding fields
