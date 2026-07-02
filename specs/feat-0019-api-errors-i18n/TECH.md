# feat-0019: Tech Spec — API errors and client translation

## Context

See [`PRODUCT.md`](./PRODUCT.md). Server helpers live in `apps/web/lib/api-errors.ts` (Next routes only today). Client translation in `translate-api-error.ts` and toasts in `api-toast.ts`.

## Module map

| Module | Role |
|--------|------|
| `apps/web/lib/api-errors.ts` | `API_ERROR_CODES`, `apiErrorResponse()` |
| `apps/web/lib/translate-api-error.ts` | `readApiErrorCode`, `translateApiError` |
| `apps/web/lib/api-toast.ts` | Toasts + `readJsonErrorMessage`, `fetchJsonWithToast` |
| `apps/web/messages/en.json` | `errors` namespace |
| `apps/web/messages/ar.json` | `errors` namespace (parity) |
| `apps/web/messages/key-parity.test.ts` | Ensures identical keys en/ar |

## API_ERROR_CODES

```ts
export const API_ERROR_CODES = {
    INVALID_JSON: 'INVALID_JSON',
    VERIFY_FAILED: 'VERIFY_FAILED',
    VERIFY_LOCKED: 'VERIFY_LOCKED',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    CASE_SUBMITTED: 'CASE_SUBMITTED',
    CASE_SUBMITTED_READONLY: 'CASE_SUBMITTED_READONLY',
    CASE_NOT_FOUND: 'CASE_NOT_FOUND',
    CHAT_TOO_MANY_MESSAGES: 'CHAT_TOO_MANY_MESSAGES',
    CHAT_MESSAGE_TOO_LARGE: 'CHAT_MESSAGE_TOO_LARGE',
    UPLOAD_UNSUPPORTED_TYPE: 'UPLOAD_UNSUPPORTED_TYPE',
    UPLOAD_NOT_CONFIGURED: 'UPLOAD_NOT_CONFIGURED',
    CHAT_DISABLED: 'CHAT_DISABLED',
} as const;
```

## apiErrorResponse

```ts
export function apiErrorResponse(
    code: ApiErrorCode,
    status: number,
    logMessage?: string,
): Response {
    return Response.json(
        { code, error: logMessage ?? code },
        { status },
    );
}
```

## Route usage (Next.js)

| Route | Codes used |
|-------|------------|
| `apps/web/app/api/cases/verify/route.ts` | `INVALID_JSON`, `VERIFY_FAILED`, `VERIFY_LOCKED` |
| `apps/web/app/api/cases/[caseId]/chat/route.ts` | `SESSION_EXPIRED`, `CASE_SUBMITTED_READONLY`, `INVALID_JSON`, `CHAT_TOO_MANY_MESSAGES`, `CHAT_MESSAGE_TOO_LARGE` |

Other case routes (`submit`, `upload`, `messages`) should use the same helper when returning errors ([feat-0009](../feat-0009-case-submit-lifecycle/TECH.md), [feat-0010](../feat-0010-evidence-upload-storage/TECH.md)).

**Demo chat** (`apps/web/app/api/chat/route.ts`) returns `{ error: string }` **without** `code` — demo-only gap.

## translateApiError

```ts
export function translateApiError(
    tErrors: (key: string) => string,
    body: unknown,
    fallback?: string,
): string {
    const code = readApiErrorCode(body);
    if (code) {
        return tErrors(code);
    }
    return readJsonErrorMessage(body) ?? fallback ?? tErrors('INVALID_JSON');
}
```

`readApiErrorCode` whitelists against the same string set as `API_ERROR_CODES` (duplicated array in `translate-api-error.ts` — keep in sync when adding codes).

## Client consumers

| Component / page | Pattern |
|------------------|---------|
| `components/auth/case-access-flow.tsx` | `useTranslations('errors')` + `translateApiError` on verify |
| `app/[locale]/chat/page.tsx` | `translateApiError` + `toastApiError` on submit failure |

Example (access):

```ts
const tErrors = useTranslations('errors');
setError(translateApiError(tErrors, json, t('verifyFailed')));
```

## api-toast

| Export | Behavior |
|--------|----------|
| `toastApiError` | `toastManager.add({ type: 'error', title, description? })` |
| `toastApiSuccess` | Success variant |
| `readJsonErrorMessage` | Reads `body.error` string |
| `toastFromResponse` | Non-OK → toast with status + detail |
| `fetchJsonWithToast` | fetch + JSON parse + toast on failure |
| `runWithApiToast` | `toastManager.promise` wrapper |

Depends on `@safevoices/ui/components/toast`.

## i18n keys (excerpt)

```json
"errors": {
  "VERIFY_FAILED": "We could not verify those credentials.",
  "VERIFY_LOCKED": "Too many attempts...",
  "SESSION_EXPIRED": "Session expired...",
  ...
}
```

Arabic mirror in `ar.json`. Keys must match code strings exactly.

## Adding a new code (checklist)

1. Add to `API_ERROR_CODES` in `api-errors.ts`.
2. Add to `ERROR_CODES` set in `translate-api-error.ts`.
3. Add `errors.NEW_CODE` to `en.json` and `ar.json`.
4. Return via `apiErrorResponse` from route(s).
5. Run `pnpm --filter @safevoices/web run test` (key parity).

## Testing

```bash
pnpm --filter @safevoices/web run test
# key-parity.test.ts — en/ar errors keys match
```

Manual: trigger verify failure in `/access` with both locales.

## Known gaps

| Gap | Location |
|-----|----------|
| Hono plain errors | `apps/api/src/server.ts` |
| Demo `/api/chat` no code | `apps/web/app/api/chat/route.ts` |
| Duplicate code list | `api-errors.ts` vs `translate-api-error.ts` |
| Codes not in shared package | Web-only; Hono cannot import without move |

**Target:** export codes + `apiErrorResponse` from `@safevoices/trpc` or small `@safevoices/api-errors` package.

## Related

- [feat-0016 TECH](../feat-0016-hono-standalone-api/TECH.md)
- [feat-0012 TECH](../feat-0012-api-contracts/TECH.md)
- `packages/ui/src/components/ui/toast.tsx`
