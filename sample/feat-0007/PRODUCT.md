# feat-0007: Get Started — Save & Exit

## Summary

**Save & Exit** is a persistent control on **inner** Get Started steps (minister and creator): top-right of `InnerLayout`, above the step form and beside **Back** / **Continue** (`ProgressButtons`). It lets a studio user **persist in-progress form data locally** and **leave onboarding** without finishing the current milestone via **Continue**.

Save & Exit is **not** a server checkpoint. **Continue** runs `runGetStartedCheckpoint` (profile APIs + onboarding milestones). Save & Exit must **not** advance `minister.onboarding.step` / `user.onboard` / creator onboarding.

Complements [feat-0005](../feat-0005/PRODUCT.md) (Get Started ladder) and [feat-0001](../feat-0001/PRODUCT.md) (post-auth routing).

## Problem

Onboarding inner steps can take several minutes. Users need to pause without losing typed fields and without being forced through **Continue** (which may fail validation or advance a step they are not ready to complete). Save & Exit persists session drafts (where supported), shows product toasts, and navigates to the hub or studio home when onboarding is complete.

Without a spec:

- It is unclear what “Save” means vs **Continue** vs hub local “Completed”.
- **Country of residence** chosen on personal information may be lost after Save & Exit if not explicitly persisted.
- The hub **n/4 completed** bar can advance when the user only opens a checklist item, not when a ladder group is truly finished.
- Document verification screens have no draft contract.
- Exit destination (hub vs studio vs login) is undefined.

## Non-goals
- **Continue** / checkpoint behavior (documented in feat-0005).
- **Upload wizard** Save draft / publish ([feat-0006](../feat-0006/PRODUCT.md)).
- **Logout** or account deletion.
- Cross-device draft sync (session storage is per browser tab/session).
- Admin or listener personas (no Get Started inner layout).

## Figma

Figma: none provided. Baseline: ghost button with save icon, label **Save & Exit**, top-right of inner step pages (`InnerLayout`).

## UI placement

| Surface | Save & Exit shown? | Layout shell |
|---------|-------------------|--------------|
| `/get-started` hub (`GetStarted`) | **No** | Full-page hub; no `InnerLayout` |
| `/get-started/verify-account` | **Yes** | `InnerLayout` |
| `/get-started/verify-account/personal-information` | **Yes** | `InnerLayout` |
| `/get-started/verify-account/verify-document` (+ sub-routes) | **Yes** | `InnerLayout` |
| `/get-started/home-address` | **Yes** | `InnerLayout` |
| `/get-started/ministry-input` | **Yes** | `InnerLayout` |
| `/get-started/tour-guide` | **Yes** | `InnerLayout` |
| `/studio/{code}/sermons/upload/…` | **No** | Studio upload; different product |

```text
┌─────────────────────────────────────────────────────────────┐
│                                    [ Save & Exit ]          │
├─────────────────────────────────────────────────────────────┤
│  Step title / form (PageHeader, forms, document upload)     │
├─────────────────────────────────────────────────────────────┤
│  [ Back ]                              [ Continue ]         │
└─────────────────────────────────────────────────────────────┘
```

## Actors

| Actor | Persona | Description |
|-------|---------|-------------|
| **Studio user (incomplete)** | Minister or creator | Mid-ladder; may exit and return later. |
| **Returning studio user** | Minister or creator | Resumes step; drafts pre-fill if present. |
| **Platform** | — | Server step unchanged until **Continue** or publish milestones. |

## Definitions

| Term | Meaning |
|------|---------|
| **Save (client)** | Write current form fields to **sessionStorage** drafts (where supported) before leaving. |
| **Exit** | Navigate away from the current inner step without calling checkpoint APIs. |
| **Checkpoint** | **Continue** only — `runGetStartedCheckpoint(pathname)` in feat-0005. |
| **Draft restore** | On remount, forms read `readPersonalDraft` / `readAddressDraft` / `readMinistryDraft`. |
| **Country of residence** | First country selected on **Personal information** (`CountrySelect`); stored in personal draft as `country` (code2, name, phoneCode, flag). |
| **Hub progress bar** | `n/4 completed` on `/get-started` — counts only **fully completed** checklist groups per server milestones, not Save & Exit and not hub button clicks. |

## Country of residence (persist first choice)

On **Verify account → Personal information**, the user selects **country of residence** before date of birth. Product rules:

1. **First selection** of a country writes to the personal draft **immediately** (on change), not only on Save & Exit or Continue.
2. **Save & Exit** with only residence filled (no DOB yet) must still persist `country` in `troott.getStarted.draft.personal` and restore it when the user returns.
3. **Restore order** on personal-information: draft `country` → then `user.country` from session/profile.
4. **Continue** still requires country + DOB before checkpoint APIs run ([feat-0005](../feat-0005/PRODUCT.md) UC-C23).
5. Applies to **minister and creator** (same form and draft key).

