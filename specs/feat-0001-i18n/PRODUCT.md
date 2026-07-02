# feat-0001: Internationalization (en / ar, RTL)

## Summary

Safe Voices ships **bilingual** reporter and product surfaces using **next-intl** with locales **`en`** (default) and **`ar`**. Every user-facing route lives under `/{locale}/…` with `localePrefix: 'always'`. Arabic sets `dir="rtl"` on `<html>`, loads **Noto Sans Arabic**, and uses `.ltr-embed` for case IDs, secrets, and other LTR-only strings. Message catalogs in `messages/en.json` and `messages/ar.json` drive UI copy; the same locale is forwarded to AI system prompts on chat routes ([feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md)).

**Status:** Complete.

Complements [feat-0002](../feat-0002-middleware-routing/PRODUCT.md) (locale redirects), [feat-0003](../feat-0003-marketing-landing/PRODUCT.md) (partial i18n on landing), and [feat-0004](../feat-0004-documentation-hub/PRODUCT.md) (English-only docs).

## Problem

Reporters and partners in Arabic-speaking regions need trustworthy intake in their language. Without a single i18n layer, copy is hardcoded, RTL breaks layouts, metadata and AI replies stay English-only, and locale cannot be bookmarked or shared consistently.

## Non-goals

- Additional locales beyond `en` and `ar` (no framework block, but not in scope).
- Full translation of documentation hub content ([feat-0004](../feat-0004-documentation-hub/PRODUCT.md)).
- Full translation of marketing landing body copy ([feat-0003](../feat-0003-marketing-landing/PRODUCT.md) — hero CTAs and header only).
- CMS-driven or crowd-sourced translation workflow.
- Locale-specific legal disclaimers reviewed by counsel (product uses same structure; legal review is organizational).

## Actors

| Actor | Description |
|-------|-------------|
| **Reporter (any locale)** | Reads UI in English or Arabic; may switch language without losing path. |
| **Partner user** | Uses same locale machinery on auth and dashboard stubs. |
| **Platform** | Serves messages, sets `lang`/`dir`, passes locale to AI when configured. |
| **Translator / engineer** | Maintains parity between `en.json` and `ar.json`. |

## Use case catalog

### A. Locale selection and persistence

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | First visit without locale prefix | User opens `/` or localeless path | Middleware redirects to `/{defaultLocale}` or cookie locale ([feat-0002](../feat-0002-middleware-routing/PRODUCT.md)) | URL is `/en/…` or `/ar/…` |
| **UC-A02** | Switch language in header | On any localized page with `LanguageSwitcher` | Select Arabic or English | Same pathname, new locale segment; `NEXT_LOCALE` cookie updated by next-intl |
| **UC-A03** | Deep link with locale | User opens `/ar/access` | Page renders in Arabic, RTL | `lang=ar`, `dir=rtl` |
| **UC-A04** | Invalid locale segment | URL uses unsupported locale | `notFound()` in locale layout | 404 |
| **UC-A05** | Return after language switch | User on `/en/chat` switches to Arabic | `router.replace(pathname, { locale: 'ar' })` | `/ar/chat` with Arabic messages |

### B. Message catalogs and namespaces

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Render common chrome | Locale layout loaded | `getMessages()` + `NextIntlClientProvider` | Header, footer labels from `common.*` |
| **UC-B11** | Access flow copy | On `/access` | `useTranslations('access')` | Buttons, errors, secret card labels localized |
| **UC-B12** | Chat and errors | On `/chat` or API error toast | `chat.*`, `errors.*` namespaces | User-visible errors map from API `code` via `translateApiError` ([feat-0019](../feat-0019-api-errors-i18n/PRODUCT.md)) |
| **UC-B13** | Metadata per locale | Server render | `getTranslations({ locale, namespace: 'metadata' })` | Title, description, OG locale `en_US` / `ar_SA` |
| **UC-B14** | Marketing CTAs | Landing hero | `getTranslations('marketing')` | Primary/secondary CTA strings localized |
| **UC-B15** | Key parity CI | Both JSON files updated | `messages/key-parity.test.ts` | `en` and `ar` share identical key paths |

### C. RTL and mixed-direction UI

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Arabic page direction | `locale === 'ar'` | `dir="rtl"` on `<html>` | Layout mirrors; reading order RTL |
| **UC-C21** | Arabic typography | `locale === 'ar'` | Noto Sans Arabic on `body` | Arabic glyphs render with dedicated stack |
| **UC-C22** | LTR credentials in RTL shell | Access existing case form | Inputs use `dir="ltr"` + `ltr-embed` class | Case ID and secret display left-to-right |
| **UC-C23** | Monospace case ID in chat | Arabic chat session | `ltr-embed` on case ID chip | ID readable without bidi reversal |

