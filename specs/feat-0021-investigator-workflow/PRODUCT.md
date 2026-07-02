# feat-0021: Investigator workflow and case management

## Summary

**Investigator workflow** is the partner-facing capability to review **submitted** anonymous reports, transition case status (`SUBMITTED` → `UNDER_REVIEW` → `RESOLVED` → `CLOSED`), assign investigators, add internal notes, and notify reporters when contact email exists. It extends the dashboard stub ([feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md)) and submit lifecycle ([feat-0009](../feat-0009-case-submit-lifecycle/PRODUCT.md)) into a full Tier 3 product surface.

**Status:** Not implemented — target spec for post-reporter-MVP.

Depends on: [feat-0022](../feat-0022-partner-auth-backend/PRODUCT.md) (partner session), [feat-0011](../feat-0011-data-layer/PRODUCT.md) (schema statuses), [feat-0013](../feat-0013-transactional-email/PRODUCT.md) (status emails).

## Problem

After a reporter submits ([feat-0009](../feat-0009-case-submit-lifecycle/PRODUCT.md)), cases sit in `SUBMITTED` with no in-app path for compliance or HR investigators to triage, document decisions, or close the loop. Marketing and documentation promise case management; only a placeholder dashboard exists.

## Non-goals

- Reporter identity discovery or deanonymization without voluntary contact.
- Full legal case management (e-discovery, court holds UI) in v1.
- Real-time collaboration (multiplayer cursors, Slack).
- Automatic AI adjudication or disciplinary recommendations.
- Mobile investigator app (web responsive only for v1).

## Actors

| Actor | Description |
|-------|-------------|
| **Partner investigator** | Authenticated org user; reviews assigned cases. |
| **Partner admin** | Assigns cases, manages org users (future). |
| **Reporter** | May receive status email if they opted in (future). |
| **Platform** | Enforces RBAC, audit log, status transitions. |

## Case status model (target)

| Status | Reporter-visible | Investigator actions |
|--------|------------------|-------------------|
| `OPEN` | In progress | N/A (reporter only) |
| `SUBMITTED` | Submitted, read-only chat | Open for review |
| `UNDER_REVIEW` | Under review | Request info, assign, note |
| `RESOLVED` | Resolved | Close with outcome category |
| `CLOSED` | Closed | Archive; retention clock starts |

Schema enum already exists in [feat-0011](../feat-0011-data-layer/PRODUCT.md); transitions are not implemented.

## Use case catalog

### A. Access and auth

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Partner sign-in | Valid org account | Email OTP ([feat-0022](../feat-0022-partner-auth-backend/PRODUCT.md)) | Partner session cookie |
| **UC-A02** | Open dashboard | Authenticated partner | `/{locale}/dashboard` | Case queue loads |
| **UC-A03** | Unauthenticated dashboard | No partner session | Visit `/dashboard` | Redirect to `/auth/email` |
| **UC-A04** | Reporter blocked | Reporter session only | Visit `/dashboard` | 403 or redirect to access |

### B. Case queue

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | List submitted cases | Partner role | GET case list API | Paginated table: tracking code, category, risk, submittedAt |
| **UC-B11** | Filter by status | Queue view | Filter `SUBMITTED` / `UNDER_REVIEW` | Filtered list |
| **UC-B12** | Search by tracking code | Known `SV-…` | Search | Single case or empty |
| **UC-B13** | Sort by date / risk | Queue view | Sort | Ordered list |
| **UC-B14** | Empty queue | No cases | Load dashboard | Empty state copy |

### C. Case detail and review

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Open case detail | Case in org scope | Click row | Transcript, extraction, attachments, crisis flags |
| **UC-C21** | Read message history | Case has turns | Detail view | User/assistant messages (decrypted at rest policy TBD) |
| **UC-C22** | View extraction | `CaseExtraction` exists | Detail panel | incidentDescription, location, etc. |
| **UC-C23** | View attachments | `CaseAttachment` rows | Detail | Links to signed download URLs |
| **UC-C24** | Crisis events | `CrisisEvent` rows | Detail banner | Trigger type + timestamp |
| **UC-C25** | Internal note | Investigator | POST note (not visible to reporter) | Audit entry |

