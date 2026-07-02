# feat-0015: Investigator dashboard

## Summary

The **investigator dashboard** is the future **Tier 3 partner** workspace for reviewing anonymous reports after submit. Today it is a **static placeholder** at `/{locale}/dashboard`: marketing-style copy, a bullet list of intended capabilities, and links to **partner email sign-in** (`/auth/email`) and **reporter access** (`/access`).

**Status: Stub.** No case queue API, no authentication gate on the route, no assignment workflow, and no Resend status notifications.

Complements [feat-0006](../feat-0006-email-otp-partner-auth/PRODUCT.md) (partner OTP), [feat-0009](../feat-0009-case-submit-lifecycle/PRODUCT.md) (submitted cases), [feat-0011](../feat-0011-data-layer/PRODUCT.md) (case statuses), [feat-0013](../feat-0013-transactional-email/PRODUCT.md) (notifications), and [feat-0014](../feat-0014-ui-kit/PRODUCT.md) (future table UI).

## Problem

Partners need a secure place to move cases from `SUBMITTED` through `UNDER_REVIEW`, `RESOLVED`, and `CLOSED`. The product roadmap references this surface, but engineers and stakeholders need an explicit **stub boundary** so work is not mistaken for production-ready investigator tools.

## Non-goals (current stub)

- Case list, filters, or detail views.
- Role-based access control on `/dashboard`.
- Editing reporter chat or extractions.
- Export / legal hold UI ([feat-0011](../feat-0011-data-layer/PRODUCT.md) `legalHold` field exists; no UI).
- Mobile app.
- Real-time collaboration.

## Actors

| Actor | Description |
|-------|-------------|
| **Partner investigator** | Organization staff with verified email (future Tier 3). |
| **Reporter** | Uses `/access` and `/chat`; not the dashboard audience. |
| **Platform admin** | Future: invite partners, assign orgs. |
| **System** | Will list cases by status from [feat-0011](../feat-0011-data-layer/PRODUCT.md). |

## Intended capabilities (product target)

| Capability | Description |
|------------|-------------|
| Case queue | Submitted reports awaiting review |
| Assignment | Assign investigator to case |
| Status updates | `UNDER_REVIEW` → `RESOLVED` / `CLOSED` |
| Notifications | Email via Resend when reporter email on file ([feat-0013](../feat-0013-transactional-email/PRODUCT.md)) |
| Audit | Who changed status and when |

## Use case catalog

### A. Current stub (implemented)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Open dashboard | Any user | Navigate to `/{locale}/dashboard` | Placeholder page renders |
| **UC-A02** | Read intended scope | On dashboard | Read heading and bullet list | Understands future features |
| **UC-A03** | Go to partner sign-in | Click Partner sign-in | Link to `/auth/email` | Email OTP flow ([feat-0006](../feat-0006-email-otp-partner-auth/PRODUCT.md)) |
| **UC-A04** | Go to reporter access | Click Reporter access | Link to `/access` | Reporter flow ([feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md)) |
| **UC-A05** | SEO metadata | Crawler / share | Layout `metadata` | Title "Dashboard \| Safe Voices" |

### B. Authentication gate (target)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Unauthenticated visit | No partner session | GET `/dashboard` | Redirect to `/auth/email` |
| **UC-B11** | Authenticated partner | Valid OTP session | GET `/dashboard` | Queue visible |
| **UC-B12** | Session expired | TTL elapsed | Navigate dashboard | Re-auth required |

### C. Case queue (target)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | List submitted cases | Partner auth | API returns cases `SUBMITTED`+ | Table with tracking code, date, risk |
| **UC-C21** | Filter by status | Queue loaded | Filter `UNDER_REVIEW` | Subset shown |
| **UC-C22** | Open case detail | Row click | Detail route | Messages + extraction read-only |
| **UC-C23** | No PII from reporter identity | Anonymous case | Detail view | No reporter account fields |