### D. AI locale alignment

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D30** | Reporting chat in Arabic | Verified session; client sends `locale: 'ar'` | API uses `getReportingSystemPrompt('ar')` | Assistant replies in Arabic when model follows prompt |
| **UC-D31** | Demo chat locale | General `/api/chat` | `locale` in body defaults to `en` | English prompt unless `ar` sent |
| **UC-D32** | Crisis resources by locale | Crisis detected | `getCrisisResources(locale)` | Hotlines copy matches locale |

### E. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-E40** | Missing translation key → next-intl dev warning / fallback behavior per library config |
| **UC-E41** | Locale cookie invalid → middleware falls back to `routing.defaultLocale` (`en`) |
| **UC-E42** | Documentation page English body in `/ar/documentation` → Arabic chrome, English article ([feat-0004](../feat-0004-documentation-hub/PRODUCT.md)) |

## Behavior rules

1. **Supported locales:** `en`, `ar` only (`apps/web/i18n/routing.ts`).

2. **URL shape:** Always prefixed (`/en/…`, `/ar/…`); localeless paths redirect ([feat-0002](../feat-0002-middleware-routing/PRODUCT.md)).

3. **Default locale:** `en`.

4. **Navigation:** Use `Link`, `useRouter`, `usePathname` from `apps/web/i18n/navigation.ts` — never raw `next/link` for locale-aware routes except where explicitly locale-agnostic (documentation hub today).

5. **RTL:** Set at layout root; embed LTR for tracking codes, secrets, and mono IDs.

6. **Messages:** Single file per locale; nested namespaces (`common`, `access`, `chat`, `errors`, `marketing`, `metadata`).

7. **AI:** Client should pass active UI locale on reporting chat requests so prompts and crisis copy align.

8. **Static generation:** `generateStaticParams` emits both locales for `[locale]` segment.

## What's needed to make it work

| Requirement | Who | Notes |
|-------------|-----|-------|
| `next-intl` plugin in `next.config.ts` | Engineering | Points to `i18n/request.ts` |
| `messages/en.json` and `messages/ar.json` with **identical keys** | Engineering / translation | Run key-parity test on every catalog change |
| Arabic translations for all namespaces used in product surfaces | Translation | Access, chat, errors, metadata, marketing CTAs |
| `LanguageSwitcher` in site header | Product | Visible on marketing and doc layouts |
| Client passes `locale` on reporting chat API calls | Engineering | See `apps/web/app/api/cases/[caseId]/chat/route.ts` |
| Noto Sans Arabic font loading in locale layout | Engineering | Already in `app/[locale]/layout.tsx` |
| RTL QA on access, chat, and forms | QA | Especially credential fields and toasts |

## Implementation status

| Area | Status |
|------|--------|
| next-intl routing (`en` / `ar`) | Complete |
| Message catalogs + key parity test | Complete |
| Locale layout, metadata, RTL font | Complete |
| Language switcher | Complete |
| AI prompt locale (`packages/ai`) | Complete |
| Marketing body copy i18n | Partial (CTAs/header only) |
| Documentation content i18n | Not started ([feat-0004](../feat-0004-documentation-hub/PRODUCT.md)) |

## Acceptance criteria

1. `/` and localeless product paths redirect to `/en/…` or cookie-preferred locale.
2. `/ar/…` renders with `dir=rtl` and Arabic font; `/en/…` uses LTR.
3. Language switcher changes locale while preserving pathname (e.g. `/en/access` → `/ar/access`).
4. `pnpm --filter @safevoices/web test` passes `key-parity.test.ts`.
5. Access flow, chat chrome, errors, and metadata display Arabic strings from `ar.json`.
6. Case ID and secret inputs remain LTR in Arabic UI.
7. Reporting chat with `locale: 'ar'` uses Arabic system prompt from `@safevoices/ai`.
8. Unsupported locale in URL returns 404.

## Related

- [feat-0002 PRODUCT](../feat-0002-middleware-routing/PRODUCT.md) — locale redirects
- [feat-0003 PRODUCT](../feat-0003-marketing-landing/PRODUCT.md) — landing (partial i18n)
- [feat-0004 PRODUCT](../feat-0004-documentation-hub/PRODUCT.md) — English-only docs
- [feat-0008 PRODUCT](../feat-0008-reporting-chat-ai/PRODUCT.md) — locale in reporting chat
- [feat-0019 PRODUCT](../feat-0019-api-errors-i18n/PRODUCT.md) — API error translation
- `apps/web/i18n/` — routing, request, navigation
- `apps/web/messages/` — catalogs
