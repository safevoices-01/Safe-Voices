# feat-0016: Tech Spec — Hono standalone API

## Context

See [`PRODUCT.md`](./PRODUCT.md). Standalone server entry: `apps/api/src/server.ts`. Package `@safevoices/api` runs via `tsx watch src/server.ts` (`pnpm dev:api`). `apps/api/src/index.ts` exports a placeholder `initApiApp()` for legacy imports; the live server is `server.ts`.

## Stack

| Piece | Choice |
|-------|--------|
| Framework | [Hono](https://hono.dev/) 4.x |
| Runtime adapter | `@hono/node-server` `serve()` |
| Shared logic | `@safevoices/ai/chat-post`, `@safevoices/prisma`, `@safevoices/trpc` |
| Env loading | `dotenv` from `apps/api/.env` |

## Route map

| Method | Path | Auth | Handler summary |
|--------|------|------|-----------------|
| `GET` | `/health` | None | `{ status: 'ok' }` |
| `POST` | `/api/chat` | None | `parseChatRequestBody` → `createChatStreamResponse(messages)` |
| `POST` | `/api/cases` | None | `getCaseStore().createCase()` + `secretShownOnce: true` |
| `POST` | `/api/cases/verify` | None | Zod `verifyCaseAccessRequestSchema` → store verify → JSON with `token` |
| `POST` | `/api/cases/:caseId/chat` | `Authorization: Bearer <token>` | `resolveSession` + caseId match → reporting stream |

### Next.js routes not ported

| Next route | Notes |
|------------|-------|
| `apps/web/app/api/cases/session/route.ts` | Cookie session GET |
| `apps/web/app/api/cases/[caseId]/messages/route.ts` | History + outbox |
| `apps/web/app/api/cases/[caseId]/submit/route.ts` | Lifecycle submit |
| `apps/web/app/api/cases/[caseId]/upload/route.ts` | Supabase signed upload |

## Auth: Bearer on case chat

```ts
// apps/api/src/server.ts
const auth = c.req.header('Authorization');
const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
const session = await getCaseStore().resolveSession(token);
if (!session || session.caseId !== caseId) {
    return c.json({ error: 'Unauthorized' }, 401);
}
```

Next equivalent uses `CASE_SESSION_COOKIE` via `cookies()` in `apps/web/lib/case-access.ts`.

Verify on Hono returns token in body (Next sets cookie and omits token from response):

```ts
return c.json({
    ok: true,
    caseId,
    token: verified.token,
    expiresAt: verified.expiresAt.toISOString(),
});
```

## CORS

```ts
cors({
    origin: getCorsOrigins(), // SAFEVOICES_CORS_ORIGINS or localhost defaults
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'], // Bearer not listed; browser simple requests only
})
```

**Gap:** `Authorization` may require `allowHeaders: ['Content-Type', 'Authorization']` for browser clients.

Default origins: `localhost:3000`, `localhost:5173`, `127.0.0.1` variants.

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | No | Listen port (default `8787`) |
| `SAFEVOICES_CORS_ORIGINS` | Prod | Comma-separated allowed origins |
| `DATABASE_URL` | Prod | Persistent case store |
| `SAFEVOICES_SECRET_PEPPER` | Prod | Session/credential crypto |
| `AI_GATEWAY_API_KEY` | Chat | Streaming model |

Load path: `apps/api/.env` (see `env-check:api` in root `package.json`).

## Parity gaps (audit)

| Gap | Next behavior | Hono today |
|-----|---------------|------------|
| Session route | `GET /api/cases/session` | Missing |
| Messages | Persist + list | Missing |
| Submit guard | 409 `CASE_SUBMITTED_READONLY` | Not checked |
| Chat persistence | `appendChatTurn`, `x-sv-extraction` header | Stream only |
| `apiErrorResponse` / `code` | Stable codes | Plain `{ error }` strings |
| Rate-limit messaging | `VERIFY_LOCKED` code | String only |
| CORS `Authorization` | N/A (same-origin) | May block browser Bearer |
| Case create | `createCaseCredential` in web lib | `getCaseStore().createCase()` directly |

**Target:** extract shared route handlers into `@safevoices/trpc` or a small `@safevoices/api-handlers` package invoked by both Next and Hono.

## Module map

| File | Role |
|------|------|
| `apps/api/src/server.ts` | Hono app + `serve()` |
| `apps/api/src/index.ts` | Stub export |
| `apps/api/package.json` | `dev`, `typecheck`, `test` scripts |
| `packages/ai/src/chat-post.ts` | Request parse + stream factory |
| `packages/prisma/src/get-case-store.ts` | Store singleton |
| `packages/trpc/src/schemas.ts` | `verifyCaseAccessRequestSchema` |

## Commands

```bash
pnpm dev:api
# or
pnpm --filter @safevoices/api run dev

curl -s http://127.0.0.1:8787/health

# Create + verify + chat (illustrative)
CASE=$(curl -s -X POST http://127.0.0.1:8787/api/cases)
# ... parse caseId/secret, POST verify, use token on case chat
```

```bash
pnpm --filter @safevoices/api run typecheck
```

## Testing

| Case | Command / method |
|------|------------------|
| Typecheck | `pnpm --filter @safevoices/api run typecheck` |
| Integration | Manual curl or future supertest suite |
| CI | Included in root `pnpm typecheck` via turbo |

No dedicated Hono route tests in repo today (`apps/api` uses `node --test` placeholder).

## Related

- [feat-0005 TECH](../feat-0005-anonymous-case-access/TECH.md) — cookie session on Next
- [feat-0008 TECH](../feat-0008-reporting-chat-ai/TECH.md) — full chat route
- [feat-0011 TECH](../feat-0011-data-layer/TECH.md) — `getCaseStore`
- [feat-0012 TECH](../feat-0012-api-contracts/TECH.md) — Zod schemas
- [feat-0019 TECH](../feat-0019-api-errors-i18n/TECH.md) — adopt `apiErrorResponse` on Hono
- `.cursor/rules/chat-zola-prompt-kit.mdc` — no client BYOK; server env for models
