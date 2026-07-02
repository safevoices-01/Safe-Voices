# feat-0009: Case submit and lifecycle

## Summary

After completing an anonymous report conversation, the **reporter submits** the case for review. Submit transitions the case from **OPEN** to **SUBMITTED**, records `submittedAt`, and makes the reporting chat **read-only** (no new messages, attachments, or voice input). The reporter sees confirmation with their tracking code reminder.

The Prisma schema defines a full **`CaseStatus` lifecycle** (`OPEN`, `SUBMITTED`, `UNDER_REVIEW`, `RESOLVED`, `CLOSED`) plus optional fields (`incidentCategory`, `riskLevel`, `legalHold`). **Only the submit transition is implemented** today; investigator-driven status changes and notifications are future work ([feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md), [feat-0013](../feat-0013-transactional-email/PRODUCT.md)).

Complements [feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md) (intake chat), [feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md) (session), and [feat-0011](../feat-0011-data-layer/PRODUCT.md) (schema).

## Problem

Reporters need a clear, irreversible (from their perspective) moment when intake is complete so investigators can queue the case. The product must define submit UX, API contract, post-submit restrictions, and how enum states beyond `SUBMITTED` will behave — without implying investigator tools already exist.

## Non-goals

- Investigator status updates (`UNDER_REVIEW` → `RESOLVED`).
- Email confirmation on submit (`sendCaseReceivedEmail` exists but is **not** called from submit route).
- Re-opening a submitted case from the reporter UI.
- Editing extraction after submit.
- Legal hold UI.
- Purge / retention ([feat-0017](../feat-0017-retention-cleanup-jobs/PRODUCT.md)).

## Actors

| Actor | Description |
|-------|-------------|
| **Reporter** | Clicks "Submit report" when intake feels complete. |
| **Platform** | Sets `caseStatus`, `submittedAt`; enforces read-only chat. |
| **Investigator** | (Future) Moves case through review states. |

## Case status model (product)

| Status | Reporter-visible meaning today | Implemented |
|--------|-------------------------------|-------------|
| `OPEN` | Draft intake; chat active | Yes (default on create) |
| `SUBMITTED` | Sent for review; chat read-only | Yes (on submit) |
| `UNDER_REVIEW` | Investigator working | **No** UI/API |
| `RESOLVED` | Outcome recorded | **No** |
| `CLOSED` | Terminal | **No** |

Submit sets **`caseStatus = SUBMITTED`** and **`submittedAt = now()`** in the case store.

## Use case catalog

### A. Submit flow

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Open submit CTA | Reporting chat; session ok; not submitted | View `ReportingChatExtras` | "Submit report" button visible |
| **UC-A02** | Submit success | Valid session + OPEN case | POST submit | Toast success; confirmation panel |
| **UC-A03** | Submit idempotent guard | Already submitted | POST submit | 409 error |
| **UC-A04** | Submit without session | No cookie | POST submit | 401 |
| **UC-A05** | Submit wrong case | Cookie case A, URL case B | POST submit | 401 |
| **UC-A06** | Submit busy state | Request in flight | Click submit | Button shows submitting; disabled |

### B. Post-submit reporter experience

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Read-only chat | Submitted | Type / attach / voice | Controls disabled |
| **UC-B11** | Chat API blocked | Submitted | POST case chat | 409 `CASE_SUBMITTED_READONLY` |
| **UC-B12** | Session still valid | Submitted | GET session | `submitted: true`, `caseStatus: SUBMITTED` |
| **UC-B13** | View history | Submitted | GET messages | Past messages readable |
| **UC-B14** | Confirmation copy | submitDone | UI panel | Reminder to save tracking code |
| **UC-B15** | Submit button hidden | submitDone | — | Replaced by submitted banner |

### C. Lifecycle (target — investigators)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Move to UNDER_REVIEW | Partner auth; feat-0015 | Investigator action | Status updated |
| **UC-C21** | Resolve case | Investigation complete | Status → RESOLVED | Reporter notification (email) |
| **UC-C22** | Close case | Policy met | Status → CLOSED | Eligible for retention job |
| **UC-C23** | Legal hold | Compliance flag | `legalHold=true` | Excluded from purge |

### D. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-D30** | Case not found on submit → 404 |
| **UC-D31** | Submit with empty transcript | Allowed (product may warn later) |
| **UC-D32** | Double-click submit | Second request 409 or no-op |
| **UC-D33** | Hono API | **No submit route** ([feat-0016](../feat-0016-hono-standalone-api/PRODUCT.md)) |

## Behavior (product rules)

1. **Reporter-initiated submit only** on web today; no auto-submit when extraction complete.

2. **Irreversible for reporters:** No "continue editing" after submit in current UI.

3. **Session persists after submit** so reporter can re-read transcript and confirmation (until expiry).

4. **Status + timestamp:** Both `caseStatus` and `submittedAt` must be set together on success.

5. **Chat guard is server-side:** UI disable is not sufficient; POST chat returns 409 after submit.

6. **Investigator states** require partner auth and dashboard — not part of this feat's implementation.

7. **Email (target):** Optional `sendCaseReceivedEmail` when reporter provided email elsewhere — not in anonymous MVP path.

## What's needed to work

| Requirement | Purpose |
|-------------|---------|
| Active `sv_case_session` | Auth on submit |
| Case in OPEN (not yet submitted) | Successful POST |
| `GET /api/cases/session` | Client learns `submitted` on load |

## Status

| Area | Status |
|------|--------|
| `POST /api/cases/[caseId]/submit` | **Complete** (Next) |
| Store `markCaseSubmitted` | **Complete** |
| Client submit + read-only UI | **Complete** |
| Chat 409 after submit | **Complete** |
| `UNDER_REVIEW` / `RESOLVED` / `CLOSED` transitions | **Not implemented** |
| Submit confirmation email | **Not wired** |
| Hono submit route | **Missing** |
| Investigator lifecycle APIs | **Missing** (feat-0015) |

## Open questions

1. Warn if extraction incomplete before submit? **Default:** soft warning later; submit always allowed.

2. Allow submit from `/access` without visiting chat? **Default:** no; chat page is primary.

3. Grace period to undo submit? **Default:** no for reporters.

## Related

- [feat-0008 PRODUCT](../feat-0008-reporting-chat-ai/PRODUCT.md) — submit CTA in chat
- [feat-0011 PRODUCT](../feat-0011-data-layer/PRODUCT.md) — `CaseStatus` enum
- [feat-0013 PRODUCT](../feat-0013-transactional-email/PRODUCT.md) — receipt email
- [feat-0015 PRODUCT](../feat-0015-investigator-dashboard/PRODUCT.md) — review queue
- [feat-0017 PRODUCT](../feat-0017-retention-cleanup-jobs/PRODUCT.md) — purge by status
