# feat-0004: Documentation hub

## Summary

The **documentation hub** at `/{locale}/documentation` delivers **static, English-only** product documentation: table of contents, anchored sections (getting started, anonymous reporting, tracking, administrators, platform features, security, testing workflows, FAQ), and links back to home and chat. It shares the **marketing layout** (header/footer) with the landing page ([feat-0003](../feat-0003-marketing-landing/PRODUCT.md)). Chrome (header labels, language switcher) follows the active locale ([feat-0001](../feat-0001-i18n/PRODUCT.md)); **article body is not translated**.

**Status:** Complete (English content).

## Problem

Reporters and administrators need structured reference material beyond the AI chat: policies, statuses, testing steps, and security posture. Scattering this in chat prompts or external PDFs makes onboarding inconsistent and hard to audit.

## Non-goals

- MDX or CMS-driven docs site.
- Arabic (or other) translation of doc sections ([feat-0001](../feat-0001-i18n/PRODUCT.md)).
- Versioned docs per tenant.
- Auto-generated API reference ([feat-0012](../feat-0012-api-contracts/PRODUCT.md) is separate).
- In-app contextual help overlays.
- Search or Algolia index.

## Actors

| Actor | Description |
|-------|-------------|
| **Reporter** | Reads getting started, anonymous reporting, tracking, FAQ. |
| **Administrator** | Reads admin, security, testing workflows sections. |
| **Visitor** | Arrives from landing announcement pill or footer. |
| **QA** | Uses testing workflows section for manual scripts. |

## Use case catalog

### A. Entry and navigation

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Open documentation | User navigates to `/{locale}/documentation` | Page renders with TOC sidebar | All sections in DOM |
| **UC-A02** | Localeless URL | User opens `/documentation` | Middleware → `/{locale}/documentation` ([feat-0002](../feat-0002-middleware-routing/PRODUCT.md)) | Prefixed URL |
| **UC-A03** | Back to home | Header logo or "Back to home" button | Navigate to `/` | Marketing home |
| **UC-A04** | Open AI chat | Header or page "Open AI chat" | `/chat` | Demo/general chat |
| **UC-A05** | Deep link anchor | URL with hash e.g. `#platform-features` | Scroll to section (`scroll-mt-24`) | Section visible below sticky header |

### B. Table of contents

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | TOC sticky nav | Desktop viewport | Aside `sticky top-20` | Section links visible while scrolling |
| **UC-B11** | TOC jump | Click TOC item | In-page `#anchor` navigation | Focus/scroll to section |
| **UC-B12** | TOC coverage | All major sections | 8 entries: getting-started through faq | Matches `toc` const in page |

### C. Content sections

| ID | Section ID | Audience | Key content |
|----|------------|----------|-------------|
| **UC-C01** | `getting-started` | Reporter | AI assistant link, tracking code, triage timeline |
| **UC-C02** | `anonymous-reporting` | Reporter | Submit steps, privacy bullets |
| **UC-C03** | `tracking-your-case` | Reporter | Tracking code usage, status definitions |
| **UC-C04** | `for-administrators` | Admin | Dashboard, case management, team collaboration |
| **UC-C05** | `platform-features` | All | Categories, capabilities list |
| **UC-C06** | `security-privacy` | All | Encryption, access controls, compliance note |
| **UC-C07** | `testing-workflows` | QA | Reporter and staff test scripts |
| **UC-C08** | `faq` | All | Anonymity, timelines, lost code |

### D. Cross-links

| ID | Use case | Target |
|----|----------|--------|
| **UC-D20** | Landing announcement | `/documentation#platform-features` ([feat-0003](../feat-0003-marketing-landing/PRODUCT.md)) |
| **UC-D21** | Footer trust link | `/documentation#security-privacy` |
| **UC-D22** | Inline chat links | `/chat` (locale via redirect) |

### E. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-E40** | `/ar/documentation` — Arabic header, English article body |
| **UC-E41** | Invalid hash — no error; page top |
| **UC-E42** | Mobile — TOC above article (column layout) |

## Behavior rules

1. **Single page:** All content in one Server Component; no pagination.

2. **Language:** Body copy is **English only**; not loaded from `messages/*.json`.

3. **Links:** Page uses `next/link` for `/`, `/chat` — not `i18n/navigation` (locale dropped until middleware).

4. **Layout:** Inherits marketing header/footer; documentation-specific `layout.tsx` only sets metadata.

5. **Anchors:** Section `id` matches TOC; `scroll-mt-24` offsets sticky site header.

6. **Metadata:** Title "Documentation"; description in `documentation/layout.tsx`.

## What's needed to make it work

| Requirement | Who | Notes |
|-------------|-----|-------|
| Route `app/[locale]/(marketing)/documentation/page.tsx` | Engineering | Static JSX content |
| Marketing layout wrapper | Engineering | Shared chrome |
| Middleware localeless redirect for `/documentation` | Engineering | [feat-0002](../feat-0002-middleware-routing/PRODUCT.md) |
| Legal/compliance review of security copy | Stakeholders | Organizational; text is product marketing |
| Future: `docs` namespace in messages or MDX | Engineering / translation | For Arabic parity |
| Chat and access flows live for linked journeys | Engineering | [feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md), [feat-0007](../feat-0007-general-ai-chat/PRODUCT.md) |

## Implementation status

| Area | Status |
|------|--------|
| Static documentation page (EN) | Complete |
| TOC and anchored sections | Complete |
| Marketing chrome | Complete |
| Page metadata | Complete |
| i18n for doc body | Not started |
| Locale-aware in-page links | Partial (middleware fallback) |

## Acceptance criteria

1. `GET /en/documentation` returns 200 with title "Safe Voices documentation".
2. All eight TOC entries scroll to matching sections.
3. "Back to home" and header logo reach marketing home.
4. "Open AI chat" reaches chat route.
5. `#security-privacy` and `#platform-features` deep links work from external pages.
6. Page included in middleware matcher for localeless `/documentation`.
7. Arabic locale shows translated header strings from `common.*` while body remains English.

## Related

- [feat-0001 PRODUCT](../feat-0001-i18n/PRODUCT.md) — locale chrome, RTL
- [feat-0002 PRODUCT](../feat-0002-middleware-routing/PRODUCT.md) — `/documentation` redirect
- [feat-0003 PRODUCT](../feat-0003-marketing-landing/PRODUCT.md) — shared layout, inbound links
- [feat-0005 PRODUCT](../feat-0005-anonymous-case-access/PRODUCT.md) — reporting flow referenced in copy
- [feat-0018 PRODUCT](../feat-0018-seo-pwa-metadata/PRODUCT.md) — documentation metadata
- `apps/web/app/[locale]/(marketing)/documentation/`
