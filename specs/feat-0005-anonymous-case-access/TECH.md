# feat-0005: Tech Spec — Anonymous case access

## Context

See [`PRODUCT.md`](./PRODUCT.md). Reporter credentials are **case ID + secret** (no user account). Next.js route handlers delegate to `apps/web/lib/case-access.ts`, which wraps `@safevoices/prisma` `getCaseStore()`. UI is client component `CaseAccessFlow` on `app/[locale]/access/page.tsx` inside minimal `AuthLayout` (no marketing header).

## Route / API map

### Pages

| URL | Component | Notes |
|-----|-----------|-------|
| `/{locale}/access` | `CaseAccessFlow` | Menu, create, existing, show-secret modes |
| `/{locale}/auth` | — | Redirects to access when V2 on ([feat-0002](../feat-0002-middleware-routing/TECH.md)) |

### API (Next.js App Router)

| Method | Path | Handler | Request | Response |
|--------|------|---------|---------|----------|
| `POST` | `/api/cases` | `app/api/cases/route.ts` | — | `{ caseId, secret, secretShownOnce?: true }` |
| `POST` | `/api/cases/verify` | `app/api/cases/verify/route.ts` | `{ caseId, secret }` | Sets cookie; `{ ok: true, caseId, expiresAt }` |
| `GET` | `/api/cases/session` | `app/api/cases/session/route.ts` | Cookie `sv_case_session` | `{ ok, caseId, expiresAt, submitted, caseStatus }` or 401 |

Related case APIs (downstream, not access UI):

| Path | Feature |
|------|---------|
| `/api/cases/[caseId]/chat` | [feat-0008](../feat-0008-reporting-chat-ai/TECH.md) |
| `/api/cases/[caseId]/submit` | [feat-0009](../feat-0009-case-submit-lifecycle/TECH.md) |
| `/api/cases/[caseId]/messages` | Message history |
| `/api/cases/[caseId]/upload` | [feat-0010](../feat-0010-evidence-upload-storage/TECH.md) |

### Client navigation after verify

```ts
router.push(`/chat?caseId=${encodeURIComponent(json.caseId)}`);
```

Uses locale-aware router from `i18n/navigation.ts`.

## Modules and files

| Module | Path | Role |
|--------|------|------|
| Access page | `apps/web/app/[locale]/access/page.tsx` | Renders `CaseAccessFlow` |
| Access layout | `apps/web/app/[locale]/access/layout.tsx` | Passthrough fragment |
| Case access flow | `apps/web/components/auth/case-access-flow.tsx` | State machine: menu / existing / show-secret |
| Auth layout | `apps/web/components/auth/auth-layout.tsx` | Centered card, logo, sr-only title |
| Case access lib | `apps/web/lib/case-access.ts` | Cookie name, regex, store delegates, `hashClientKey` |
| Access config | `apps/web/lib/access-config.ts` | `getAccessPath()` |
| API errors | `apps/web/lib/api-errors.ts` | `VERIFY_FAILED`, `VERIFY_LOCKED`, etc. |
| Error i18n | `apps/web/lib/translate-api-error.ts` | Maps `code` → `errors.*` |
| Create route | `apps/web/app/api/cases/route.ts` | `createCaseCredential()` |
| Verify route | `apps/web/app/api/cases/verify/route.ts` | Validation, cookie `set` |
| Session route | `apps/web/app/api/cases/session/route.ts` | `resolveSession` |
| Zod schemas | `packages/trpc/src/schemas.ts` | `createCaseResponseSchema`, `verifyCaseAccessRequestSchema` |
| Case store factory | `packages/prisma/src/get-case-store.ts` | Memory vs Prisma |
| Prisma store | `packages/prisma/src/prisma-case-store.ts` | DB-backed verify lockout |
| Memory store | `packages/prisma/src/memory-case-store.ts` | Dev in-process store |
| Crypto | `packages/prisma/src/crypto.ts` | Argon2, pepper, tokens, tracking codes |
| Schema | `packages/prisma/schema.prisma` | `Case`, `CaseSession` models |
| Show-once card | `packages/ui/src/components/ui/show-once-secret-card.tsx` | Copy, ack checkbox, continue |
| Lockout notice | `packages/ui/src/components/ui/lockout-notice.tsx` | 429 presentation |
| Safety notice | `packages/ui/src/components/ui/safety-notice.tsx` | Anonymous messaging |
| Middleware | `apps/web/middleware.ts` | Chat session gate, auth redirect |
| Tests | `apps/web/components/auth/case-access-flow.test.ts` | Zod contract + copy shape |

### CaseAccessFlow state machine