### D. Status transitions

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D30** | Start review | `SUBMITTED` | Action → `UNDER_REVIEW` | Status updated; audit log |
| **UC-D31** | Resolve case | `UNDER_REVIEW` | Action → `RESOLVED` + outcome | Status updated |
| **UC-D32** | Close case | `RESOLVED` | Action → `CLOSED` | Retention eligibility ([feat-0017](../feat-0017-retention-cleanup-jobs/PRODUCT.md)) |
| **UC-D33** | Invalid transition | e.g. `OPEN` | Attempt review | 409 with error code |
| **UC-D34** | Notify reporter | Optional email on file | Send status email ([feat-0013](../feat-0013-transactional-email/PRODUCT.md)) | Email queued |

### E. Assignment (v1.1)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-E40** | Assign investigator | Admin role | Select assignee | `assignedTo` on case (schema extension) |
| **UC-E41** | Reassign | Admin | Change assignee | Audit log |

## Behavior (product rules)

1. Investigators **never** see reporter plaintext secret; access is org-scoped case list only.
2. Tracking codes in UI use `dir="ltr"` / `ltr-embed` ([feat-0001](../feat-0001-i18n/PRODUCT.md)).
3. Status transitions are **append-only audit** — no silent deletes.
4. `legalHold` on case blocks automated purge ([feat-0017](../feat-0017-retention-cleanup-jobs/PRODUCT.md)).
5. Partner UI strings use same i18n namespaces as web ([feat-0001](../feat-0001-i18n/PRODUCT.md)).

## What's needed to make it work

| Layer | Requirement |
|-------|-------------|
| Auth | [feat-0022](../feat-0022-partner-auth-backend/PRODUCT.md) partner session + middleware gate on `/dashboard` |
| Data | Prisma models: `PartnerUser`, `CaseAssignment`, `CaseAuditEvent`, `InternalNote` (new migrations) |
| API | `GET /api/partner/cases`, `GET /api/partner/cases/:id`, `PATCH /api/partner/cases/:id/status` |
| UI | Replace `dashboard/page.tsx` stub with queue + detail routes |
| Email | `sendCaseStatusUpdateEmail` in [feat-0013](../feat-0013-transactional-email/PRODUCT.md) |
| RBAC | Org tenancy key on `Case` or join table |

## Implementation status

| Item | Status |
|------|--------|
| Dashboard placeholder | Done ([feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md)) |
| Status enum in schema | Done |
| Partner APIs | Not started |
| Queue UI | Not started |
| Audit log | Not started |

## Acceptance criteria (target)

1. Partner with valid session sees only their org's `SUBMITTED`+ cases.
2. Investigator can move `SUBMITTED` → `UNDER_REVIEW` → `RESOLVED` → `CLOSED` with audit trail.
3. Case detail shows messages and extraction from [feat-0011](../feat-0011-data-layer/PRODUCT.md).
4. Unauthenticated users cannot load case content.
5. Reporter chat remains read-only after submit; investigators do not chat as reporter.

## Open questions

1. Single global org for MVP or multi-tenant from day one? **Default:** single org, `orgId` column for future.
2. Can investigators message reporter in-app? **Default:** v2; v1 email-only if contact provided.

## Related

- [feat-0015 PRODUCT](../feat-0015-investigator-dashboard/PRODUCT.md) — current stub
- [feat-0009 PRODUCT](../feat-0009-case-submit-lifecycle/PRODUCT.md) — submit entry state
- [feat-0022 PRODUCT](../feat-0022-partner-auth-backend/PRODUCT.md) — prerequisite auth
- [feat-0024 PRODUCT](../feat-0024-security-operations/PRODUCT.md) — RBAC and audit policy
