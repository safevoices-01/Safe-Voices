# feat-0013: Tech Spec — Transactional email (Resend)

## Context

See [`PRODUCT.md`](./PRODUCT.md). Package `@safevoices/emails` implements Resend sends via `fetch` — no Resend Node SDK dependency. All send functions are **library-only**; grep shows **no imports** outside `packages/emails/src/index.ts`.

## Stack

| Piece | Choice |
|-------|--------|
| Provider | Resend REST `POST https://api.resend.com/emails` |
| Auth | `Authorization: Bearer ${RESEND_API_KEY}` |
| Templates | Inline HTML strings (no `@react-email/components` yet) |
| Transport | Native `fetch` (Node 22+) |

## API surface (`packages/emails/src/index.ts`)

### `getEmailProvider()`

Returns `'resend'` (placeholder for future multi-provider).

### `sendTransactionalEmail(input)`

```ts
type SendEmailInput = { to: string; subject: string; html: string };
// Returns: { ok: boolean; id?: string; error?: string }
```

Flow:

1. Read `RESEND_API_KEY`; if missing → `{ ok: false, error: 'RESEND_API_KEY not configured' }`.
2. `from = process.env.EMAIL_FROM ?? 'noreply@thesafevoices.org'`.
3. POST JSON `{ from, to, subject, html }` to Resend.
4. On `!res.ok` → `{ ok: false, error: 'Resend error ${status}' }`.
5. On success → `{ ok: true, id: json.id }`.

### `sendCaseReceivedEmail({ to, caseId })`

- Subject: `Safe Voices: report received`
- HTML: paragraph with bold `caseId`
- Returns `{ ok: result.ok }` (drops Resend `id`)

### `sendPartnerOtpEmail({ to, code })`

- Subject: `Safe Voices partner sign-in code`
- HTML: code in `<strong>`; copy says 10-minute expiry
- Returns `{ ok: result.ok }`

## Environment

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `RESEND_API_KEY` | Yes (to send) | — | Resend API authentication |
| `EMAIL_FROM` | No | `noreply@thesafevoices.org` | From header |

Load via consuming app's env (Next.js `.env.local`, API `.env`). Package does not load dotenv.

## Module map

| File | Role |
|------|------|
| `packages/emails/src/index.ts` | All exports |
| `packages/emails/package.json` | No runtime deps (fetch only) |

## Integration points (not wired)

| Call site (target) | Function | Current behavior |
|--------------------|----------|------------------|
| `apps/web/app/api/cases/[caseId]/submit/route.ts` | `sendCaseReceivedEmail` | No email call |
| Partner OTP API (future) | `sendPartnerOtpEmail` | `apps/web/lib/auth-otp-mock.ts` logs code |
| `apps/web/hooks/use-email-otp-auth.ts` | — | Client mock flow only |

Dashboard placeholder mentions Resend notifications (`apps/web/app/[locale]/dashboard/page.tsx`) — no implementation.

## Implementation status

| Item | Status |
|------|--------|
| Resend HTTP send | Complete |
| `sendCaseReceivedEmail` | Complete (library) |
| `sendPartnerOtpEmail` | Complete (library) |
| Submit integration | **Not done** |
| OTP integration | **Not done** |
| React Email templates | **Not done** |
| Webhook verification | **Not done** |
| Unit tests with mocked fetch | **Not done** |

## Known gaps

| Gap | Risk |
|-----|------|
| Unescaped `caseId` / `code` in HTML | XSS if values ever user-controlled in template |
| No retry on 5xx | Transient delivery failure |
| No `reply_to` / tags / metadata | Harder to trace in Resend dashboard |
| Default from domain may be unverified | Dev sends fail or spam in prod |
| No `@safevoices/emails` in web `package.json` deps yet | Must add workspace dep before import |

## What's needed to make it work

| Step | Action |
|------|--------|
| 1 | Create Resend account; verify `thesafevoices.org` (or production domain) |
| 2 | Set `RESEND_API_KEY` and `EMAIL_FROM` in deployment secrets |
| 3 | Add `"@safevoices/emails": "workspace:*"` to `apps/web/package.json` (and API if needed) |
| 4 | Import and call from submit handler (fire-and-forget with error log) |
| 5 | Replace `auth-otp-mock.ts` server path with `sendPartnerOtpEmail` |
| 6 | Add React Email templates per `.agents/skills/resend/SKILL.md` |
| 7 | Add `node --test` with mocked `global.fetch` for send helpers |
| 8 | Configure Resend webhook for bounces (optional) |

## Commands

```bash
pnpm --filter @safevoices/emails run typecheck
```

Manual send (Node REPL or script) with env loaded:

```bash
RESEND_API_KEY=re_xxx node -e "
  import { sendPartnerOtpEmail } from './packages/emails/src/index.ts';
  const r = await sendPartnerOtpEmail({ to: 'you@example.com', code: '123456' });
  console.log(r);
"
```

## Testing

| Case | Status |
|------|--------|
| Package typecheck | CI |
| Integration with Resend | Manual with test API key |
| Automated fetch mock | Gap |

## Related

- [feat-0006 TECH](../feat-0006-email-otp-partner-auth/TECH.md)
- [feat-0009 TECH](../feat-0009-case-submit-lifecycle/TECH.md)
- [feat-0015 TECH](../feat-0015-investigator-dashboard/TECH.md)
- `.agents/skills/resend/SKILL.md`
