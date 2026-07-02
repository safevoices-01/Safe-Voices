# feat-0018: SEO, PWA, and metadata

## Summary

Public marketing and reporter-facing pages expose **correct canonical URLs**, **hreflang alternates** (English and Arabic), **crawler rules**, **installable PWA manifest**, and **rich social previews** (Open Graph, Twitter). Metadata is driven by `next-intl` copy, shared branding assets, and `NEXT_PUBLIC_SITE_URL` for absolute links in production.

**Status:** Implemented in `apps/web` via `sitemap.ts`, `robots.ts`, `manifest.ts`, and `generateMetadata` in `app/[locale]/layout.tsx`.

Complements [feat-0001](../feat-0001-i18n/PRODUCT.md) (locales), [feat-0002](../feat-0002-middleware-routing/PRODUCT.md) (locale prefix), and [feat-0003](../feat-0003-marketing-landing/PRODUCT.md) (indexed landing).

## Problem

Search engines and social platforms need stable absolute URLs per locale. Without `metadataBase`, sitemap hreflang, and manifest icons, Arabic and English surfaces may be indexed incorrectly, share cards may break off localhost, and mobile "Add to Home Screen" lacks branding.

## Non-goals

- App Store / Play Store listings.
- Per-page metadata for every dashboard route (investigator stub unindexed).
- Dynamic OG images per case (static `/og.png` only).
- `noindex` on `/chat` or `/access` (product may add later for privacy).
- Service worker / offline cache (manifest only).

## Actors

| Actor | Description |
|-------|-------------|
| **Search crawler** | Consumes `/robots.txt`, `/sitemap.xml`, hreflang alternates. |
| **Social platform** | Reads OG/Twitter tags from locale layout. |
| **Reporter / visitor** | May install PWA shell; sees correct tab title and favicon. |
| **Operator** | Sets `NEXT_PUBLIC_SITE_URL` in production. |

## Surfaces (product)

| Surface | User-visible outcome |
|---------|----------------------|
| Browser tab | Localized title template `%s \| Safe Voices` |
| Share link | Title, description, `og.png` 1200x630 |
| Language switch | Matches `alternates.languages` en/ar |
| Install prompt | Name, theme color, icons from manifest |
| Sitemap | Discoverable `/en`, `/ar`, key paths |

## Indexed paths (sitemap)

For each locale `en` and `ar`:

| Path | Priority (relative) | Change frequency |
|------|---------------------|------------------|
| `/{locale}` | Highest (1.0) | weekly |
| `/{locale}/access` | 0.8 | monthly |
| `/{locale}/chat` | 0.8 | monthly |
| `/{locale}/documentation` | 0.8 | monthly |

Each entry includes **hreflang alternates** mapping `en` and `ar` to the same path under the other locale.

## Use case catalog

### A. Canonical site URL

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Production URLs | `NEXT_PUBLIC_SITE_URL` set | Deploy web | Sitemap/OG use production origin |
| **UC-A02** | Local dev fallback | Env unset | `getSiteUrl()` | `http://localhost:3000` (no trailing slash) |

### B. Locale metadata

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | English page metadata | `locale=en` | Load any `[locale]` page | `metadata` namespace strings; `og:locale=en_US` |
| **UC-B11** | Arabic page metadata | `locale=ar` | Load page | RTL layout; `og:locale=ar_SA` |
| **UC-B12** | hreflang alternates | Either locale | View page source | `alternates.languages` en + ar |

### C. Crawlers

| ID | Use case | Main flow | Postcondition |
|----|----------|-----------|---------------|
| **UC-C20** | robots.txt | `GET /robots.txt` | Allow `/`; sitemap URL |
| **UC-C21** | sitemap.xml | `GET /sitemap.xml` | All locale paths with alternates |

### D. PWA manifest

| ID | Use case | Main flow | Postcondition |
|----|----------|-----------|---------------|
| **UC-D30** | Web app manifest | `GET /manifest.webmanifest` | Standalone display, theme colors, icons |
| **UC-D31** | Apple web app | iOS Safari | `appleWebApp` capable; apple-touch icon |

### E. Child route titles

| ID | Use case | Example |
|----|----------|---------|
| **UC-E40** | Nested `generateMetadata` | Chat page may set `metadata.chatTitle` (per-route files) |

## Behavior (product rules)

1. **`metadataBase`** is `new URL(getSiteUrl())` so relative OG image paths resolve correctly.

2. **Title template:** default `siteTitle` from `messages/{locale}.json` → `metadata.siteTitle`; child pages use `%s | Safe Voices`.

3. **Icons:** `brandIconSrc` (`@safevoices-iocn.png`) for favicon, shortcut, apple, and manifest 192/512.

4. **Theme:** manifest `theme_color` `#ea580c`, `background_color` `#fdf8f3` (warm brand palette).

5. **Robots:** allow all user agents on `/` (no staging guard in code — use env-specific deploy for staging `noindex` if needed).

6. **Chat and access in sitemap:** listed for discoverability of entry points; does not imply case content is public.

## Acceptance criteria

| # | Criterion |
|---|-----------|
| AC-1 | `NEXT_PUBLIC_SITE_URL` drives sitemap and `metadataBase` without trailing slash bugs. |
| AC-2 | Sitemap entries include `alternates.languages` for en and ar. |
| AC-3 | `robots.txt` references sitemap absolute URL. |
| AC-4 | Manifest serves name, icons, `standalone` display. |
| AC-5 | OG image `/og.png` resolves on production origin. |

## Open questions

1. Should `/chat` and `/access` be `noindex`? **Default:** review with privacy counsel; marketing wants funnel visibility.

2. Locale-specific `start_url` in manifest (`/en` vs `/`)? **Default:** `/` with middleware redirect ([feat-0002](../feat-0002-middleware-routing/PRODUCT.md)).

## Related

- [feat-0001 PRODUCT](../feat-0001-i18n/PRODUCT.md)
- [feat-0002 PRODUCT](../feat-0002-middleware-routing/PRODUCT.md)
- [feat-0003 PRODUCT](../feat-0003-marketing-landing/PRODUCT.md)
- [feat-0004 PRODUCT](../feat-0004-documentation-hub/PRODUCT.md)
- `apps/web/lib/branding.ts`
