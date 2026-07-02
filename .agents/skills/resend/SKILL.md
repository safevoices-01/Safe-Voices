---
name: resend
description: >-
    Guides Resend (email API) and React Email usage for transactional and product
    email in TypeScript/Node and Next.js. Covers the Node SDK (send, batch,
    templates, scheduling, tags, attachments), dashboard features (domains,
    webhooks, inbound, audiences), security (API keys, webhook verification,
    raw body), and React Email (components, render, CLI, monorepos). Use when the
    user mentions Resend, react-email, @react-email/components, transactional
    email, email webhooks, domain verification, Supabase Auth SMTP with Resend,
    or sending HTML/React templates from apps/web or packages/emails.
---

# Resend and React Email

## Authoritative documentation

Resend and React Email publish machine-readable doc indexes. Prefer these over training data; APIs and limits change.

- Resend index: https://resend.com/docs/llms.txt
- React Email index: https://react.email/docs/llms.txt

Workflow: open the relevant `llms.txt`, find the `.md` link for the topic, then fetch that page (or open in browser) for current parameters and examples.

For a curated map of topics and deep links, see [Docs discovery](references/docs-discovery.md).

## Monorepo alignment (this workspace)

Transactional email is scoped to product needs (see root `README.md`). Prefer `packages/emails` (or the package that owns templates) for React Email templates and shared send helpers; call Resend only from server contexts (API routes, server actions, workers, background jobs), never from client bundles.

Use `pnpm add` / `pnpm --filter <pkg> add` per package scope.

## Sending email (Node.js SDK)

Install: `resend` in the package that performs sends.

Pattern:

```ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
    from: 'App <notifications@verified.example.com>',
    to: ['user@example.com'],
    subject: 'Subject',
    html: '<p>...</p>',
});
```

Rules that frequently trip implementations:

- `from` must use a domain you have verified in Resend (or the documented onboarding domain for testing). See Resend knowledge base for `resend.dev` and domain mismatch errors.
- `to` supports up to 50 addresses per request for standard send (confirm in current [Send Email](https://resend.com/docs/api-reference/emails/send-email.md) docs).
- **Templates**: if you pass a `template` object (`id` + `variables`), you must not also send `html`, `text`, or `react`; the API rejects mixed payloads. Published templates only. Reserved variable names are documented on the send-email page.
- **React prop**: the Node SDK can accept a `react` element for the message body; that path is SDK-specific (not the HTTP JSON shape). See [React Email + Resend](references/react-email-integration.md).
- **Idempotency**: optional header for deduplication (see Resend dashboard docs on idempotency keys; parameters are on the send API page).

Batch send, schedule, attachments, inline images, custom headers, topics, and tags are all documented under the emails API and dashboard sections listed in `llms.txt`.

## Webhooks

Verify every inbound webhook using the signing secret and the **raw** request body string. Re-serializing parsed JSON breaks signatures. Resend documents `resend.webhooks.verify` for the Node SDK and Svix as the underlying verifier.

Details: [Sending, webhooks, inbound, deliverability](references/sending-webhooks-deliverability.md) and https://resend.com/docs/webhooks/verify-webhooks-requests.md

## React Email

Use `@react-email/components` for primitives. For local preview and publishing workflows, use the React Email CLI (`react-email` package) as documented at https://react.email/docs/cli.md

**Monorepos**: follow https://react.email/docs/getting-started/monorepo-setup/pnpm.md for pnpm workspaces.

Integration overview: https://react.email/docs/integrations/resend.md

When not using the Resend SDK `react` field (for example another provider or a custom pipeline), convert components to HTML with the `render` utility documented at https://react.email/docs/utilities/render.md

## Errors, limits, and deliverability

Use https://resend.com/docs/api-reference/errors.md and https://resend.com/docs/api-reference/rate-limit.md from the index. For bounces, suppressions, DMARC, and warm-up, follow the dashboard and knowledge-base entries in `llms.txt` rather than guessing.

## References

- [Docs discovery](references/docs-discovery.md) — how to navigate `llms.txt` and high-value entry points
- [React Email + Resend](references/react-email-integration.md) — templates, CLI, `react` prop vs `render`
- [Sending, webhooks, inbound, deliverability](references/sending-webhooks-deliverability.md) — operational checklist
