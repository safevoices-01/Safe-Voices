# feat-0025: Tech Spec — Testing and release

## Context

See [`PRODUCT.md`](./PRODUCT.md). Documents existing tests and target E2E/CI additions.

## Existing test files

| Package | File | Covers |
|---------|------|--------|
| `apps/web` | `components/auth/case-access-flow.test.ts` | Access state machine |
| `apps/web` | `components/auth/email-otp-flow.test.ts` | OTP UI (mock) |
| `apps/web` | `messages/key-parity.test.ts` | en/ar keys |
| `packages/ai` | `src/reporting.test.ts` | Crisis keywords, locale |
| `apps/web` | `vitest.config.ts`, `vitest.setup.ts` | next-intl mocks |

Run:

```bash
pnpm --filter @safevoices/web test
pnpm --filter @safevoices/ai test
```

## Target Playwright setup

```
apps/web/
  playwright.config.ts
  e2e/
    reporter-access.spec.ts
    reporter-chat.spec.ts
    locale-ar.spec.ts
```

### Config sketch

```ts
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### AI in E2E

Mock `POST /api/cases/:id/chat` with fixture stream or set `OPENAI_API_KEY` skip + stub route in test.

## CI workflow (target diff)

```yaml
# .github/workflows/ci.yml — additions
- run: pnpm lint
- run: pnpm --filter @safevoices/web build
- run: pnpm --filter @safevoices/web exec playwright install --with-deps chromium
- run: pnpm --filter @safevoices/web exec playwright test
  env:
    CI: true
```

## Package scripts (target)

```json
// apps/web/package.json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0"
  }
}
```

## Integration test patterns

API route tests colocated or under `apps/web/app/api/**/*.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('POST /api/cases/session', () => {
  it('returns tracking code', async () => {
    const res = await fetch('http://localhost:3000/api/cases/session', {
      method: 'POST',
    });
    expect(res.status).toBe(200);
  });
});
```

Use `@safevoices/testing` fixtures for case creation.

## Changesets

| Path | Role |
|------|------|
| `.changeset/config.json` | Monorepo versioning |
| `.changeset/*.md` | Per-PR notes |

Web app may deploy without npm publish; changesets still useful for `@safevoices/ui`, `@safevoices/ai`.

## Deploy (restore target)

Deleted: `.github/workflows/deploy.yml` ([feat-0020](../feat-0020-ci-deployment/TECH.md)).

Target: Vercel project linked to `apps/web` or workflow:

```yaml
# deploy.yml (target)
on:
  push:
    branches: [main]
jobs:
  deploy:
    needs: check
    # vercel deploy --prod
```

## Gap index

Maintain [`../SPEC_GAPS.md`](../SPEC_GAPS.md) when closing items.

## Related

- [feat-0025 PRODUCT](./PRODUCT.md)
- [feat-0020 TECH](../feat-0020-ci-deployment/TECH.md)