| Mode | Trigger | UI |
|------|---------|-----|
| `menu` | initial | Anonymous + existing buttons |
| `show-secret` | create success | `ShowOnceSecretCard` |
| `existing` | "Access existing" | ID + secret form |

### Verify pipeline (`verify/route.ts`)

1. Parse JSON → `verifyCaseAccessRequestSchema`
2. Normalize `caseId` (trim, uppercase); validate `CASE_ID_REGEX`
3. Validate `secret.length >= SECRET_MIN_LENGTH` (16)
4. `verifyCaseCredential({ caseId, secret, clientKey: hashClientKey(req) })`
5. On success: `cookies().set(CASE_SESSION_COOKIE, token, { httpOnly, sameSite: 'lax', secure: prod, expires })`

### Store constants (Prisma + memory)

| Constant | Value |
|----------|-------|
| `SESSION_TTL_MS` | 15 minutes |
| `SESSION_ABSOLUTE_MS` | 24 hours |
| `MAX_ATTEMPTS` | 5 |
| `LOCKOUT_MS` | 10 minutes |
| `NETWORK_WINDOW_MS` | 15 minutes |
| `NETWORK_LIMIT` | `SAFEVOICES_NETWORK_VERIFY_LIMIT` or 30 |

## Env vars

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `SAFEVOICES_SECRET_PEPPER` | **Prod: yes** | `safevoices-dev-pepper` | Argon2 pepper, session token HMAC |
| `DATABASE_URL` | Optional | — | Enables `PrismaCaseStore` |
| `CASE_STORE` | Optional | auto | `memory` forces memory; else Prisma if DB URL |
| `SAFEVOICES_NETWORK_VERIFY_LIMIT` | Optional | `30` | Per-IP verify cap per 15 min |
| `SAFEVOICES_ACCESS_V2` | Optional | enabled | `/auth` → `/access` ([feat-0002](../feat-0002-middleware-routing/TECH.md)) |
| `SAFEVOICES_ENFORCE_CHAT_SESSION` | Optional | off | Middleware chat gate |
| `NODE_ENV` | — | — | `secure` cookie flag when `production` |

## Dependencies

| Package | Role |
|---------|------|
| `@safevoices/prisma` | Case store, crypto |
| `@safevoices/trpc` | Shared Zod API contracts |
| `@safevoices/ui` | `ShowOnceSecretCard`, `LockoutNotice`, `SafetyNotice`, form controls |
| `next-intl` | `access.*` translations |
| `@node-rs/argon2` | Secret hashing (in prisma package) |
| `next/headers` | `cookies()` in route handlers |

## Gaps

| Gap | PRODUCT refs | Notes |
|-----|--------------|-------|
| `return` query ignored | UC-D34 | Middleware sets it; `navigateToChat` hardcodes `/chat?caseId=` |
| No `DELETE` session / logout route | — | Revoke exists in lib but no public API |
| Hono `apps/api` parity | feat-0016 | Standalone server may not expose all case routes |
| Secret never cleared from client state after navigation | — | Memory holds secret until unmount |
| Email partner path mock | feat-0006 | Link present; backend mock |
| SQLite default in schema | feat-0011 | Production DB provider may differ |

## Testing commands

```bash
# Contract tests
pnpm --filter @safevoices/web test components/auth/case-access-flow.test.ts

# Full web tests
pnpm --filter @safevoices/web test

# Typecheck
pnpm --filter @safevoices/web typecheck

# Prisma client (when using DB store)
pnpm --filter @safevoices/prisma exec prisma generate
```

### Manual API checks (dev server running)

```bash
# Create case
curl -s -X POST http://localhost:3000/api/cases | jq .

# Verify (replace CASE_ID and SECRET)
curl -s -X POST http://localhost:3000/api/cases/verify \
  -H 'content-type: application/json' \
  -d '{"caseId":"SV-ABCDE-1234","secret":"YOUR_SECRET_HERE"}' \
  -c cookies.txt | jq .

# Session
curl -s http://localhost:3000/api/cases/session -b cookies.txt | jq .
```

## Related

- [feat-0001 TECH](../feat-0001-i18n/TECH.md) — `access.*`, LTR inputs
- [feat-0002 TECH](../feat-0002-middleware-routing/TECH.md) — cookie name, enforcement
- [feat-0008 TECH](../feat-0008-reporting-chat-ai/TECH.md) — chat after verify
- [feat-0011 TECH](../feat-0011-data-layer/TECH.md) — store implementation detail
- [feat-0012 TECH](../feat-0012-api-contracts/TECH.md) — schemas
- [feat-0019 TECH](../feat-0019-api-errors-i18n/TECH.md) — `translateApiError`
- `packages/prisma/src/crypto.ts`
- `packages/prisma/src/prisma-case-store.ts`
