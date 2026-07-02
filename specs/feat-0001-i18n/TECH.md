# feat-0001: Tech Spec — Internationalization (en / ar, RTL)

## Context

See [`PRODUCT.md`](./PRODUCT.md). Safe Voices uses **next-intl v4** on **Next.js 15** App Router. All localized pages sit under `app/[locale]/`. The root `app/layout.tsx` is a passthrough; `app/[locale]/layout.tsx` owns `<html>`, providers, and metadata.

## Route map

| URL pattern | Locale handling |
|-------------|-----------------|
| `/{locale}` | Marketing home ([feat-0003](../feat-0003-marketing-landing/TECH.md)) |
| `/{locale}/access` | Access flow ([feat-0005](../feat-0005-anonymous-case-access/TECH.md)) |
| `/{locale}/chat` | Chat ([feat-0008](../feat-0008-reporting-chat-ai/TECH.md)) |
| `/{locale}/documentation` | Docs hub ([feat-0004](../feat-0004-documentation-hub/TECH.md)) |
| `/`, `/access`, … (no prefix) | Redirected by middleware ([feat-0002](../feat-0002-middleware-routing/TECH.md)) |

Locale type: `AppLocale = 'en' | 'ar'` from `i18n/routing.ts`.

## Modules and files

| Module | Path | Role |
|--------|------|------|
| Routing config | `apps/web/i18n/routing.ts` | `locales`, `defaultLocale`, `localePrefix: 'always'` |
| Request config | `apps/web/i18n/request.ts` | Loads `messages/{locale}.json` per request |
| Navigation helpers | `apps/web/i18n/navigation.ts` | `Link`, `redirect`, `useRouter`, `usePathname`, `getPathname` |
| Locale layout | `apps/web/app/[locale]/layout.tsx` | `setRequestLocale`, `NextIntlClientProvider`, `dir`, font, `generateMetadata` |
| Root layout | `apps/web/app/layout.tsx` | Passthrough `children` only |
| Next plugin | `apps/web/next.config.ts` | `createNextIntlPlugin('./i18n/request.ts')` |
| English catalog | `apps/web/messages/en.json` | Source strings |
| Arabic catalog | `apps/web/messages/ar.json` | Translated strings (key parity required) |
| Key parity test | `apps/web/messages/key-parity.test.ts` | Asserts identical key trees |
| Language switcher | `apps/web/components/language-switcher.tsx` | Client `Select`; `router.replace(pathname, { locale })` |
| Site header | `apps/web/components/site-header.tsx` | Embeds `LanguageSwitcher`; `getTranslations('common')` |
| RTL / LTR CSS | `apps/web/app/globals.css` | `--font-arabic`, `[dir='rtl'] .ltr-embed` |
| API error i18n | `apps/web/lib/translate-api-error.ts` | Maps API `code` → `errors.*` keys |
| AI prompts | `packages/ai/src/chat.ts`, `reporting.ts`, `chat-post.ts` | `getChatSystemPrompt(locale)`, `getReportingSystemPrompt(locale)` |

### Message namespaces (current)

| Namespace | Consumers |
|-----------|-----------|
| `common` | Header, footer links, language labels |
| `access` | `CaseAccessFlow` |
| `chat` | Chat page, reporting UI |
| `errors` | API toasts and inline errors |
| `marketing` | Landing CTAs (partial) |
| `metadata` | `generateMetadata` in locale layout |

## Env vars

| Variable | Required | Purpose |
|----------|----------|---------|
| _(none i18n-specific)_ | — | Locale is URL-driven; `NEXT_LOCALE` cookie set by next-intl middleware |

Optional crisis override (AI, not UI):

| Variable | Purpose |
|----------|---------|
| `SAFEVOICES_CRISIS_RESOURCES_JSON` | JSON map `{ "en": [...], "ar": [...] }` for `getCrisisResources` |

## Dependencies

| Package | Scope | Role |
|---------|-------|------|
| `next-intl` | `apps/web` | Routing, provider, server helpers |
| `next` | `apps/web` | App Router, `next/font/google` (Noto Sans Arabic) |
| `@safevoices/ai` | `packages/ai` | Locale-aware system prompts |
| `@safevoices/ui` | `packages/ui` | `Select` in language switcher |

## Gaps

| Gap | PRODUCT refs | Notes |
|-----|--------------|-------|
| Marketing page body hardcoded English | UC-B14, feat-0003 | Only `marketing.*` keys used; features/steps/stats strings inline in `page.tsx` |
| Documentation not in message catalogs | feat-0004 | Static English in component |
| Site footer uses `next/link` without locale | — | Links like `/chat` rely on middleware redirect |
| Documentation page uses `next/link` not `i18n/navigation` | feat-0004 | May drop locale until redirect |
| No `docs/i18n.md` contributor guide in repo | — | README references it; file not present |

## Testing commands

```bash
# Message key parity (en vs ar)
pnpm --filter @safevoices/web test messages/key-parity.test.ts

# Typecheck web app
pnpm --filter @safevoices/web typecheck

# Full web test suite
pnpm --filter @safevoices/web test
```

Manual:

1. Open `/en` and `/ar` — verify `dir`, font, and header strings.
2. Switch language on `/en/access` — land on `/ar/access` with Arabic copy.
3. Open access form in Arabic — case ID field stays LTR.
4. Trigger verify error — message from `errors.VERIFY_FAILED` in active locale.

## Related

- [feat-0002 TECH](../feat-0002-middleware-routing/TECH.md) — locale redirects and matcher
- [feat-0003 TECH](../feat-0003-marketing-landing/TECH.md) — partial i18n on landing
- [feat-0004 TECH](../feat-0004-documentation-hub/TECH.md) — English-only content
- [feat-0008 TECH](../feat-0008-reporting-chat-ai/TECH.md) — `locale` on case chat route
- [feat-0019 TECH](../feat-0019-api-errors-i18n/TECH.md) — `translate-api-error`
- `packages/ai/src/reporting.ts` — `ReportingLocale`, crisis resources