### D. Assignment and status (target)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D30** | Claim case | Case `SUBMITTED` | Assign self | Status → `UNDER_REVIEW` |
| **UC-D31** | Resolve case | Under review | Mark resolved | Status → `RESOLVED` |
| **UC-D32** | Close case | Resolved | Close | Status → `CLOSED` |
| **UC-D33** | Legal hold | Compliance flag | Set `legalHold` | Blocks purge ([feat-0017](../feat-0017-retention-cleanup-jobs/PRODUCT.md)) |

### E. Notifications (target)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-E40** | Status email to reporter | Email on file | Status change | Resend send ([feat-0013](../feat-0013-transactional-email/PRODUCT.md)) |
| **UC-E41** | No email | Anonymous only | Status change | No send |

### F. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-F50** | **Today:** dashboard is public — no secret case data exposed |
| **UC-F51** | Partner must not see case `secret` or session tokens |
| **UC-F52** | Concurrent assignment → optimistic lock or single owner |
| **UC-F53** | Reporter chat read-only for investigators |

## Behavior (product rules)

1. **Stub page is non-functional** — links are the only interactive product paths.

2. **Dashboard is English-first in layout metadata**; full i18n is target when feature ships ([feat-0001](../feat-0001-i18n/PRODUCT.md)).

3. **Partner sign-in** is separate from reporter case credentials (different trust domain).

4. **Investigators see extractions and messages**, not Argon2 secrets.

5. **Status transitions** must be auditable before production launch.

## Acceptance criteria

### Stub (today)

| # | Criterion |
|---|-----------|
| AC-S1 | `/{locale}/dashboard` renders placeholder without API calls. |
| AC-S2 | Links to `/auth/email` and `/access` work. |
| AC-S3 | Layout sets page metadata. |

### Target (future)

| # | Criterion |
|---|-----------|
| AC-T1 | Unauthenticated users cannot load case data. |
| AC-T2 | Queue lists cases from persistent store. |
| AC-T3 | Status updates persist on `Case.caseStatus`. |
| AC-T4 | Optional email notification on status change. |

## What's needed to make it work

| Requirement | Phase | Notes |
|-------------|-------|-------|
| Partner session model | Target | After [feat-0006](../feat-0006-email-otp-partner-auth/PRODUCT.md) backend |
| `GET /api/partner/cases` (or tRPC) | Target | New schemas in [feat-0012](../feat-0012-api-contracts/PRODUCT.md) |
| `CaseStore` status update methods | Target | Extend [feat-0011](../feat-0011-data-layer/PRODUCT.md) |
| Route middleware / layout auth | Target | Protect `dashboard/layout.tsx` |
| Table, filters, detail UI | Target | `@safevoices/ui` Table, Sheet ([feat-0014](../feat-0014-ui-kit/PRODUCT.md)) |
| Resend integration | Target | [feat-0013](../feat-0013-transactional-email/PRODUCT.md) |
| i18n strings | Target | `messages/en.json`, `ar.json` |
| Audit log table | Target | New Prisma model or external log |
| Security review | Target | Partner role, case access boundaries |

**To view stub today:** `pnpm dev:web` → `http://localhost:3000/en/dashboard` (no env vars required).

## Open questions

1. Multi-tenant orgs (one queue per employer)? **Default:** single org pilot.

2. Investigator can message reporter? **Default:** no chat back-channel in v1.

3. Dashboard on subdomain? **Default:** same app `/dashboard`.

## Related

- [feat-0006 PRODUCT](../feat-0006-email-otp-partner-auth/PRODUCT.md)
- [feat-0009 PRODUCT](../feat-0009-case-submit-lifecycle/PRODUCT.md)
- [feat-0011 PRODUCT](../feat-0011-data-layer/PRODUCT.md)
- [feat-0013 PRODUCT](../feat-0013-transactional-email/PRODUCT.md)
- [feat-0014 PRODUCT](../feat-0014-ui-kit/PRODUCT.md)
