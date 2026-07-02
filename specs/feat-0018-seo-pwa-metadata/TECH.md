# feat-0018: Tech Spec — SEO, PWA, and metadata

## Context

See [`PRODUCT.md`](./PRODUCT.md). Next.js App Router metadata routes and `generateMetadata` in the locale layout. Root `app/layout.tsx` is a passthrough (`return children`); **locale layout owns `<html>`** and metadata.

## File map

| File | Export | Role |
|------|--------|------|
| `apps/web/lib/site.ts` | `getSiteUrl()` | Origin from `NEXT_PUBLIC_SITE_URL` or localhost default |
| `apps/web/lib/branding.ts` | `brandIconSrc`, etc. | Public asset paths |
| `apps/web/app/sitemap.ts` | `default function sitemap()` | Locale matrix + hreflang |
| `apps/web/app/robots.ts` | `default function robots()` | Allow all + sitemap link |
| `apps/web/app/manifest.ts` | `default function manifest()` | PWA manifest |
| `apps/web/app/[locale]/layout.tsx` | `generateMetadata`, layout | OG, Twitter, icons, alternates |
| `apps/web/messages/en.json` | `metadata.*` | Copy for tags |
| `apps/web/messages/ar.json` | `metadata.*` | Arabic parity |

## getSiteUrl

```ts
// apps/web/lib/site.ts
export function getSiteUrl(): string {
    const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    const base = raw && raw.length > 0 ? raw : 'http://localhost:3000';
    return base.replace(/\/$/, '');
}
```

Used by: `sitemap.ts`, `robots.ts`, `generateMetadata` (`metadataBase`).

## Sitemap and hreflang

```ts
const LOCALES = ['en', 'ar'] as const;
const PATHS = ['', '/access', '/chat', '/documentation'] as const;

// Each entry:
alternates: {
    languages: Object.fromEntries(
        LOCALES.map((l) => [l, `${base}/${l}${path}`]),
    ),
},
```

Output: `GET /sitemap.xml` (Next metadata route convention).

## robots.ts

```ts
return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${base}/sitemap.xml`,
};
```

## manifest.ts

| Field | Value |
|-------|-------|
| `name` / `short_name` | Safe Voices |
| `display` | `standalone` |
| `start_url` | `/` |
| `theme_color` | `#ea580c` |
| `background_color` | `#fdf8f3` |
| `icons` | `brandIconSrc` @ 192 and 512, `purpose: 'any'` |

Served at `/manifest.webmanifest` (Next default).

## generateMetadata ([locale]/layout.tsx)

| Metadata key | Source |
|--------------|--------|
| `metadataBase` | `getSiteUrl()` |
| `title.default` | `t('siteTitle')` |
| `title.template` | `%s \| Safe Voices` |
| `description` | `t('siteDescription')` |
| `openGraph.locale` | `ar_SA` or `en_US` |
| `openGraph.images` | `/og.png` 1200x630 |
| `twitter.card` | `summary_large_image` |
| `alternates.languages` | `{ en: '/en', ar: '/ar' }` |
| `icons` / `appleWebApp` | `brandIconSrc` |

Namespace: `metadata` via `getTranslations({ locale, namespace: 'metadata' })`.

### Message keys

```json
"metadata": {
  "siteTitle": "Safe Voices | Secure anonymous reporting",
  "siteDescription": "...",
  "chatTitle": "AI assistant",
  "chatDescription": "..."
}
```

Child routes (e.g. chat page) may export their own `generateMetadata` using `chatTitle` / `chatDescription`.

## Environment

| Variable | Required (prod) | Purpose |
|----------|-----------------|---------|
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical origin (e.g. `https://thesafevoices.org`) |

Documented in `specs/AI_CHATBOT_SPEC.md` deployment section; add to `apps/web/.env.example` when present.

## Static assets

| Path | Use |
|------|-----|
| `apps/web/public/og.png` | OG/Twitter image |
| `apps/web/public/@safevoices-iocn.png` | Favicon + manifest icons |
| `apps/web/public/favicon.svg` | Optional vector favicon |

## Validation

| Check | How |
|-------|-----|
| Build | `pnpm --filter @safevoices/web run build` emits sitemap/robots/manifest |
| Manual | `curl $SITE/sitemap.xml`, view-source on `/en` |
| i18n keys | `apps/web/messages/key-parity.test.ts` includes `metadata.*` |

## Known gaps

| Gap | Notes |
|-----|-------|
| No `noindex` on sensitive routes | Policy decision |
| No service worker | Install shell only |
| `start_url` `/` vs locale prefix | Middleware handles locale |
| Investigator/dashboard not in sitemap | Intentional |

## Related

- [feat-0001 TECH](../feat-0001-i18n/TECH.md)
- [feat-0002 TECH](../feat-0002-middleware-routing/TECH.md)
- `apps/web/next.config.ts`
- `specs/AI_CHATBOT_SPEC.md` — deployment env examples