This is distinct from **home address** country (address draft `country` string / `PhoneInput` country) — residence is only the personal-information step.

## Hub progress bar (`n/4 completed`)

The Get Started hub shows **`{n}/4 completed`** and a fill bar. **n** must reflect **finished ladder groups**, not partial visits or Save & Exit.

| Hub item id | Group | Counts as **1** toward n only when |
|-------------|-------|-----------------------------------|
| `1` | Verify your account | Server milestone: **document verification complete** (minister `onboarding.step >= 2`; creator equivalent). Personal-only (step 1) does **not** count. |
| `2` | Complete your profile | **Ministry milestone complete** (minister `onboarding.step >= 4`; creator equivalent). Address-only does **not** count. |
| `3` | How to use troott (tour) | **Tour milestone complete** (`onboarding.step >= 5`). Opening tour page or Save & Exit on tour does **not** count. |
| `4` | Upload first sermon | **First sermon published** / onboarding gate complete (`onboarding.step >= 6` or `onboarding.status === 'completed'`). Save draft only does **not** count ([feat-0006](../feat-0006/PRODUCT.md) UC-F05). |

**Must not increase n:**

- **Save & Exit** from any inner step.
- Clicking hub accordion **“Verify account” / “Complete profile” / …** buttons that today call `handleStepComplete` in `GetStarted.tsx` (client-only `onboarding_progress` localStorage).
- Navigating into a sub-route without finishing that group’s server milestones.

**Source of truth:** `minister.onboarding.step` / `creator.onboarding` / `user.onboard` (feat-0005), exposed via session after refresh — not `localStorage.onboarding_progress` alone.

**Accordion “Completed” label:** Same rule as the bar — show **Completed** only when that group’s milestone row in the table above is satisfied, not when the user saved and exited mid-group.

## What Save persists (product)

| Step / route | Draft key | Fields (indicative) | Auto-save while typing |
|--------------|-----------|---------------------|-------------------------|
| Personal information | `troott.getStarted.draft.personal` | **Country of residence** (required persist on first pick), date of birth | **Yes** (form `useEffect`; country on first change) |
| Home address | `troott.getStarted.draft.address` | Address, postal, city, state, country, phone | **Yes** (form persist) |
| Ministry input | `troott.getStarted.draft.ministry` | Ministry name, site, description, HQ | **Yes** (form persist) |
| Verify account shell | — | No dedicated draft | — |
| Document type / capture / upload | — | **No** draft spec today | Partial via upload components only |
| Tour guide | — | No fields to save | — |

**Product default:** Save & Exit on document and tour steps still **exits** to the hub; optional toast “Progress on this step was not saved” when no draft layer exists.

## Exit destination (product)

| Condition | Exit navigates to |
|-----------|-------------------|
| Onboarding **incomplete** (minister or creator gate) | `/get-started` hub |
| Onboarding **complete** (edge: user deep-linked to inner step) | `/studio/{studioCode}` when code in storage; else `/get-started` |
| User not authenticated | `/login` (after auth guard; normal guard applies first) |
| Save failed (storage quota / private mode) | Stay on step + error toast; do not navigate |

**Product default:** never exit to bare `/dashboard` or legacy `/upload-sermon`. Use hub or studio per table above.

## Use case catalog

### A — Visibility and affordance

| ID | Actor | Goal | Trigger | Success |
|----|-------|------|---------|---------|
| **UC-SE01** | Both | See Save & Exit on inner steps | Opens any `InnerLayout` route | Control visible top-right |
| **UC-SE02** | Both | No Save & Exit on hub | Opens `/get-started` index | Hub only shows per-item buttons |
| **UC-SE03** | Both | No Save & Exit on studio upload | Opens upload wizard | Upload uses its own close/save rules (feat-0006) |
| **UC-SE04** | Both | Accessible label | Focus / screen reader | Button exposes “Save and exit” (not icon-only) |

### B — Save behavior (client drafts)

