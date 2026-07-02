# feat-0014: Tech Spec — UI kit and chat primitives

## Context

See [`PRODUCT.md`](./PRODUCT.md). Package `@safevoices/ui` is a React 19 component library. Primitives follow **COSS** conventions (`@base-ui/react`, `class-variance-authority`, `tailwind-merge`). Path alias `@/` inside the package resolves to `packages/ui/src`.

## Stack

| Piece | Choice |
|-------|--------|
| Primitives | `@base-ui/react` 1.x (COSS) |
| Styling | Tailwind CSS 4.x, `clsx`, `cva` |
| Chat scroll | `use-stick-to-bottom` |
| Markdown | `react-markdown`, `remark-gfm`, `shiki` (code-block) |
| Icons | `lucide-react` |
| OTP | `input-otp` |

## Package exports (`package.json`)

```json
{
  ".": "./src/index.ts",
  "./components": "./src/components/index.ts",
  "./styles.css": "./src/styles.css",
  "./lib/utils": "./src/lib/utils.ts",
  "./components/*": "./src/components/ui/*.tsx"
}
```

Web imports deep paths, e.g. `@safevoices/ui/components/chat-container`.

## Reporting primitives — implementation

### ChatContainer (`chat-container.tsx`)

| Export | Behavior |
|--------|----------|
| `ChatContainerRoot` | `StickToBottom` wrapper, `role="log"`, overflow scroll |
| `ChatContainerContent` | `StickToBottom.Content` flex column |
| `ChatContainerScrollAnchor` | Bottom anchor for auto-scroll |

Client component (`"use client"`).

### Message (`message.tsx`)

| Export | Props highlight |
|--------|-----------------|
| `Message` | Flex row gap-3 |
| `MessageAvatar` | Wraps `Avatar` / `AvatarImage` / `AvatarFallback` |
| `MessageContent` | `markdown?: boolean` → `Markdown` or plain `div` |
| `MessageActions` | Action row slot |
| `MessageAction` | Tooltip-wrapped icon button |

### PromptInput (`prompt-input.tsx`)

Context-driven composer:

| Export | Role |
|--------|------|
| `PromptInput` | Provider: `value`, `isLoading`, `disabled`, `lockInputWhileLoading`, `onSubmit` |
| `PromptInputTextarea` | Auto-resize, Enter to submit (shift+enter newline) |
| `PromptInputActions` | Toolbar row |
| `PromptInputAction` | Icon button with tooltip |

Client component.

### CrisisEscalationPanel (`crisis-escalation-panel.tsx`)

- Props: `resources: CrisisResource[]`, optional `labels` partial override
- `role="alert"`, amber border/background
- Resources: `label`, `detail`, optional `url` with external link

### ReportingProgress (`reporting-progress.tsx`)

- Props: `fields`, `fieldKeys`, optional `title`, `fieldLabels`, `notedLabel`
- Computes fill percent from non-empty string values
- Default keys: `incidentDescription`, `location`, `occurredAt`, `attachments`, `riskLevel`

### ShowOnceSecretCard (`show-once-secret-card.tsx`)

Client component:

- Props: `caseId`, `secret`, `acknowledged`, `onAcknowledgedChange`, `onContinue`, `busy`, `labels`
- Copy both credentials via `navigator.clipboard`
- Continue disabled until checkbox ack

### LockoutNotice (`lockout-notice.tsx`)

- Simple `role="alert"` destructive-styled container for children (translated message from parent)

### Related (access flow)

| Component | File |
|-----------|------|
| `SafetyNotice` | `safety-notice.tsx` |
| `Loader` | `loader.tsx` |

## Web consumer map

| Web module | UI imports |
|------------|------------|
| `apps/web/app/[locale]/chat/page.tsx` | ChatContainer*, Message*, PromptInput*, Loader, Avatar, Button |
| `apps/web/components/auth/case-access-flow.tsx` | ShowOnceSecretCard, LockoutNotice, SafetyNotice, Button, Input |
| `apps/web/components/chat/reporting-chat-extras.tsx` | CrisisEscalationPanel, ReportingProgress, Button |
| `apps/web/components/auth/otp-form.tsx` | InputOTP, Card, Alert, Field |
| `apps/web/components/web-providers.tsx` | ToastProvider |
| `apps/web/lib/api-toast.ts` | toastManager |

## COSS primitives barrel

Full list in `packages/ui/src/components/index.ts` (60+ exports). Generated/maintained per `packages/ui/components.json` and `.agents/skills/coss/`.

## Styling integration (web)

- `apps/web/app/globals.css` — app tokens + `@import` UI styles
- Tailwind must include UI package paths in content scan (`apps/web/postcss.config.mjs`, `next.config.ts`)

## Implementation status

| Area | Status |
|------|--------|
| COSS primitives | Complete |
| Reporting primitives | Complete |
| Used in web reporting path | Complete |
| Storybook | Not in repo |
| Unit tests in UI package | Minimal (`node --test` placeholder) |
| Dark mode variants | Partial |

## Known gaps

| Gap | Notes |
|-----|-------|
| English defaults in components | Web must pass `labels` for ar/en |
| `Message` imports internal `@/components/ui/avatar` | Package-internal alias; OK for monorepo |
| No visual regression tests | Manual QA |
| Investigator-specific widgets | Not built ([feat-0015](../feat-0015-investigator-dashboard/TECH.md)) |

## What's needed to make it work

| Step | Action |
|------|--------|
| 1 | Add `@safevoices/ui` to consumer `package.json` |
| 2 | Import `@safevoices/ui/styles.css` in app entry |
| 3 | Configure Tailwind to scan `packages/ui/src` |
| 4 | Use `"use client"` boundaries only in leaf components (already marked) |
| 5 | Wrap app with `ToastProvider` for API errors |
| 6 | Pass translated labels from `next-intl` wrappers |
| 7 | Run `pnpm --filter @safevoices/ui run typecheck` in CI |

## Commands

```bash
pnpm --filter @safevoices/ui run typecheck
pnpm --filter @safevoices/web run typecheck
```

## Testing

| Case | Location |
|------|----------|
| UI package typecheck | CI turbo |
| Web vitest | Auth flow tests (not UI snapshot) |
| Manual | Chat scroll, crisis panel, secret ack gating |

## Related

- [feat-0005 TECH](../feat-0005-anonymous-case-access/TECH.md)
- [feat-0008 TECH](../feat-0008-reporting-chat-ai/TECH.md)
- [feat-0012 TECH](../feat-0012-api-contracts/TECH.md)
- [feat-0019 TECH](../feat-0019-api-errors-i18n/TECH.md)
- `.agents/skills/coss/SKILL.md`
- `packages/ui/README.md`
