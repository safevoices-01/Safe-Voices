# React Email with Resend

## Packages

Typical installs (adjust for workspace package):

- `resend` — Resend Node.js SDK
- `@react-email/components` — layout and content primitives (`Html`, `Head`, `Body`, `Container`, `Text`, `Button`, `Img`, `Section`, `Row`, `Column`, `Tailwind`, etc.)

Optional:

- `react-email` — CLI (`email dev`, template tooling)
- `@react-email/render` — explicit HTML/plain-text rendering when you are not using the SDK `react` field

Confirm current package names and exports in npm and in https://react.email/docs/llms.txt (changelog, getting started).

## Two valid send paths

### 1. Resend SDK `react` field (recommended when using Resend)

The Resend Node SDK can render a React element server-side. You import your template component and pass it as `react`:

```tsx
import { Resend } from 'resend';
import { Email } from './email';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
    from: 'App <notifications@example.com>',
    to: 'user@example.com',
    subject: 'Hello',
    react: <Email url="https://example.com" />,
});
```

Documented at https://react.email/docs/integrations/resend.md (mirrors Resend’s send API docs for the `react` parameter).

### 2. `render()` then `html` / `text`

Use when you need the HTML string for logging, storage, multipart customisation, or a non-Resend transport:

- https://react.email/docs/utilities/render.md

Do not bundle email rendering into client components. Keep templates and `render` calls on the server.

## Resend dashboard templates + React Email

Resend supports team-editable templates hosted in the dashboard, optionally authored from React Email.

Workflow summary (see official pages for exact CLI flags):

1. `npx react-email@latest resend setup` — stores API key for CLI integration (treat like any secret; prefer env-based flows in CI).
2. Use the React Email dev UI to upload or bulk upload templates to Resend.
3. Send via API using the `template` object (`id` / alias + `variables`), not `html`/`react`/`text` in the same request.

References:

- https://react.email/docs/integrations/resend.md (Templates section)
- https://resend.com/docs/dashboard/templates/introduction.md

## Monorepo (pnpm)

Follow the dedicated workspace guide so `react-email` resolves templates and dependencies correctly:

- https://react.email/docs/getting-started/monorepo-setup/pnpm.md

## Email client compatibility

React Email components target table-based HTML compatible with major clients; still test critical templates in real inboxes or the preview tooling. Support matrix appears on https://react.email/docs/introduction.md
