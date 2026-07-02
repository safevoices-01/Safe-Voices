# feat-0027: Demo and reporting chat routes — TECH

See [PRODUCT.md](./PRODUCT.md).

## Route map

| Path | Page module | Mode |
|------|-------------|------|
| `app/[locale]/demo/page.tsx` | Demo chat | `demo` |
| `app/[locale]/chat/page.tsx` | Reporting chat | `reporting` |
| `components/chat/chat-experience.tsx` | Shared client shell | `mode` prop |

Layouts: `demo/layout.tsx` and `chat/layout.tsx` (metadata URLs `/demo` and `/chat`).

## Middleware (`apps/web/middleware.ts`)

| Change | Behavior |
|--------|----------|
| `LOCALELESS_PATHS` | Add `/demo` |
| `config.matcher` | Add `/demo` |
| `/chat` without `caseId` | Redirect to `/{locale}/access` |
| `/chat?caseId=…` without session | Unchanged (feat-0002) |

## Link updates

| File | Old | New |
|------|-----|-----|
| `components/site-header.tsx` | `/chat` | `/demo` |
| `components/site-footer.tsx` | `/chat` | `/demo` |
| `app/[locale]/(marketing)/documentation/page.tsx` | `/chat` | `/demo` |
| `components/error-section.tsx` | `/chat` | `/demo` |
| `components/auth/case-access-flow.tsx` | `/chat?caseId=…` | unchanged |

## i18n

New `demo` namespace in `messages/en.json` and `messages/ar.json`:

- `welcome`, `suggestion1`–`suggestion4`, `demoBanner`, `navLabel`, `messagePlaceholder`

Reporting copy stays under `chat.*`.

## APIs (unchanged)

| Mode | Endpoint |
|------|----------|
| Demo | `POST /api/chat` |
| Reporting | `POST /api/cases/:caseId/chat` |

## Tests

| Test | Command |
|------|---------|
| Key parity | `pnpm --filter @safevoices/web test messages/key-parity` |
| E2E demo | `apps/web/e2e/demo-chat.spec.ts` |
| E2E reporter | existing `reporter-submit.spec.ts`, `reporter-upload.spec.ts` |

## Gaps

None for routing split. Reporting behavior gaps remain in feat-0008 / feat-0026.
