# feat-0002: Middleware and locale routing

## Summary

**Edge middleware** (`apps/web/middleware.ts`) combines **next-intl** locale negotiation with **Safe Voices access policy**: localeless paths redirect to `/{locale}/…`, legacy `/auth` redirects to `/access` when Access V2 is enabled, and optional **chat session enforcement** sends unauthenticated reporters to `/access` with a `return` query when opening `/chat?caseId=…` without the `sv_case_session` cookie.

**Status:** Complete.

Depends on [feat-0001](../feat-0001-i18n/PRODUCT.md) (locale list and default). Enables [feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md) (session cookie) and [feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md) (chat entry).

## Problem

Without middleware, users bookmark `/chat` or `/access` without a locale prefix, breaking next-intl static routing and SEO alternates. Legacy `/auth` URLs would split the anonymous access funnel. Deep-linking to reporting chat without a verified session would expose the chat UI without case binding unless optionally gated.

## Non-goals

- Authentication middleware for partner email OTP ([feat-0006](../feat-0006-email-otp-partner-auth/PRODUCT.md)).
- Investigator dashboard protection ([feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md)).
- Geo-based locale detection (cookie + default only).
- Rate limiting at edge (verify lockout is API/store layer, [feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md)).
- Hono standalone API routing ([feat-0016](../feat-0016-hono-standalone-api/PRODUCT.md)).

## Actors

| Actor | Description |
|-------|-------------|
| **Reporter** | Hits localeless or legacy URLs; may be redirected before page render. |
| **Returning reporter** | May have `NEXT_LOCALE` and/or `sv_case_session` cookies. |
| **Operator** | Sets env flags for access V2 and chat session enforcement. |
| **Platform** | Runs middleware matcher on listed paths only. |

## Use case catalog

### A. Locale prefix normalization

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Visit `/` | Any | Read `NEXT_LOCALE` cookie or default `en` | Redirect to `/en` or `/ar` |
| **UC-A02** | Visit localeless `/access` | Any | Same cookie/default logic | Redirect to `/{locale}/access` |
| **UC-A03** | Visit localeless `/chat` | Any | Redirect with locale prefix | `/{locale}/chat` |
| **UC-A04** | Visit localeless `/documentation` | Any | Redirect with locale prefix | `/{locale}/documentation` |
| **UC-A05** | Visit localeless `/dashboard` | Any | Redirect with locale prefix | `/{locale}/dashboard` (stub) |
| **UC-A06** | Visit `/en/…` or `/ar/…` | Valid locale | Delegate to `createMiddleware(routing)` | next-intl handles alternates, cookie |
| **UC-A07** | Invalid cookie locale | Cookie not in `['en','ar']` | Fall back to `routing.defaultLocale` | Safe redirect target |

### B. Legacy auth redirect (Access V2)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Open `/{locale}/auth` with V2 on | `SAFEVOICES_ACCESS_V2 !== 'false'` | 302 to `/{locale}/access` | Anonymous funnel entry |
| **UC-B11** | Open `/{locale}/auth` with V2 off | `SAFEVOICES_ACCESS_V2=false` | intl middleware only | Legacy auth page ([feat-0006](../feat-0006-email-otp-partner-auth/PRODUCT.md)) |
| **UC-B12** | Programmatic path helper | App code calls `getAccessPath()` | Returns `/access` or `/auth` per env | Consistent links in UI |

### C. Chat session enforcement

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Deep link to chat with case, no session | `SAFEVOICES_ENFORCE_CHAT_SESSION=true`, `caseId` query present, no `sv_case_session` cookie | Redirect to `/{locale}/access?return=/{locale}/chat?caseId=…` | User must verify before chat |
| **UC-C21** | Deep link with valid session cookie | Cookie present | intl response passes through | Chat loads ([feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md)) |
| **UC-C22** | Open `/{locale}/chat` without `caseId` | Enforcement on | No session gate in middleware | Demo/general chat allowed |
| **UC-C23** | Enforcement off | `SAFEVOICES_ENFORCE_CHAT_SESSION` unset or not `true` | No redirect for missing cookie | Chat page handles session UX client-side |

