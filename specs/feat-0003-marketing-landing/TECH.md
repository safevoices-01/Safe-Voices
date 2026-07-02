# feat-0003: Tech Spec — Marketing landing page

## Context

See [`PRODUCT.md`](./PRODUCT.md). Marketing lives in the Next.js **route group** `(marketing)` so shared layout applies without affecting `/access`, `/chat`, etc. Home is a **Server Component** with one `getTranslations('marketing')` call; most copy is static JSX.

## Route map

| URL | File | Layout |
|-----|------|--------|
| `/{locale}` | `app/[locale]/(marketing)/page.tsx` | `(marketing)/layout.tsx` |
| `/{locale}/documentation` | `app/[locale]/(marketing)/documentation/page.tsx` | Same marketing layout ([feat-0004](../feat-0004-documentation-hub/TECH.md)) |

Route group does not appear in URL.

## Modules and files

| Module | Path | Role |
|--------|------|------|
| Home page | `apps/web/app/[locale]/(marketing)/page.tsx` | Hero, features, steps, CTAs |
| Marketing layout | `apps/web/app/[locale]/(marketing)/layout.tsx` | `SiteHeader`, `SiteFooter`, flex column |
| Site header | `apps/web/components/site-header.tsx` | Logo, `LanguageSwitcher`, doc + chat buttons |
| Site footer | `apps/web/components/site-footer.tsx` | Product/trust links, copyright |
| i18n navigation | `apps/web/i18n/navigation.ts` | Locale-aware `Link` on page + header |
| Branding | `apps/web/lib/branding.ts` | `brandLogoSrc`, `brandIconSrc` |
| Messages | `apps/web/messages/en.json`, `ar.json` | `marketing.*`, `common.*` |
| Locale layout | `apps/web/app/[locale]/layout.tsx` | Metadata, providers ([feat-0001](../feat-0001-i18n/TECH.md)) |
| Static assets | `apps/web/public/hero.png`, `@safevoices-logo.png`, `og.png` | Hero and brand |

### CTA link targets (from `page.tsx`)

| Label source | `href` |
|--------------|--------|
| `marketing.heroCta` | `/access` |
| `marketing.heroSecondary` | `/documentation` |
| Section buttons | `/access`, `/documentation` |
| Announcement pill | `/documentation#platform-features` |

### Inline content blocks (English, not in JSON)

| Block | Lines (approx.) | Content |
|-------|-----------------|---------|
| `features` | const array | 6 product capability cards |
| `steps` | const array | Submit / Track / Get guidance |
| `stats` | const array | Response window, encryption, visibility |

## Env vars

No marketing-specific environment variables.

## Dependencies

| Package | Role |
|---------|------|
| `next` | `Image`, App Router |
| `next-intl/server` | `getTranslations` |
| `lucide-react` | Section icons |
| `@safevoices/ui` | `Button` |
| `@safevoices/ui` (via header) | `Select` for language |

## Gaps

| Gap | Notes |
|-----|-------|
| Body copy not in message catalogs | Arabic `/ar` shows English paragraphs |
| `SiteFooter` uses `next/link` | Paths `/chat`, `/documentation` — middleware adds locale |
| "Request a demo" secondary CTA | Links to documentation, not a demo form |
| `ErrorSection` imported in `page.tsx` | Unused import (lint may flag) |
| No analytics events on CTA click | [feat-0018](../feat-0018-seo-pwa-metadata/TECH.md) / growth instrumentation TBD |

## Testing commands

```bash
pnpm --filter @safevoices/web typecheck
pnpm --filter @safevoices/web build

# Dev server
pnpm dev:web
# Manual: open http://localhost:3000/en — click hero CTA → /en/access
```

No dedicated unit tests for landing page; visual/regression manual.

## Related

- [feat-0001 TECH](../feat-0001-i18n/TECH.md) — navigation, messages
- [feat-0002 TECH](../feat-0002-middleware-routing/TECH.md) — `/` redirect
- [feat-0004 TECH](../feat-0004-documentation-hub/TECH.md) — documentation route sibling
- [feat-0005 TECH](../feat-0005-anonymous-case-access/TECH.md) — `/access` destination
- [feat-0018 TECH](../feat-0018-seo-pwa-metadata/TECH.md) — OG images, metadata
- `apps/web/components/site-header.tsx`
- `apps/web/components/site-footer.tsx`
