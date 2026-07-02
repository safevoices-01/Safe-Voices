# Sending operations, webhooks, inbound, deliverability

## Batch and scheduling

- Batch API: see `api-reference/emails/send-batch-emails.md` in https://resend.com/docs/llms.txt (caps and payload shape).
- Scheduling: `scheduled_at` / natural language behaviour is documented on `api-reference/emails/send-email.md` and dashboard `dashboard/emails/schedule-email.md`. Updating or cancelling scheduled messages has dedicated endpoints (`update-email`, `cancel-email`).

## Attachments and inline images

- Size limits, Base64/buffer conventions, and `content_id` for inline images: `api-reference/emails/send-email.md` and `dashboard/emails/attachments.md`, `dashboard/emails/embed-inline-images.md`.
- Unsupported attachment types: `knowledge-base/what-attachment-types-are-not-supported.md`.

## Tags, metadata, topics

- Tags for operational filtering: `dashboard/emails/tags.md` and send API field descriptions.
- Topics and contact subscription rules: `dashboard/topics/introduction.md`, `api-reference/topics/*.md`, and send API `topic` / topic subscription notes on `send-email.md`.

## Webhook verification (required)

1. Read the raw body as a string (`req.text()` in Next.js App Router, or equivalent).
2. Pass Svix headers (`svix-id`, `svix-timestamp`, `svix-signature`) and your endpoint signing secret to `resend.webhooks.verify` or to Svix’s `Webhook#verify`.
3. Return 400 on failure; handle duplicates idempotently where replays occur.

Canonical doc: https://resend.com/docs/webhooks/verify-webhooks-requests.md

Event catalogue: https://resend.com/docs/webhooks/event-types.md

Retries and replays: https://resend.com/docs/webhooks/retries-and-replays.md

## Inbound email (receive)

Receiving uses Resend inbound + webhooks (`email.received` and related). Read:

- `dashboard/receiving/introduction.md`
- `knowledge-base/how-can-i-receive-emails-with-resend.md`
- Attachment and forwarding guides linked from the receiving section in `llms.txt`

## Deliverability and compliance

Prefer indexed articles over assumptions:

- Bounces and suppressions: `dashboard/emails/email-bounces.md`, `dashboard/emails/email-suppressions.md`, `knowledge-base/why-are-my-emails-landing-on-the-suppression-list.md`
- Consent and unsubscribe expectations: `knowledge-base/what-counts-as-email-consent.md`, `knowledge-base/should-i-add-an-unsubscribe-link.md`
- Gmail / Outlook placement: respective knowledge-base articles
- Domain warm-up: `knowledge-base/warming-up.md`
- Multi-tenant SaaS: `knowledge-base/setting-up-resend-for-multi-tenants.md`

## HTTP and SDK footguns

- **User-Agent**: some environments get `403` with code `1010` if `User-Agent` is missing; see `knowledge-base/403-error-1010.md`.
- **CORS**: do not call Resend from browsers with the API key; send from server. See `knowledge-base/how-do-i-fix-cors-issues.md`.
- **Rate limits and quotas**: `api-reference/rate-limit.md`, `knowledge-base/account-quotas-and-limits.md`.
