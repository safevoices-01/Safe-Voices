# feat-0003: Marketing landing page

## Summary

The **marketing landing** at `/{locale}` (`apps/web/app/[locale]/(marketing)/page.tsx`) is the public entry for Safe Voices: hero, product narrative, feature grid, how-it-works steps, trust stats, and multiple **CTAs to `/access`** (anonymous case access, [feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md)). Shared chrome from **SiteHeader** (logo, language switcher, documentation, open chat) and **SiteFooter** wraps all marketing routes.

**Status:** Complete (structural); **partial i18n** — hero/section CTAs use `marketing.*` keys; most body copy is English inline.

Depends on [feat-0001](../feat-0001-i18n/PRODUCT.md) (locale, header switcher) and [feat-0002](../feat-0002-middleware-routing/PRODUCT.md) (`/` → `/{locale}`).

## Problem

Prospective reporters and buyers need a credible first impression: what Safe Voices does, how anonymous intake works, and a clear path to start a secure conversation without signing in. A bare chat link or auth wall would confuse anonymous-first positioning.

## Non-goals

- CMS or markdown-driven marketing content.
- A/B testing or personalization.
- Pricing, signup, or tenant provisioning flows.
- Full Arabic translation of all marketing sections ([feat-0001](../feat-0001-i18n/PRODUCT.md) gap).
- Investigator or admin marketing ([feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md)).
- Video, testimonials, or customer logos (no assets provided).

## Actors

| Actor | Description |
|-------|-------------|
| **Visitor** | Lands on home; may switch language or navigate to docs/chat/access. |
| **Prospective reporter** | Clicks primary CTA → anonymous access funnel. |
| **Compliance buyer** | Reads features and documentation links. |
| **Platform** | Serves static marketing layout with localized metadata from parent locale layout. |

## Use case catalog

### A. Entry and navigation

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Land on home | User opens `/{locale}` | Marketing layout renders | Header + page + footer |
| **UC-A02** | Root redirect | User opens `/` | Middleware → `/{locale}` ([feat-0002](../feat-0002-middleware-routing/PRODUCT.md)) | Localized home |
| **UC-A03** | Logo home | On any marketing page | Click header logo | `/{locale}` |
| **UC-A04** | Open documentation | From header or hero secondary | Link to `/documentation` | Documentation hub ([feat-0004](../feat-0004-documentation-hub/PRODUCT.md)) |
| **UC-A05** | Open chat from header | Any marketing page | Header "Open chat" → `/chat` | General/demo chat ([feat-0007](../feat-0007-general-ai-chat/PRODUCT.md)) |
| **UC-A06** | Switch language | Header `LanguageSwitcher` | Replace locale on current path | Same page in other locale |

### B. Hero and primary conversion

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Primary hero CTA | On hero | "Start secure conversation" (`marketing.heroCta`) → `/access` | Access flow ([feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md)) |
| **UC-B11** | Hero secondary | On hero | "Request a demo" / docs link (`marketing.heroSecondary`) | Documentation or external intent (links to `/documentation`) |
| **UC-B12** | Announcement pill | On hero | Link to `/documentation#platform-features` | In-page doc anchor |
| **UC-B13** | Hero image | Page load | `/hero.png` priority load | Product screenshot visible |

### C. Page sections and secondary CTAs

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Value proposition block | Scroll | Second hero-style section with stats card | Trust metrics visible |
| **UC-C21** | Feature grid | Scroll | Six feature cards (anonymous, messaging, tracking, RBAC, analytics, enterprise) | Educational; no deep links per card |
| **UC-C22** | How it works | Scroll | Three steps: Submit, Track, Get guidance | Orient reporter journey |
| **UC-C23** | Primary band CTA | Scroll | Dark band "Open AI chat" → `/access` | Access funnel |
| **UC-C24** | Closing CTA card | Bottom | "Open AI chat" + "Browse documentation" | `/access` and `/documentation` |

### D. Footer

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D30** | Product links | Footer | AI chat, Documentation | Localeless paths (middleware adds locale) |
| **UC-D31** | Trust link | Footer | Security and privacy → doc anchor | `documentation#security-privacy` |

### E. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-E40** | Arabic locale: RTL layout; English body copy still displays until translated |
| **UC-E41** | Broken hero image → alt text "Safe Voices chat and guidance interface" |
| **UC-E42** | Mobile: CTAs stack vertically; header wraps |

## Behavior rules

1. **Layout:** `(marketing)/layout.tsx` provides `SiteHeader`, flex main, `SiteFooter`.

2. **Links:** Prefer `Link` from `i18n/navigation` for locale-aware routes (`/access`, `/documentation`, `/chat`).

3. **Primary conversion path:** Hero and band CTAs target **`/access`**, not `/chat`, for anonymous reporting ([feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md)).

4. **Header chat:** Opens `/chat` for general guidance ([feat-0007](../feat-0007-general-ai-chat/PRODUCT.md)); copy distinguishes demo vs secure path in chat page.

5. **i18n:** Localized strings for CTAs and header; long-form copy English until moved to message catalogs.

6. **Metadata:** Site title/description from `metadata.*` in locale layout ([feat-0018](../feat-0018-seo-pwa-metadata/PRODUCT.md)).

## What's needed to make it work

| Requirement | Who | Notes |
|-------------|-----|-------|
| Marketing route group under `[locale]/(marketing)` | Engineering | `page.tsx` + `layout.tsx` |
| Brand assets in `apps/web/public/` | Design | `@safevoices-logo.png`, `hero.png`, `og.png` |
| `SiteHeader` + `SiteFooter` components | Engineering | Header uses i18n `Link` + `LanguageSwitcher` |
| `marketing` namespace in `en.json` / `ar.json` | Translation | heroCta, heroSecondary, openAiChat, readDocumentation |
| Middleware redirect from `/` | Engineering | [feat-0002](../feat-0002-middleware-routing/PRODUCT.md) |
| Access page live at `/access` | Engineering | [feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md) |
| Optional: translate inline section copy | Translation | Move strings from `page.tsx` to JSON |

## Implementation status

| Area | Status |
|------|--------|
| Landing page sections and layout | Complete |
| CTAs to `/access` | Complete |
| Site header/footer chrome | Complete |
| Hero image and OG metadata | Complete |
| Full page i18n | Partial (CTAs + chrome only) |
| Footer locale-aware links | Partial (uses `next/link`) |

## Acceptance criteria

1. `GET /en` renders marketing page with header, footer, and hero.
2. Primary hero button navigates to `/en/access` (or current locale).
3. At least four distinct CTAs on the page point to `/access`.
4. Header documentation link reaches documentation hub.
5. Language switcher preserves path on home (`/en` ↔ `/ar`).
6. `marketing.heroCta` and related keys render in Arabic on `/ar`.
7. Page passes typecheck and builds under `pnpm --filter @safevoices/web build`.

## Related

- [feat-0001 PRODUCT](../feat-0001-i18n/PRODUCT.md) — locale and switcher
- [feat-0002 PRODUCT](../feat-0002-middleware-routing/PRODUCT.md) — `/` redirect
- [feat-0004 PRODUCT](../feat-0004-documentation-hub/PRODUCT.md) — documentation destination
- [feat-0005 PRODUCT](../feat-0005-anonymous-case-access/PRODUCT.md) — `/access` funnel
- [feat-0007 PRODUCT](../feat-0007-general-ai-chat/PRODUCT.md) — header chat link
- [feat-0018 PRODUCT](../feat-0018-seo-pwa-metadata/PRODUCT.md) — metadata
- `apps/web/app/[locale]/(marketing)/`
