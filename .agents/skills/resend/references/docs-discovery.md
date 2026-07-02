# Resend and React Email documentation discovery

## Indexes (start here)

| Resource                  | URL                               |
| ------------------------- | --------------------------------- |
| Resend full doc list      | https://resend.com/docs/llms.txt  |
| React Email full doc list | https://react.email/docs/llms.txt |

Each line in `llms.txt` is a title and a direct `.md` URL. Fetch the `.md` URL for the exact request schema, headers, and examples.

## Resend: high-traffic entry points

Use `llms.txt` search (or your editor) to jump to these slugs when relevant:

- **API overview**: `api-reference/introduction.md`, `api-reference/errors.md`, `api-reference/pagination.md`, `api-reference/rate-limit.md`
- **Send path**: `api-reference/emails/send-email.md`, `api-reference/emails/send-batch-emails.md`, `send-with-nodejs.md`, `send-with-nextjs.md`, `send-with-vercel-functions.md`, `send-with-supabase-edge-functions.md`
- **Domains and DNS**: `dashboard/domains/introduction.md`, dashboard DMARC/BIMI/tracking/region pages in the index
- **Webhooks**: `webhooks/introduction.md`, `webhooks/event-types.md`, `webhooks/verify-webhooks-requests.md`, `webhooks/retries-and-replays.md`, per-event pages under `webhooks/emails/`
- **Inbound / receiving**: `dashboard/receiving/introduction.md` and linked attachment, forward, reply pages
- **Templates (dashboard)**: `dashboard/templates/introduction.md`, `dashboard/templates/template-variables.md`
- **Supabase**: `knowledge-base/getting-started-with-resend-and-supabase.md`, `send-with-supabase-smtp.md`, `send-with-supabase-edge-functions.md`
- **Security and keys**: `security.md`, `knowledge-base/how-to-handle-api-keys.md`, API key CRUD under `api-reference/api-keys/`
- **Agent-oriented**: `resend-skill.md`, `react-email-skill.md`, `email-best-practices-skill.md`, `ai-onboarding.md` (Resend’s own short guides for tooling)

## React Email: high-traffic entry points

From https://react.email/docs/llms.txt:

- **Setup**: `getting-started/automatic-setup.md`, `getting-started/manual-setup.md`, `getting-started/migrating-to-react-email.md`, `getting-started/updating-react-email.md`
- **Monorepos**: `getting-started/monorepo-setup/pnpm.md` (and npm/yarn/bun siblings)
- **Render pipeline**: `utilities/render.md`, `integrations/overview.md`
- **Resend**: `integrations/resend.md`
- **Components**: `components/html.md`, `components/head.md`, `components/button.md`, `components/tailwind.md`, etc.
- **CLI and preview**: `cli.md`, `deployment.md` (preview server hosting)
- **Editor (embeddable UI)**: under `editor/` in the index if building visual editing

## Upstream source for React Email docs

The public site https://react.email/docs reflects the same content family as the React Email monorepo docs app (`react-email` on GitHub). When a page is missing or unclear, use `llms.txt` plus the published `.md` URLs rather than unversioned third-party summaries.