| ID | Actor | Goal | Trigger | Success |
|----|-------|------|---------|---------|
| **UC-SE10** | Both | Save personal progress | Save & Exit on personal-information | `writePersonalDraft` with country + DOB (country alone OK) |
| **UC-SE10a** | Both | Persist residence on first pick | Select country of residence on personal-information | Draft updated immediately; survives Save & Exit without DOB |
| **UC-SE10b** | Both | Restore residence after exit | Save & Exit with only country → return to personal-information | `CountrySelect` shows saved residence |
| **UC-SE11** | Both | Save address progress | Save & Exit on home-address | `writeAddressDraft` with current fields |
| **UC-SE12** | Both | Save ministry progress | Save & Exit on ministry-input | `writeMinistryDraft` with current fields |
| **UC-SE13** | Both | Save reflects latest typed values | Edits fields then Save & Exit | Draft matches visible form state (flush persist before exit) |
| **UC-SE14** | Both | No server write on Save & Exit | Save & Exit on any inner step | No `updateProfile` / `onboarding*Complete` from this action |
| **UC-SE15** | Both | Document step exit without draft | Save & Exit on document sub-routes | Exit allowed; user warned or silent (product: brief toast) |
| **UC-SE16** | Both | Tour step exit | Save & Exit on tour-guide | Exit allowed; no draft required |
| **UC-SE17** | Both | Verify shell only | Save & Exit on verify-account index | Exit to hub; no draft |

### C — Exit navigation

| ID | Actor | Goal | Trigger | Success |
|----|-------|------|---------|---------|
| **UC-SE20** | Both | Return to checklist | Save & Exit while onboarding incomplete | `navigate('/get-started')` |
| **UC-SE21** | Both | Exit when onboarding complete | Save & Exit on inner step but gate complete | Navigate to `studioHomePath(code)` if code known |
| **UC-SE22** | Both | Preserve session | Save & Exit | User remains logged in |
| **UC-SE23** | Both | Do not advance onboarding step | Save & Exit | Server `onboarding.step` unchanged vs before click |
| **UC-SE24** | Both | Cancel navigation on save failure | Storage error | Remain on current route |

### D — Resume after Save & Exit

| ID | Actor | Goal | Trigger | Success |
|----|-------|------|---------|---------|
| **UC-SE30** | Both | Resume personal draft | Re-open personal-information | Country + DOB pre-filled from draft |
| **UC-SE31** | Both | Resume address draft | Re-open home-address | Address fields pre-filled |
| **UC-SE32** | Both | Resume ministry draft | Re-open ministry-input | Ministry fields pre-filled |
| **UC-SE33** | Both | Draft overrides empty server | User saved draft; profile API empty | Show draft until **Continue** persists server |
| **UC-SE34** | Both | Draft cleared after successful Continue | Continue on personal step | Checkpoint success; draft may remain until explicit clear (implementation choice) |
| **UC-SE35** | Both | New session / cleared storage | Return after browser data cleared | Forms fall back to server user/minister/creator profile fields |

### E — Interaction with Continue and validation

| ID | Actor | Goal | Trigger | Success |
|----|-------|------|---------|---------|
| **UC-SE40** | Both | Continue still required for milestone | Save & Exit then later **Continue** | Milestone APIs run only on Continue |
| **UC-SE41** | Both | Save with invalid partial data | Save & Exit with empty required fields | Draft still saved (partial OK); Continue still validates later |
| **UC-SE42** | Both | Save & Exit vs Back | User clicks Back | Back does not save (unless product adds auto-save — default: Back unsaved except auto-save hooks) |
| **UC-SE43** | Both | Unsaved document images | Save & Exit mid document upload | Images not in draft spec; user must re-upload after return |

### F — Minister vs creator

| ID | Actor | Goal | Trigger | Success |
|----|-------|------|---------|---------|
| **UC-SE50** | Minister | Same UX as creator | Save & Exit any supported step | Identical control and exit rules |
| **UC-SE51** | Creator | Same UX as minister | Save & Exit on profile steps | Identical; drafts persona-agnostic (session keys not namespaced by persona — acceptable) |
| **UC-SE52** | Creator | Exit while incomplete | Creator gate not complete | Exit to hub (not studio) per UC-SE20 |

### G — Edge and negative cases

| ID | Actor | Goal | Trigger | Success |
|----|-------|------|---------|---------|
| **UC-SE60** | Both | Session expiry mid-step | Token expires before Save & Exit | Redirect login; drafts may still exist in sessionStorage until tab close |
| **UC-SE61** | Both | Multiple tabs | Edit in two tabs | Last write wins per storage key (document limitation) |
| **UC-SE62** | Both | Private / strict browser | sessionStorage blocked | Toast error; stay on page (UC-SE24) |
| **UC-SE63** | Both | Deep link to inner step | Bookmark `/get-started/home-address` | Save & Exit still exits to hub |
| **UC-SE64** | Both | Hub bar after Save & Exit only | Save & Exit mid verify (personal only) | Bar still **0/4** or prior server count; not 1/4 from exit alone |
| **UC-SE64a** | Both | Hub bar after partial verify | Personal Continue only (step 1) | Verify group **not** counted; bar unchanged for group 1 |
| **UC-SE64b** | Both | Hub bar after full verify | Document milestone (step ≥ 2) | Bar includes verify group (**+1**) |
| **UC-SE65** | Both | Double-click Save & Exit | Rapid clicks | Single navigation; no duplicate toasts |
| **UC-SE66** | Both | Save & Exit during Continue loading | Continue in flight | Save & Exit disabled or queued (product: disable while `busy`) |

