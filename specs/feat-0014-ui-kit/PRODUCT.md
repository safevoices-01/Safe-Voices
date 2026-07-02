# feat-0014: UI kit and chat primitives

## Summary

**Safe Voices** ships a shared design system in `@safevoices/ui` built on **COSS** patterns ([Base UI](https://base-ui.com/) primitives + Tailwind). Beyond generic form and layout components, the kit includes **reporting-specific primitives**: chat shell, message bubbles, prompt composer, crisis escalation, intake progress, one-time secret display, and verify lockout messaging.

**Status: Complete** for library components; consuming apps wire i18n labels and data. Primary consumer is `apps/web` (access flow, reporting chat, marketing shells).

Complements [feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md), [feat-0008](../feat-0008-reporting-chat-ai/PRODUCT.md), [feat-0001](../feat-0001-i18n/PRODUCT.md) (RTL / labels), and [feat-0019](../feat-0019-api-errors-i18n/PRODUCT.md) (error display).

## Problem

Reporting UX needs consistent, accessible chat and safety UI across locales. Duplicating markup in every page risks drift (lockout copy, crisis panel, progress fields). A documented kit clarifies which components exist, where they are used, and what product behavior they support.

## Non-goals

- Application routing or data fetching (lives in `apps/web`).
- Figma-to-code pipeline automation.
- Non-React consumers.
- Investigator dashboard tables ([feat-0015](../feat-0015-investigator-dashboard/PRODUCT.md) uses only `Button` today).
- BYOK or client-side model keys (server-only AI per project rules).

## Actors

| Actor | Description |
|-------|-------------|
| **Reporter** | Sees chat, secret card, lockout, crisis panel, progress. |
| **Web engineer** | Imports from `@safevoices/ui/components/*`. |
| **Designer** | Extends tokens via Tailwind + `components.json`. |
| **Translator** | Passes `labels` overrides into i18n-aware wrappers in web. |

## Component catalog

### COSS primitives (representative)

Accordion, Alert, Button, Card, Dialog, Field, Form, Input, Input OTP, Select, Tabs, Toast, Tooltip, Table, Sidebar, and 40+ others — see `packages/ui/src/components/index.ts`.

### Reporting / chat primitives (feat scope)

| Component | Product role |
|-----------|--------------|
| **ChatContainer** | Scrollable log (`role="log"`), stick-to-bottom behavior |
| **Message** | Avatar + content row; optional markdown |
| **PromptInput** | Composer with loading lock, actions slot, auto-resize textarea |
| **CrisisEscalationPanel** | Safety resources alert (`role="alert"`) |
| **ReportingProgress** | Intake field checklist + percent bar |
| **ShowOnceSecretCard** | One-time credentials + ack checkbox + copy |
| **LockoutNotice** | Verify failure / lockout alert styling |
| **SafetyNotice** | General safety copy on access flow |
| **Loader** | Streaming / waiting indicator in chat |
| **CodeBlock** | Documentation code samples |

## Use case catalog

### A. Anonymous access (feat-0005)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-A01** | Show new case credentials | Case created | `ShowOnceSecretCard` with `caseId`, `secret` | User must ack before continue |
| **UC-A02** | Copy credentials | Card visible | Copy button | Clipboard has case id + secret |
| **UC-A03** | Lockout message | Verify locked | `LockoutNotice` with translated error | Destructive alert visible |
| **UC-A04** | Safety preamble | Access page | `SafetyNotice` | Context before credential entry |

### B. Reporting chat (feat-0008)

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-B10** | Chat scroll region | Messages loaded | `ChatContainerRoot` + `Content` + `ScrollAnchor` | New messages stay in view |
| **UC-B11** | Render turns | Streaming or history | `Message` + `MessageContent` | User vs assistant styling |
| **UC-B12** | Compose message | Session active; not submitted | `PromptInput` + textarea + actions | Submit on action; disabled when loading |
| **UC-B13** | Lock input while streaming | `isLoading` + `lockInputWhileLoading` | Type during stream | Textarea disabled per prop |
| **UC-B14** | Markdown assistant text | `markdown` on content | Render via `Markdown` | GFM prose in bubble |

### C. Intake progress and crisis

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-C20** | Show intake progress | Extraction fields from API | `ReportingProgress` | Percent + field chips update |
| **UC-C21** | Localized field labels | Web passes `fieldLabels` | Progress component | Arabic / English labels |
| **UC-C22** | Crisis escalation | `crisisTriggered` from chat | `CrisisEscalationPanel` + resources | Alert with helpline links |
| **UC-C23** | Dismiss crisis panel | User continues | Web state hides panel | Panel unmounted |

### D. Global chrome

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-D30** | Toast on API error | `api-toast.ts` | `toastManager` from Toast | User sees translated error |
| **UC-D31** | Marketing CTA | Landing page | `Button` + Link | Consistent variant styles |
| **UC-D32** | OTP entry | Partner auth | `InputOTP` + `Card` | Accessible OTP slots |

### E. Accessibility and i18n

| ID | Use case | Expected behavior |
|----|----------|-------------------|
| **UC-E40** | Chat log | `ChatContainerRoot` exposes `role="log"` |
| **UC-E41** | Crisis panel | `aria-labelledby` on title |
| **UC-E42** | Progress bar | `role="progressbar"` with aria values |
| **UC-E43** | RTL locales | `ltr-embed` on monospace credentials in secret card |
| **UC-E44** | Label overrides | All reporting primitives accept partial `labels` props |

### F. Negative and edge cases

| ID | Expected behavior |
|----|-------------------|
| **UC-F50** | `ShowOnceSecretCard` continue disabled until ack checked |
| **UC-F51** | `PromptInput` disabled prop blocks focus click |
| **UC-F52** | Empty `resources` in crisis panel → header only |
| **UC-F53** | `ReportingProgress` 0% when no fields filled |

## Behavior (product rules)

1. **Primitives are presentational** — no fetch, no cookies; web passes data and handlers.

2. **Default English copy** in components; production must pass translated `labels` from `messages/*.json`.

3. **Crisis panel** is informational, not a substitute for emergency services — copy states user can pause conversation.

4. **Show-once secret** enforces acknowledgment checkbox before navigation ([feat-0005](../feat-0005-anonymous-case-access/PRODUCT.md)).

5. **COSS composition** — overlays use trigger-based patterns per `.agents/skills/coss/SKILL.md`.

6. **Brand accent** on progress bar uses `#067a6f` (Safe Voices teal).

## Acceptance criteria

| # | Criterion |
|---|-----------|
| AC-1 | All seven reporting primitives exported from `@safevoices/ui/components`. |
| AC-2 | `apps/web` chat page uses ChatContainer, Message, PromptInput. |
| AC-3 | `case-access-flow` uses ShowOnceSecretCard and LockoutNotice. |
| AC-4 | `reporting-chat-extras` uses CrisisEscalationPanel and ReportingProgress. |
| AC-5 | Package typechecks without React app peer missing. |

## What's needed to make it work

| Requirement | Notes |
|-------------|-------|
| `@safevoices/ui` workspace dependency | In `apps/web/package.json` |
| Import `@safevoices/ui/styles.css` | In web app layout / globals |
| Tailwind v4 + PostCSS in consumer | Scan UI package for classes |
| Pass i18n `labels` from web | Do not rely on English defaults in production |
| Crisis resource URLs | Configure per locale in web (`reporting-chat-extras.tsx`) |
| `use-stick-to-bottom` | Dependency of chat-container |
| Peer `react` / `react-dom` ^19 | Match monorepo versions |

## Open questions

1. Move all default strings out of UI into web only? **Default:** keep defaults for Storybook; web overrides in prod.

2. Shared Storybook for UI package? **Default:** later.

3. Dark mode tokens for crisis panel amber? **Default:** follow global theme when added.

## Related

- [feat-0001 PRODUCT](../feat-0001-i18n/PRODUCT.md)
- [feat-0005 PRODUCT](../feat-0005-anonymous-case-access/PRODUCT.md)
- [feat-0008 PRODUCT](../feat-0008-reporting-chat-ai/PRODUCT.md)
- COSS skill: `.agents/skills/coss/SKILL.md`
- `packages/ui/README.md`
