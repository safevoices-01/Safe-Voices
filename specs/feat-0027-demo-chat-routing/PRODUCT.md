# feat-0027: Demo and reporting chat routes

## Summary

**Demo** (general AI guidance) and **reporting** (case-scoped intake) are split onto distinct URLs:

| Mode | URL | API |
|------|-----|-----|
| Demo | `/{locale}/demo` | `POST /api/chat` |
| Reporting | `/{locale}/chat?caseId=SV-…` | `POST /api/cases/:caseId/chat` |

Bare `/{locale}/chat` (no `caseId`) redirects to `/{locale}/access` so `/chat` is reserved for verified reporters only. Marketing and documentation CTAs for the public assistant point to `/demo`.

Supersedes the combined-route model documented in [feat-0007](../feat-0007-general-ai-chat/PRODUCT.md) and [feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md) (URL column only).

## Problem

A single `/chat` path with an optional `caseId` query param blurs demo education and secure reporting. Visitors bookmark `/chat` expecting one experience; reporters need a dedicated intake URL. Product and support need unambiguous links: **demo** vs **real app**.

## Non-goals

- Changing API paths (`/api/chat` and `/api/cases/:caseId/chat` stay as-is).
- Removing `caseId` from reporting URLs (still required for deep links and session binding).
- Auto-creating a case when opening `/chat` without credentials.

## Actors

| Actor | Route |
|-------|-------|
| **Visitor** (education) | `/demo` |
| **Reporter** (intake) | `/access` → verify → `/chat?caseId=…` |
| **Platform** | Middleware locale prefix + optional session gate on `/chat` |

## Use case catalog

### A. Demo entry

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Open demo from header | — | Click "Open chat" on marketing | Lands on `/{locale}/demo` |
| **UC-A02** | Demo banner | On `/demo` | Page load | Banner links to `/access` for secure reporting |
| **UC-A03** | Demo chat | On `/demo` | Send message | Streams via `POST /api/chat`; no persistence |

### B. Reporting entry

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Open reporting chat | Valid session + `caseId` | Nav to `/chat?caseId=…` | Reporting UI, history, submit |
| **UC-B11** | Bare `/chat` | No `caseId` | Visit `/chat` | Redirect to `/access` |
| **UC-B12** | Deep link without session | `SAFEVOICES_ENFORCE_CHAT_SESSION=true` | `/chat?caseId=…` no cookie | Redirect to `/access?return=…` (feat-0002) |
| **UC-B13** | After verify | feat-0005 | Verify credentials | Navigate to `/chat?caseId=…` |

### C. Navigation and SEO

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Sitemap | — | Crawl | `/demo` and `/chat` listed |
| **UC-C21** | Localeless `/demo` | — | Visit `/demo` | Redirect to `/{locale}/demo` |

## Behavior rules

1. **Demo never requires** `caseId` or `sv_case_session`.
2. **Reporting always requires** `caseId` in the URL; session enforced per feat-0002 when env flag set.
3. **Marketing CTAs** for the public AI assistant use `/demo`, not `/chat`.
4. **Hero "Start secure conversation"** continues to use `/access`.
5. **Shared UI shell** (sidebar, composer, avatar) may be reused; copy and API transport differ by route.

## Acceptance criteria

- [ ] `GET /en/demo` loads demo chat with educational welcome and demo banner.
- [ ] `GET /en/chat` redirects to `/en/access`.
- [ ] `GET /en/chat?caseId=SV-…` with valid session loads reporting chat.
- [ ] Header/footer/documentation "Open chat" links target `/demo`.
- [ ] After case verify, user lands on `/chat?caseId=…`.
- [ ] E2E: reporter flow still reaches `/chat?caseId=…` after access.

## Status

**Complete** after feat-0027 implementation.