### H — Hub progress bar and checklist UI

| ID | Actor | Goal | Trigger | Success |
|----|-------|------|---------|---------|
| **UC-SE70** | Both | Bar reflects server completion | Load `/get-started` with minister/creator in session | `n` = count of groups fully complete per milestone table |
| **UC-SE71** | Both | Save & Exit does not move bar | Save & Exit from any inner step | `n` unchanged vs before exit |
| **UC-SE72** | Both | Hub CTA does not fake progress | Click accordion inner button without finishing group | `n` unchanged; remove `handleStepComplete` on navigate-only clicks |
| **UC-SE73** | Both | Verify group needs document done | Personal Continue only | Item `1` not counted; bar not +1 for verify |
| **UC-SE74** | Both | Profile group needs ministry done | Address Continue only | Item `2` not counted until ministry milestone |
| **UC-SE75** | Both | Tour group needs tour milestone | Save & Exit on tour without Continue | Item `3` not counted |
| **UC-SE76** | Both | Upload group needs publish | Save draft on first sermon only | Item `4` not counted until publish completes onboarding |
| **UC-SE77** | Both | Accordion Completed label | Group fully complete on server | Button shows **Completed** and disabled |
| **UC-SE78** | Both | Accordion not Completed mid-group | Save & Exit or partial sub-steps | Button shows action label (e.g. **Verify account**), not **Completed** |
| **UC-SE79** | Both | Bar and labels agree | Any state | Same four rules drive both `{n}/4` and per-item **Completed** text |

## Behavior rules (product)

1. **Save & Exit** = **save client draft (if any)** + **navigate to exit target** + **optional success toast**.
2. **Never** call `runGetStartedCheckpoint` from Save & Exit.
3. **Never** mark hub accordion items complete or increment **`n/4`** from Save & Exit.
4. **Hub progress bar** derives from **server milestones** only (see Hub progress bar table); deprecate misleading `onboarding_progress` localStorage increments on navigate.
5. **Country of residence** persists on first pick in personal draft; Save & Exit must not clear it.
6. **InnerLayout only** — hub and studio surfaces use other patterns.
7. **Minister and creator** share identical behavior and copy.
8. Document and tour steps: exit without draft is allowed; prefer user-visible hint when nothing was saved.
9. After exit to hub, user may re-enter any ladder step; drafts restore on supported forms.

## Acceptance criteria

1. Save & Exit visible on every `InnerLayout` Get Started route; absent on hub and studio upload.
2. Personal, address, and ministry drafts persist on Save & Exit and restore on return.
3. **Country of residence** survives Save & Exit when DOB is still empty (UC-SE10a–SE10b).
4. Exit lands on `/get-started` when onboarding is incomplete.
5. Server onboarding step does not advance on Save & Exit alone.
6. **Continue** behavior unchanged (feat-0005).
7. Minister and creator receive the same UX and messaging.
8. Hub **`n/4`** and **Completed** labels match server milestones only; Save & Exit and hub-only clicks do not increase **n** (UC-SE70–SE79).

## Open questions (resolved — implemented)

1. **Clear draft after Continue (UC-SE34):** `clearDraftForCheckpointPath` runs after a successful checkpoint in `ProgressButtons.tsx`.
2. **Document verification drafts:** Phase 2 deferred; document/tour Save & Exit uses the no-local-draft toast (UC-SE15).
3. **Toast on success:** `Progress saved. You can continue later from Get Started.` (`get-started-save-exit.ts`).
4. **Disable Save & Exit while Continue busy (UC-SE66):** `GetStartedProgressProvider` shares `busy` with `SaveAndExit`.

## Related

- [feat-0005 PRODUCT](../feat-0005/PRODUCT.md) — Get Started ladder, `ProgressButtons`, checkpoints
- [feat-0005 TECH](../feat-0005/TECH.md) — `InnerLayout`, draft storage, checkpoint map
- [feat-0001 PRODUCT](../feat-0001/PRODUCT.md) — post-auth and session
- [feat-0006 PRODUCT](../feat-0006/PRODUCT.md) — upload wizard (separate save semantics)
- [`02 - get-started.md`](../../02%20-%20get-started.md)