### D. Matcher scope

| ID | Use case | Expected behavior |
|----|----------|-------------------|
| **UC-D30** | Static assets `/_next/*` | Not matched; no middleware |
| **UC-D31** | API routes `/api/*` | Not matched |
| **UC-D32** | Listed paths in `config.matcher` | Middleware runs |

### E. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-E40** | `return` query on access page should be honored by access flow (client) after verify |
| **UC-E41** | Locale preserved on auth→access redirect |
| **UC-E42** | Double locale prefix avoided — matcher is `/(en|ar)/:path*` and explicit localeless set |

## Behavior rules

1. **Localeless set:** `/`, `/access`, `/auth`, `/chat`, `/dashboard`, `/documentation` always redirect to prefixed URL.

2. **Cookie precedence:** `NEXT_LOCALE` (next-intl) when valid; else `en`.

3. **Access V2 default:** Enabled unless `SAFEVOICES_ACCESS_V2=false` (`lib/access-config.ts`).

4. **Chat enforcement default:** Off unless `SAFEVOICES_ENFORCE_CHAT_SESSION=true`.

5. **Session cookie name:** `sv_case_session` (constant shared with case access lib).

6. **Auth redirect:** Only path `/auth` (after locale strip), not `/auth/email`.

7. **Order of operations:** Localeless redirect first; then intl middleware; then auth redirect; then chat enforcement; return intl response.

## What's needed to make it work

| Requirement | Who | Notes |
|-------------|-----|-------|
| `middleware.ts` at `apps/web` root | Engineering | Exported `config.matcher` must include all localeless entry paths |
| next-intl `routing` aligned with `[locale]` segment | Engineering | [feat-0001](../feat-0001-i18n/PRODUCT.md) |
| `SAFEVOICES_ACCESS_V2` set intentionally in prod | Ops | Default on; set `false` only for legacy auth testing |
| `SAFEVOICES_ENFORCE_CHAT_SESSION=true` in prod when policy requires | Ops | Optional hard gate before reporting chat |
| Access page handles `return` query after verify | Engineering | [feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md) |
| Case verify sets `sv_case_session` cookie | Engineering | `POST /api/cases/verify` |

## Implementation status

| Area | Status |
|------|--------|
| Localeless → `/{locale}/…` redirect | Complete |
| next-intl middleware integration | Complete |
| `/auth` → `/access` when Access V2 | Complete |
| Chat session enforcement (opt-in) | Complete |
| `getAccessPath()` helper | Complete |
| `return` query consumption on access page | Verify in feat-0005 client (if not wired, gap) |

## Acceptance criteria

1. `GET /` → `302` to `/en` (or cookie locale).
2. `GET /access` → `302` to `/en/access` (or cookie locale).
3. `GET /en/auth` with default env → `302` to `/en/access`.
4. `GET /en/auth` with `SAFEVOICES_ACCESS_V2=false` → auth page renders.
5. With `SAFEVOICES_ENFORCE_CHAT_SESSION=true`, `GET /en/chat?caseId=SV-XXXXX-XXXX` without cookie → redirect to access with `return` param.
6. `GET /en/chat?caseId=…` with valid `sv_case_session` → no middleware block.
7. API routes and `_next` static files bypass middleware.

## Related

- [feat-0001 PRODUCT](../feat-0001-i18n/PRODUCT.md) — locales and routing config
- [feat-0005 PRODUCT](../feat-0005-anonymous-case-access/PRODUCT.md) — session cookie and verify
- [feat-0008 PRODUCT](../feat-0008-reporting-chat-ai/PRODUCT.md) — chat entry
- [feat-0006 PRODUCT](../feat-0006-email-otp-partner-auth/PRODUCT.md) — `/auth/email` legacy path
- `apps/web/middleware.ts`
- `apps/web/lib/access-config.ts`
