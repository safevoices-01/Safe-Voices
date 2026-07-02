# feat-0004: Tech Spec — Documentation hub

## Context

See [`PRODUCT.md`](./PRODUCT.md). Documentation is a **single Server Component** with local helper components (`Section`, `TocLink`). No data fetching, no i18n for body. Sits beside landing in `(marketing)` route group.

## Route map

| URL | File | Notes |
|-----|------|-------|
| `/{locale}/documentation` | `app/[locale]/(marketing)/documentation/page.tsx` | Main article |
| `/{locale}/documentation#*` | same | Client hash navigation |
| `/documentation` | middleware | → `/{locale}/documentation` |

## Modules and files

| Module | Path | Role |
|--------|------|------|
| Documentation page | `apps/web/app/[locale]/(marketing)/documentation/page.tsx` | TOC, sections, inline content |
| Doc layout | `apps/web/app/[locale]/(marketing)/documentation/layout.tsx` | `metadata` export only |
| Marketing layout | `apps/web/app/[locale]/(marketing)/layout.tsx` | Header + footer |
| Site header | `apps/web/components/site-header.tsx` | i18n chrome |
| Site footer | `apps/web/components/site-footer.tsx` | Trust link to `#security-privacy` |

### TOC anchors (`toc` const)

| `id` | Label |
|------|-------|
| `getting-started` | Getting started |
| `anonymous-reporting` | Anonymous reporting |
| `tracking-your-case` | Tracking your case |
| `for-administrators` | For administrators |
| `platform-features` | Platform features |
| `security-privacy` | Security and privacy |
| `testing-workflows` | Testing workflows |
| `faq` | FAQ |

### Internal components (same file)

| Component | Purpose |
|-----------|---------|
| `TocLink` | Sidebar anchor link |
| `Section` | `id`, `title`, children wrapper with `scroll-mt-24` |

## Env vars

None.

## Dependencies

| Package | Role |
|---------|------|
| `next` | `Link`, metadata |
| `@safevoices/ui` | `Button`, `Separator` |
| Marketing layout | `SiteHeader`, `SiteFooter` |

## Gaps

| Gap | PRODUCT refs | Notes |
|-----|--------------|-------|
| No `messages` integration | UC-E40 | Entire article hardcoded English |
| `next/link` instead of `i18n/navigation` | UC-A03 | `/` and `/chat` lose locale in href |
| Admin dashboard described but stub | UC-C04 | [feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md) |
| Status workflow in docs vs DB | UC-C03 | Align with [feat-0009](../feat-0009-case-submit-lifecycle/PRODUCT.md) when lifecycle ships |
| No search / versioning | Non-goals | — |

## Testing commands

```bash
pnpm --filter @safevoices/web typecheck
pnpm --filter @safevoices/web build

# Manual
pnpm dev:web
# Visit http://localhost:3000/en/documentation#faq
# From /en click footer Security → #security-privacy
```

## Related

- [feat-0001 TECH](../feat-0001-i18n/TECH.md) — partial locale on shell only
- [feat-0002 TECH](../feat-0002-middleware-routing/TECH.md) — `/documentation` in `LOCALELESS_PATHS`
- [feat-0003 TECH](../feat-0003-marketing-landing/TECH.md) — shared marketing layout
- [feat-0018 TECH](../feat-0018-seo-pwa-metadata/TECH.md) — doc metadata in layout
- `apps/web/app/[locale]/(marketing)/documentation/page.tsx`
