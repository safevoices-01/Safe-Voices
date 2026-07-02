# feat-0002: Tech Spec — Middleware and locale routing

## Context

See [`PRODUCT.md`](./PRODUCT.md). Single default export in `apps/web/middleware.ts` chains custom redirects with `createMiddleware(routing)` from next-intl. Matcher is explicit to avoid running on static assets and API routes.

## Route / request map

| Incoming path | Condition | Response |
|---------------|-----------|----------|
| `/` | always | `302` → `/{locale}` |
| `/access`, `/auth`, `/chat`, `/dashboard`, `/documentation` | always | `302` → `/{locale}{pathname}` |
| `/{locale}/auth` | `SAFEVOICES_ACCESS_V2 !== 'false'` | `302` → `/{locale}/access` |
| `/{locale}/chat?caseId=…` | enforce on, no `sv_case_session` | `302` → `/{locale}/access?return=…` |
| `/{locale}/*` | otherwise | next-intl middleware response |

Locale resolution for localeless redirects:

```ts
request.cookies.get('NEXT_LOCALE')?.value ?? routing.defaultLocale
// validated against routing.locales
```

## Modules and files

| Module | Path | Role |
|--------|------|------|
| Middleware | `apps/web/middleware.ts` | Localeless redirect, auth redirect, chat gate, intl |
| Routing config | `apps/web/i18n/routing.ts` | `locales`, `defaultLocale` — shared with intl |
| Access config | `apps/web/lib/access-config.ts` | `isAccessV2Enabled()`, `getAccessPath()` |
| Case session constant | `apps/web/lib/case-access.ts` | `CASE_SESSION_COOKIE = 'sv_case_session'` |
| App routes | `apps/web/app/[locale]/**` | Destination pages after redirects |

### Middleware constants

| Symbol | Value |
|--------|-------|
| `SESSION_COOKIE` | `sv_case_session` |
| `LOCALELESS_PATHS` | `/access`, `/auth`, `/chat`, `/dashboard`, `/documentation` |
| `config.matcher` | `'/'`, `'/(en|ar)/:path*'`, localeless paths |

## Env vars

| Variable | Default | Effect |
|----------|---------|--------|
| `SAFEVOICES_ACCESS_V2` | enabled | When `'false'`, skip `/auth` → `/access` redirect |
| `SAFEVOICES_ENFORCE_CHAT_SESSION` | off | When `'true'`, require `sv_case_session` for `/{locale}/chat?caseId=…` |

No other middleware-specific env vars.

## Dependencies

| Package / module | Role |
|------------------|------|
| `next-intl/middleware` | Locale prefix, `NEXT_LOCALE` cookie |
| `next/server` | `NextResponse`, `NextRequest` |
| `./i18n/routing` | Shared locale list |

## Gaps

| Gap | Notes |
|-----|-------|
| `return` query not read in `CaseAccessFlow` | Middleware sets `return`; verify client navigates there post-verify (audit `case-access-flow.tsx`) |
| Footer/doc links without locale | Rely on localeless redirect ([feat-0001](../feat-0001-i18n/TECH.md)) |
| No middleware for submitted/read-only chat | Handled in API and chat page, not edge |
| Dashboard route stub | Redirect works; auth not implemented |

## Testing commands

```bash
# Typecheck
pnpm --filter @safevoices/web typecheck

# Manual curl (dev server on :3000)
curl -sI http://localhost:3000/ | grep -i location
curl -sI http://localhost:3000/access | grep -i location
curl -sI http://localhost:3000/en/auth | grep -i location

# Chat enforcement (set env in shell running dev)
SAFEVOICES_ENFORCE_CHAT_SESSION=true pnpm dev:web
curl -sI 'http://localhost:3000/en/chat?caseId=SV-ABCDE-1234' | grep -i location
```

Unit tests: no dedicated middleware test file; behavior validated manually and via E2E when added.

## Related

- [feat-0001 TECH](../feat-0001-i18n/TECH.md) — `routing`, locale layout
- [feat-0005 TECH](../feat-0005-anonymous-case-access/TECH.md) — session cookie issuance
- [feat-0008 TECH](../feat-0008-reporting-chat-ai/TECH.md) — chat page session UX
- `apps/web/middleware.ts`
- `apps/web/lib/access-config.ts`
