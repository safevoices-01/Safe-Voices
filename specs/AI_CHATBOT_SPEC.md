# Safe Voices AI Chatbot - Full Implementation Specification

> **Note:** This document is a broad reference. Per-feature specs with PRODUCT + TECH pairs live under [`specs/README.md`](./README.md) (feat-0005 access, feat-0007/0008 chat, feat-0010 media, etc.).

**Version:** 1.0  
**Date:** May 2026  
**Purpose:** Complete specification and implementation guide for the Safe Voices AI anonymous reporting chat system

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [System Components](#system-components)
4. [Technology Stack](#technology-stack)
5. [Core Features](#core-features)
6. [Attachment and Media Handling](#attachment-and-media-handling)
7. [Reliability and Real-Time](#reliability-and-real-time)
8. [Implementation Plan](#implementation-plan)
9. [API Integration](#api-integration)
10. [Component Implementation](#component-implementation)
11. [Language Support](#language-support)
12. [Case Lifecycle](#case-lifecycle)
13. [Deployment Guide](#deployment-guide)
14. [Code Snippets](#code-snippets)

---

## Executive Summary

The Safe Voices AI Chatbot is a secure, privacy-first anonymous workplace reporting system built on a pnpm/Turborepo monorepo with a Next.js 15 frontend, a standalone Hono API server, and Vercel AI SDK v6-powered streaming chat. It uses Anthropic's `claude-sonnet-4-5` model (via AI Gateway) to help users describe workplace concerns clearly, understand triage processes, and navigate anonymous reporting safely. Key features:

- **Anonymous-by-default reporting** with cryptographic case credentials (no account required for reporters)
- **Streaming AI chat** with a production-quality full-page interface (prompt-kit components)
- **Case lifecycle management**: open, under_review, resolved, closed
- **Multi-media support**: text, image, voice input (Web Speech API), with planned file attachments via Supabase Storage
- **Dual auth model**: anonymous case access (scrypt + HMAC hashed secrets) and email OTP for partner/investigator accounts
- **Case tracking codes** (format `SV-XXXXX-XXXX`) shown once, never stored in plaintext
- **Human-in-the-loop workflow** for case triage and investigation
- **Transactional email** notifications (Resend) for case status changes (planned)

---

## Architecture Overview

```
+-----------------------------------------------------------+
|                    Client (apps/web)                       |
|  +-----------------------------------------------------+  |
|  |  ChatPage (app/chat/page.tsx)                        |  |
|  |  - useChat hook with DefaultChatTransport             |  |
|  |  - Streaming message display with prompt-kit          |  |
|  |  - Voice input (Web Speech API)                       |  |
|  |  - Image attachment support                           |  |
|  |  - Sidebar with navigation (main, history, saved)     |  |
|  |  - Case session awareness (caseId from search params) |  |
|  +-----------------------------------------------------+  |
|  +-----------------------------------------------------+  |
|  |  Chat UI Kit (@safevoices/ui)                        |  |
|  |  - ChatContainerRoot / Content / ScrollAnchor         |  |
|  |  - Message / MessageContent (markdown rendering)      |  |
|  |  - PromptInput / Textarea / Actions                   |  |
|  |  - Loader (typing variant)                            |  |
|  |  - Avatar, Button, Badge, Card (COSS primitives)      |  |
|  +-----------------------------------------------------+  |
|  +-----------------------------------------------------+  |
|  |  Case Access (lib/case-access.ts)                    |  |
|  |  - createCaseCredential (scrypt + HMAC)              |  |
|  |  - verifyCaseCredential (timing-safe comparison)     |  |
|  |  - Session management (15-min TTL, httpOnly cookies) |  |
|  |  - Rate limiting (5 attempts, 10-min lockout)        |  |
|  +-----------------------------------------------------+  |
+-----------------------------------------------------------+
                          |
              Next.js API Routes (POST)
              + Hono standalone server
                          |
+-----------------------------------------------------------+
|              Shared AI Package (@safevoices/ai)            |
|  +-----------------------------------------------------+  |
|  |  chat.ts - System prompt, model config, extraction   |  |
|  |  chat-post.ts - Request parsing, validation,         |  |
|  |                 createChatStreamResponse()            |  |
|  +-----------------------------------------------------+  |
+-----------------------------------------------------------+
                          |
+-----------------------------------------------------------+
|           External Services                               |
|  +-----------------------------------------------------+  |
|  |  AI Gateway (Anthropic)                              |  |
|  |  - claude-sonnet-4-5 for reporting guidance           |  |
|  |  - Vercel AI SDK v6 streamText()                     |  |
|  +-----------------------------------------------------+  |
|  +-----------------------------------------------------+  |
|  |  Supabase (Planned)                                  |  |
|  |  - PostgreSQL (via Prisma ORM)                       |  |
|  |  - Storage (signed upload URLs for attachments)      |  |
|  +-----------------------------------------------------+  |
|  +-----------------------------------------------------+  |
|  |  Resend (Planned)                                    |  |
|  |  - case-received, case-status-update                 |  |
|  |  - partner-otp, investigator-assignment              |  |
|  +-----------------------------------------------------+  |
+-----------------------------------------------------------+
```

---

## System Components

### 1. Frontend Components (apps/web)

#### Chat Page (`app/chat/page.tsx`)
- Client component using `@ai-sdk/react` `useChat` hook with `DefaultChatTransport`
- Routes to `/api/cases/{caseId}/chat` when a case session is active, otherwise `/api/chat`
- Seed messages for initial greeting and suggestion chips
- Voice input via Web Speech API
- Image attachment support via file input
- "Thinking" loader animation while streaming
- Collapsible sidebar with navigation (main conversation, history, saved answers)
- Warning banner when no case session is active

#### Case Access Flow (`app/auth/page.tsx` + `components/auth/case-access-flow.tsx`)
- Three-step UI: menu -> create anonymous case -> verify existing case
- Creates cryptographic case credentials (caseId `SV-XXXXX-XXXX` + base64url secret)
- Secret shown once, hashed with scrypt + HMAC before storage
- Rate-limited verification (5 attempts, 10-minute lockout)
- Session stored in httpOnly cookie (`sv_case_session`), 15-minute TTL

#### Email OTP Flow (`app/auth/email/page.tsx` + `components/auth/email-otp-flow.tsx`)
- Multi-step email + OTP authentication for partner/investigator accounts
- Currently uses a mock client (`createMockOtpClient`) in development
- Full UI with resend cooldown, validation, back navigation

#### Chat UI Kit (`@safevoices/ui`)

| Component | Purpose |
|-----------|---------|
| `ChatContainerRoot` | Scrollable chat container with auto-scroll behavior |
| `ChatContainerContent` | Content wrapper inside the chat container |
| `ChatContainerScrollAnchor` | Auto-scroll anchor at the bottom of messages |
| `Message` | Row wrapper per message (handles alignment and avatar) |
| `MessageContent` | Styled message body with optional markdown rendering |
| `PromptInput` | Textarea wrapper with loading state and submit handling |
| `PromptInputTextarea` | Auto-resizing textarea for message composition |
| `PromptInputActions` | Container for action buttons (attach, mic, send, stop) |
| `PromptInputAction` | Individual action button with tooltip |
| `Loader` | Typing indicator with pulse animation |
| `Markdown` | Markdown renderer for assistant responses |
| `CodeBlock` | Code block with language header and copy button |
| `Avatar` / `AvatarFallback` | User and assistant avatars |

### 2. Backend

#### Next.js API Routes (apps/web)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST | Generic streaming chat (no case context) |
| `/api/cases` | POST | Create a new anonymous case credential |
| `/api/cases/verify` | POST | Verify case credentials and issue session |
| `/api/cases/[caseId]/chat` | POST | Authenticated per-case streaming chat |
| `/api/cases/[caseId]/submit` | POST | Mark a case as submitted |

#### Hono API Server (apps/api - `@safevoices/api`)

Standalone Node.js HTTP server using Hono framework:
- CORS support with configurable origins
- Health check endpoint at `/health`
- Streaming chat endpoint at `/api/chat`
- Uses shared `@safevoices/ai/chat-post` for consistent request handling
- Default port: 8787 (configurable via `PORT`)

#### Shared AI Package (`@safevoices/ai`)

Two entry points:
- `./chat` -- System prompt, model configuration, reporting extraction schema types
- `./chat-post` -- Request parsing, validation, `createChatStreamResponse()`

### 3. Frontend Infrastructure (apps/web)

#### Site Configuration (`lib/site.ts`)
- `getSiteUrl()`: resolves from `NEXT_PUBLIC_SITE_URL` or falls back to `http://localhost:3000`

#### Brand Assets (`lib/branding.ts` + `public/`)
- `brandIconSrc`: `/@safevoices-iocn.png`
- `brandLogoSrc`: `/@safevoices-logo.png`
- `favicon.svg`, `og.png`, `hero.png`

#### SEO and PWA
- `app/robots.ts` -- dynamic robots.txt
- `app/sitemap.ts` -- XML sitemap
- `app/manifest.ts` -- PWA manifest (standalone display)

#### Landing / Marketing Page (`app/(marketing)/page.tsx`)
- Hero section with headline and CTA
- Features grid: Anonymity by default, Encryption, AI guidance, Audit trail
- "How it works" step-by-step guide
- Marketing layout with `SiteHeader` + `SiteFooter`

#### Documentation Hub (`app/(marketing)/documentation/page.tsx`)
- Full documentation page with TOC sidebar
- Covers: getting started, creating cases, chat guidance, security

#### Toast Notification System
- `WebProviders` -- root-level wrapper with `ToastProvider`
- `api-toast.ts` -- helper functions: `toastApiError()`, `toastApiSuccess()`, etc.

### 4. Shared Packages

#### `@safevoices/ai`
- Vercel AI SDK v6 (`ai@^6.0.158`) with `@ai-sdk/anthropic`
- Default model: `anthropic/claude-sonnet-4-5` (override via `SAFEVOICES_CHAT_MODEL`)
- API key: `AI_GATEWAY_API_KEY`
- System prompt focused on anonymous reporting guidance
- Max 40 messages per conversation, max 12,000 chars per message
- Reporting extraction schema types: `incidentDescription`, `location`, `occurredAt`, `attachments`, `riskLevel`

#### `@safevoices/prisma`
- Prisma 7 ORM with `@prisma/client`
- PostgreSQL on Supabase (planned)
- Currently a stub: `getDatabaseProvider()` returns `'supabase-postgres'`
- No `schema.prisma` file yet (see Implementation Plan)

#### `@safevoices/emails`
- Resend SDK integration (planned)
- Currently a stub: `getEmailProvider()` returns `'resend'`

#### `@safevoices/trpc`
- Currently exports shared type definitions only (no routers)
- Types: `ApiHealth`, `CreateCaseResponse`, `VerifyCaseAccessRequest`, `VerifyCaseAccessResponse`, `PostCaseChatMessageRequest`, `SubmitCaseResponse`

#### `@safevoices/ui`
- Headless UI primitives built on Base UI (`@base-ui/react@^1.3.0`)
- CVA (class-variance-authority) for variant styling
- 60+ components including chat kit (prompt-input, message, chat-container, loader, markdown)
- Design tokens: warm background `#fdf8f3`, primary `#5170ff`, foreground `#162532`
- Fonts: Inter Variable + Outfit Variable

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js | 15.4 |
| | React | 19 |
| | TypeScript | 5.9 |
| | Tailwind CSS | 4 |
| **API** | Hono (standalone Node.js) | - |
| | Next.js API Routes | 15.4 |
| **AI/LLM** | Anthropic (via AI Gateway) | claude-sonnet-4-5 |
| | Vercel AI SDK | 6 |
| **Database** | PostgreSQL (Supabase) | planned |
| | Prisma ORM | 7 |
| **Storage** | Supabase Storage | planned |
| **Email** | Resend | planned |
| **Data Fetching** | @tanstack/react-query | 5.x |
| **UI Primitives** | Base UI (@base-ui/react) | 1.3 |
| | CVA | - |
| | Lucide Icons | 1.7 |
| **Build** | pnpm workspaces | 10 |
| | Turborepo | - |
| **Testing** | Vitest + Playwright | - |

---

## Core Features

### 1. Streaming Chat Interface
- **Full-page layout** with collapsible sidebar and main chat area
- **Streaming responses** via Vercel AI SDK `useChat` + `DefaultChatTransport`
- **Auto-scrolling** message list with scroll anchor
- **Seed messages** for initial greeting and suggestion chips
- **Voice input** via Web Speech API (Chrome and supported browsers)
- **Image attachment** via file input
- **Dark/light theme** support (warm palette: `#fdf8f3` background, `#067a6f` accent)

### 2. Anonymous Case Data Model (Target)

Each case captures structured metadata for the full reporting lifecycle:

| Field | Description | Examples |
|-------|-------------|----------|
| `caseId` | Unique tracking code | `SV-ABCDE-1234` |
| `secretHash` | Hashed case secret (scrypt + HMAC) | (internal) |
| `incidentDescription` | Description of the workplace concern | "Witnessed unsafe handling of chemicals" |
| `incidentCategory` | Category of the incident | harassment, fraud, safety, discrimination, retaliation, other |
| `location` | Where the incident occurred | "Building A, Floor 3", "Remote office" |
| `occurredAt` | When the incident happened | 2026-05-10 |
| `riskLevel` | Assessed risk level | low, medium, high, critical |
| `caseStatus` | Current status of the case | open, under_review, resolved, closed |
| `submittedAt` | When the case was formally submitted | 2026-05-11 |
| `assignedTo` | Investigator assigned to the case | (investigator user ID) |
| `resolution` | How the case was resolved | (free text) |

### 3. Case Reporting Pipeline
- **User creates an anonymous case** (receives caseId + secret, shown once)
- **User verifies credentials** to start a chat session (15-minute TTL)
- **AI assists** the user in describing their concern clearly and completely
- **User submits** the case when ready
- **Investigator reviews** the case (partner/admin access via email OTP)
- **Status transitions**: open -> under_review -> resolved -> closed

### 4. Multi-Media Support (Current + Planned)
- **Text input**: primary input method
- **Voice input**: Web Speech API transcription (currently implemented)
- **Image attachment**: file input with client-side `sendMessage({ files })` (currently implemented)
- **Planned**: Supabase Storage upload pipeline for persistent evidence attachments

### 5. Language Support

| Language | Code | Status |
|----------|------|--------|
| English | `en` | Primary (UI, system prompt, docs) |

### 6. Authentication and Authorization
- **Anonymous case access** (primary): no account needed for reporters
  - Case ID + secret credential pair
  - scrypt + HMAC hashing, timing-safe comparison
  - Rate limiting: 5 attempts, 10-minute lockout
  - Session: 15-minute TTL, httpOnly cookie
- **Email OTP** (partner/investigator): for organizational users
  - Currently mock implementation in development
  - Planned: Resend-powered OTP delivery

### 7. Transactional Email (Planned)
- **case-received**: Confirmation when a case is submitted
- **case-status-update**: Notification when case status changes
- **partner-otp**: OTP code for partner sign-in
- **investigator-assignment**: Notification when assigned to a case

---

## Attachment and Media Handling

### 1. Current Implementation

Image attachments are handled client-side using the Vercel AI SDK's file parts:

```typescript
const onImageFilesChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const list = event.target.files;
    event.target.value = '';
    if (!list?.length || busy) return;
    void sendMessage({ files: list });
};
```

Files are sent as `FileUIPart` objects within the `UIMessage.parts` array. The `UserMessageBody` component renders image attachments inline:

```typescript
function UserMessageBody({ parts }: { parts: UIMessage['parts'] }): ReactElement {
    const text = partsToPlainText(parts);
    const files = parts.filter(isFileUIPart);

    return (
        <div className="space-y-2">
            {files.map((f, i) =>
                f.mediaType.startsWith('image/') ? (
                    <img
                        key={`${f.url}-${i}`}
                        src={f.url}
                        alt={f.filename ?? 'Uploaded image'}
                        className="max-h-48 max-w-full rounded-2xl border border-black/10 object-contain"
                    />
                ) : (
                    <p key={`${f.url}-${i}`} className="text-sm text-black/70">
                        Attachment: {f.filename ?? f.mediaType}
                    </p>
                ),
            )}
            {text ? <p className="whitespace-pre-wrap">{text}</p> : null}
        </div>
    );
}
```

### 2. Planned: Supabase Storage Upload Pipeline

When database persistence is implemented, file attachments will follow a two-phase flow: the client obtains a signed upload URL from the API, uploads the file directly to Supabase Storage, then references the resulting URL in the message payload.

#### Upload Flow (Planned)

```
Client                       API                         Supabase Storage
  |                             |                              |
  |-- POST /api/cases/{id}/    |                              |
  |   upload                   |                              |
  |   { filename, mimeType }   |                              |
  |                             |-- createSignedUploadUrl ---->|
  |                             |<--- { signedUrl, token } ----|
  |<-- { signedUrl, publicUrl } |                              |
  |                             |                              |
  |-- PUT signedUrl (binary) --------------------------------->|
  |<-- 200 OK ------------------------------------------------|
  |                             |                              |
  |-- POST /api/cases/{id}/    |                              |
  |   chat                     |                              |
  |   { messages with          |                              |
  |     attachment URLs }      |                              |
```

#### Attachment Schema (Planned)

```typescript
interface CaseAttachment {
  url: string;       // Supabase Storage URL
  type: string;      // MIME type (image/jpeg, audio/webm, etc.)
  name: string;      // Original filename
  size?: number;     // File size in bytes
}
```

#### Supported File Types (Planned)

| Category | MIME Types | Max Size |
|----------|-----------|----------|
| Image | `image/png`, `image/jpeg`, `image/webp` | 5 MB |
| Audio | `audio/webm`, `audio/ogg`, `audio/mp4`, `audio/mpeg` | 10 MB |
| Document | `application/pdf` | 10 MB |

#### Server-Side Controls (Planned)

- **Signed URLs expire** after 60 seconds to prevent link reuse
- **Bucket-level MIME enforcement** via Supabase Storage policies
- **File path convention**: `cases/{caseId}/{timestamp}-{safeName}`
- **Orphan cleanup**: scheduled job removes files never referenced in a message (older than 1 hour)

### 3. Image Upload Validation (Planned)

#### Client-Side Validation

| Check | Rule | Error Message |
|-------|------|---------------|
| File type | Must be PNG, JPEG, or WebP | "Unsupported format. Use PNG, JPEG, or WebP." |
| File size | Must be <= 5 MB | "File exceeds the 5 MB size limit." |
| Dimensions | Width and height <= 4096 px | "Image is too large. Maximum 4096x4096 pixels." |
| File count | Max 4 images per message | "Maximum 4 images per message." |

```typescript
const IMAGE_LIMITS = {
  maxBytes: Number(process.env.NEXT_PUBLIC_CHAT_IMAGE_MAX_BYTES ?? 5_242_880),
  allowedTypes: ['image/png', 'image/jpeg', 'image/webp'],
  maxDimension: 4096,
  maxPerMessage: 4,
} as const;

function validateImage(file: File): { valid: boolean; error?: string } {
  if (!IMAGE_LIMITS.allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Unsupported format. Use PNG, JPEG, or WebP.' };
  }
  if (file.size > IMAGE_LIMITS.maxBytes) {
    return { valid: false, error: 'File exceeds the 5 MB size limit.' };
  }
  return { valid: true };
}

async function validateImageDimensions(file: File): Promise<{ valid: boolean; error?: string }> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  return new Promise((resolve) => {
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width > IMAGE_LIMITS.maxDimension || img.height > IMAGE_LIMITS.maxDimension) {
        resolve({ valid: false, error: 'Image is too large. Maximum 4096x4096 pixels.' });
      }
      resolve({ valid: true });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, error: 'Could not read the image.' });
    };
    img.src = url;
  });
}
```

### 4. Voice Input (Current Implementation)

Voice input uses the browser's Web Speech API for real-time transcription:

```typescript
const win = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};
const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;
const recognition = new SR();
recognition.lang = 'en-US';
recognition.continuous = false;
recognition.interimResults = false;
recognition.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim();
    if (transcript) setInput((prev) => prev ? `${prev} ${transcript}` : transcript);
};
```

Voice constraints:
- Single utterance mode (non-continuous)
- Browser-dependent availability (Chrome recommended)
- Transcribed text appended to the input field for user review before sending

---

## Reliability and Real-Time

### 1. Message Recovery (Planned)

Message recovery ensures that user messages are never silently lost due to network failures. The strategy combines optimistic local state, idempotent server writes, and a reconciliation step on reconnect.

#### Idempotent Writes via clientRequestId (Planned)

Every user message will include a `clientRequestId` (UUID v4) generated before submission. The database will enforce a unique constraint on `(caseId, clientReqId)`, so duplicate submissions from retries are safely ignored.

```typescript
const clientRequestId = crypto.randomUUID();

await sendMessage({
  text: messageText,
  data: { clientRequestId, caseId: activeCaseId },
});
```

#### Outbox Pattern (Planned)

Unsent messages stored in an in-memory outbox with periodic persistence to `localStorage`:

```typescript
interface OutboxEntry {
  id: string;                  // clientRequestId
  caseId: string;
  content: string;
  attachments: CaseAttachment[];
  status: 'queued' | 'sending' | 'sent' | 'failed';
  attempts: number;
  createdAt: number;
  lastAttemptAt?: number;
}

const OUTBOX_CONFIG = {
  maxRetries: 5,
  storageKey: 'safevoices_message_outbox',
  flushInterval: 3000,
  staleThreshold: 86_400_000, // 24 hours
} as const;
```

#### UI Indicators (Planned)

| State | Visual Treatment |
|-------|-----------------|
| Message queued (offline) | Dimmed bubble with clock icon |
| Message sending | Dimmed bubble with spinner |
| Message sent | Normal bubble |
| Message failed (max retries) | Red border with "Retry" button |

### 2. Connection Retry Logic (Planned)

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 15_000,
  backoffMultiplier: 2,
  jitter: true,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
} as const;
```

### 3. Online/Offline Detection (Planned)

When offline:
- New messages are added to the outbox
- A banner displays: "You are offline. Messages will be sent automatically when reconnected."

When back online:
- The outbox drains queued messages
- A brief "Reconnected" toast confirms restoration

---

## Implementation Plan

### Phase 1: Foundation (Complete)
1. Monorepo setup (pnpm + Turborepo)
2. Package scaffolding (`@safevoices/ai`, `@safevoices/ui`, `@safevoices/prisma`, `@safevoices/trpc`, `@safevoices/emails`)
3. Next.js 15 frontend with marketing landing page and documentation
4. Anonymous case credential system (in-memory)
5. Email OTP flow (mock client)

### Phase 2: Chat Interface (Complete)
1. Streaming chat with Vercel AI SDK v6 + Anthropic Claude
2. Chat UI components (prompt-input, message, chat-container, loader, markdown)
3. Voice input via Web Speech API
4. Image attachment support (client-side file parts)
5. Per-case chat routing with session authentication
6. Hono API server with shared AI package

### Phase 3: Database Persistence (Next)
1. Prisma schema for Cases, CaseMessages, Users, Sessions
2. Supabase PostgreSQL setup and migrations
3. Replace in-memory case store with database-backed persistence
4. Case message history persistence
5. Supabase Storage integration for file attachments

### Phase 4: Investigation Workflow
1. Investigator dashboard for case triage
2. Case assignment and status management
3. Resend email integration (OTP, case notifications)
4. Admin role with case queue access
5. Case resolution workflow

### Phase 5: Advanced Features
1. Reporting extraction (structured data from chat via AI)
2. Risk level assessment and routing
3. Audit trail and compliance logging
4. Analytics and monitoring
5. Message recovery and offline support

---

## API Integration

### Environment Variables

```bash
# apps/web/.env.local
NEXT_PUBLIC_SITE_URL=https://thesafevoices.org
AI_GATEWAY_API_KEY=...                              # AI Gateway key (Anthropic)
SAFEVOICES_CHAT_MODEL=anthropic/claude-sonnet-4-5    # Model ID (configurable)
SAFEVOICES_CHAT_MAX_MESSAGES=40                      # Max messages per conversation
SAFEVOICES_CHAT_MAX_CHARS_PER_MESSAGE=12000          # Max chars per message
SAFEVOICES_SECRET_PEPPER=...                         # HMAC pepper for case secret hashing
```

```bash
# apps/api/.env
AI_GATEWAY_API_KEY=...
SAFEVOICES_CHAT_MODEL=anthropic/claude-sonnet-4-5
SAFEVOICES_CORS_ORIGINS=http://localhost:3000,https://thesafevoices.org
PORT=8787
```

```bash
# Planned (database + email)
DATABASE_URL=postgresql://...                        # Supabase PostgreSQL
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=case-uploads
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@thesafevoices.org
```

### Chat API (Current)

```typescript
// Generic chat - apps/web/app/api/chat/route.ts
import { createChatStreamResponse, parseChatRequestBody } from '@safevoices/ai/chat-post';

export async function POST(req: Request): Promise<Response> {
    const body = await req.json();
    const parsed = parseChatRequestBody(body);
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: parsed.status });
    return createChatStreamResponse(parsed.messages);
}
```

```typescript
// Per-case chat - apps/web/app/api/cases/[caseId]/chat/route.ts
export async function POST(req: Request, ctx: { params: Promise<{ caseId: string }> }): Promise<Response> {
    const { caseId } = await ctx.params;
    const token = cookieStore.get(CASE_SESSION_COOKIE)?.value;
    const session = resolveSession(token);
    if (!session || session.caseId !== caseId) {
        return Response.json({ error: 'Session expired.' }, { status: 401 });
    }
    touchSession(session.token);
    // ... parse and stream
    return createChatStreamResponse(parsed.messages);
}
```

### Case Management API (Current)

```typescript
// Create case - POST /api/cases
const { caseId, secret } = createCaseCredential();
// Returns: { caseId: "SV-ABCDE-1234", secret: "base64url...", secretShownOnce: true }

// Verify case - POST /api/cases/verify
const verified = verifyCaseCredential({ caseId, secret });
// Returns: { ok: true, token: "base64url...", expiresAt: "2026-05-12T13:15:00Z" }
// Sets httpOnly cookie: sv_case_session

// Submit case - POST /api/cases/{caseId}/submit
const ok = markCaseSubmitted(caseId);
// Returns: { ok: true, caseId, submittedAt: "2026-05-12T13:00:00Z" }
```

---

## Component Implementation

### Chat Page Client

```typescript
// apps/web/app/chat/page.tsx (simplified)
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isFileUIPart, isTextUIPart, type UIMessage } from 'ai';
import {
    ChatContainerContent, ChatContainerRoot, ChatContainerScrollAnchor,
} from '@safevoices/ui/components/chat-container';
import { Loader } from '@safevoices/ui/components/loader';
import { Message, MessageContent } from '@safevoices/ui/components/message';
import {
    PromptInput, PromptInputAction, PromptInputActions, PromptInputTextarea,
} from '@safevoices/ui/components/prompt-input';

export default function ChatPage(): ReactElement {
    const searchParams = useSearchParams();
    const caseId = searchParams.get('caseId')?.trim() ?? '';
    const missingCaseSession = caseId.length === 0;

    const { messages, sendMessage, status, stop, error, clearError } = useChat({
        messages: CHAT_SEED_MESSAGES,
        transport: new DefaultChatTransport({
            api: caseId ? `/api/cases/${encodeURIComponent(caseId)}/chat` : '/api/chat',
        }),
    });

    const busy = status === 'submitted' || status === 'streaming';

    const handleSubmit = (): void => {
        const text = input.trim();
        if (!text || busy || missingCaseSession) return;
        void sendMessage({ text });
        setInput('');
    };

    return (
        <div className="flex min-h-dvh bg-white text-black">
            {/* Sidebar */}
            <aside>...</aside>

            {/* Main chat area */}
            <main className="flex min-h-dvh min-w-0 flex-1 flex-col bg-[#f5f5f7]">
                <ChatContainerRoot>
                    <ChatContainerContent>
                        {messages.map((msg) => (
                            <Message key={msg.id}>
                                <MessageContent markdown>{body}</MessageContent>
                            </Message>
                        ))}
                        {showThinkingLoader && <Loader variant="typing" size="sm" />}
                        <ChatContainerScrollAnchor />
                    </ChatContainerContent>
                </ChatContainerRoot>

                <PromptInput onSubmit={handleSubmit}>
                    <PromptInputTextarea placeholder="Text" />
                    <PromptInputActions>
                        {/* Attach images, voice input, send/stop */}
                    </PromptInputActions>
                </PromptInput>
            </main>
        </div>
    );
}
```

### AI Streaming (Shared Package)

```typescript
// packages/ai/src/chat.ts
const defaultModel = "anthropic/claude-sonnet-4-5";

export const CHAT_SYSTEM_PROMPT = `You are the Safe Voices assistant. You help visitors understand confidential and anonymous workplace reporting: how to describe concerns clearly, what to expect from a triage process, how tracking codes typically work, and how to stay safe when sharing sensitive information.

You do not provide legal advice, medical advice, or definitive judgments about specific situations. Encourage users to follow their organization's official channels and local laws. Keep answers concise, calm, and respectful.`;

export function getChatModelId(): string {
  const fromEnv = process.env.SAFEVOICES_CHAT_MODEL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : defaultModel;
}
```

```typescript
// packages/ai/src/chat-post.ts
import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { CHAT_SYSTEM_PROMPT, getChatModelId } from './chat';

export async function createChatStreamResponse(messages: UIMessage[]): Promise<Response> {
    if (!process.env.AI_GATEWAY_API_KEY?.trim()) {
        return missingGatewayKeyResponse();
    }
    const modelMessages = await convertToModelMessages(messages);
    const result = streamText({
        model: getChatModelId(),
        system: CHAT_SYSTEM_PROMPT,
        messages: modelMessages,
    });
    return result.toUIMessageStreamResponse();
}
```

### Hono API Server

```typescript
// apps/api/src/server.ts
import { createChatStreamResponse, parseChatRequestBody } from '@safevoices/ai/chat-post';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('/*', cors({ origin: getCorsOrigins(), allowMethods: ['GET', 'POST', 'OPTIONS'] }));
app.get('/health', (c) => c.json({ status: 'ok' }));
app.post('/api/chat', async (c) => {
    const body = await c.req.json();
    const parsed = parseChatRequestBody(body);
    if (!parsed.ok) return c.json({ error: parsed.error }, 400);
    return createChatStreamResponse(parsed.messages);
});

const port = Number(process.env.PORT ?? '8787');
serve({ fetch: app.fetch, port });
```

---

## Language Support

### Current Configuration

Locales use path prefixes (`/en`, `/ar`) via next-intl. UI strings live in `apps/web/messages/en.json` and `apps/web/messages/ar.json`. Reporting and demo chat system prompts are locale-aware in `packages/ai/src/reporting.ts` and `packages/ai/src/chat.ts`.

| Language | Code | Status | Use |
|----------|------|--------|-----|
| English | `en` | Active | UI, reporting prompt, default locale |
| Modern Standard Arabic | `ar` | Active | RTL UI, Arabic reporting prompt, `ar-SA` voice input |

### System Prompt (Current)

```
You are the Safe Voices assistant. You help visitors understand confidential and
anonymous workplace reporting: how to describe concerns clearly, what to expect
from a triage process, how tracking codes typically work, and how to stay safe
when sharing sensitive information.

You do not provide legal advice, medical advice, or definitive judgments about
specific situations. Encourage users to follow their organization's official
channels and local laws. Keep answers concise, calm, and respectful.
```

### Planned: Context-Enriched System Prompt

When database persistence is implemented, the system prompt will be dynamically extended with case metadata:

```typescript
const caseContext = [
  caseRecord.incidentCategory && `Incident category: ${caseRecord.incidentCategory}`,
  caseRecord.location && `Location: ${caseRecord.location}`,
  caseRecord.occurredAt && `Incident date: ${caseRecord.occurredAt}`,
  caseRecord.riskLevel && `Assessed risk: ${caseRecord.riskLevel}`,
  caseRecord.caseStatus && `Case status: ${caseRecord.caseStatus}`,
]
  .filter(Boolean)
  .join('\n');

const systemPrompt = `${CHAT_SYSTEM_PROMPT}

Case context:
${caseContext || 'No case metadata available.'}`;
```

---

## Case Lifecycle

### Case Status (CaseStatus - Planned)

| Status | Description |
|--------|-------------|
| `OPEN` | Case created, reporter is composing their report via chat |
| `SUBMITTED` | Reporter has formally submitted the case for review |
| `UNDER_REVIEW` | An investigator has been assigned and is reviewing |
| `RESOLVED` | The case has been investigated and a resolution reached |
| `CLOSED` | The case is closed (resolved or dismissed) |

### State Machine

```
OPEN ──(user submits via /api/cases/{id}/submit)──> SUBMITTED
                                                         |
                                          (investigator picks up)
                                                         |
                                                    UNDER_REVIEW
                                                         |
                                           (investigation complete)
                                                         |
                                                      RESOLVED
                                                         |
                                              (admin closes case)
                                                         |
                                                       CLOSED
```

### Incident Categories (Planned)

| Category | Description |
|----------|-------------|
| `harassment` | Workplace harassment, bullying, hostile behavior |
| `discrimination` | Discrimination based on protected characteristics |
| `fraud` | Financial fraud, misuse of funds, corruption |
| `safety` | Workplace safety violations, hazardous conditions |
| `retaliation` | Retaliation against whistleblowers or reporters |
| `data_breach` | Data privacy violations, unauthorized access |
| `misconduct` | General professional misconduct |
| `other` | Other concerns not covered above |

### Risk Levels (Planned)

| Level | Description |
|-------|-------------|
| `low` | No immediate danger, routine concern |
| `medium` | Potential for harm, should be reviewed promptly |
| `high` | Serious concern, requires urgent attention |
| `critical` | Immediate danger to persons, requires emergency response |

### Email Notifications (Planned)

| Event | Template | Content |
|-------|----------|---------|
| Case submitted | `case-received` | "Your case has been received and will be reviewed" |
| Investigator assigned | `investigator-assigned` | "An investigator has been assigned to your case" |
| Case resolved | `case-resolved` | "Your case has been resolved" (includes summary) |
| Partner OTP | `partner-otp` | OTP code for partner/investigator sign-in |

---

## Deployment Guide

### Prerequisites

- Node.js 20+
- pnpm 10+
- AI Gateway API key (Anthropic)
- PostgreSQL database (Supabase) -- planned
- Resend API key -- planned

### Step 1: Clone and Install

```bash
git clone <repo-url>
cd Safe-Voices
pnpm install
```

### Step 2: Configure Environment

Create `.env.local` in `apps/web/` and `.env` in `apps/api/`:

```bash
# apps/web/.env.local
NEXT_PUBLIC_SITE_URL=https://thesafevoices.org
AI_GATEWAY_API_KEY=...
SAFEVOICES_SECRET_PEPPER=your-secret-pepper
```

```bash
# apps/api/.env
AI_GATEWAY_API_KEY=...
PORT=8787
SAFEVOICES_CORS_ORIGINS=http://localhost:3000,https://thesafevoices.org
```

### Step 3: Run Development

```bash
pnpm dev
```

This starts `apps/web` (Next.js on port 3000) and `apps/api` (Hono on port 8787) via Turborepo.

### Step 4: Build for Production

```bash
pnpm build
```

### Step 5: Deploy

- **Frontend (apps/web)**: Deploy to Vercel
- **API (apps/api)**: Deploy to a Node.js host (Railway, Fly.io, Cloudflare Workers)
- **Database**: Supabase managed PostgreSQL (planned)

---

## Code Snippets

### Database Schema (Planned)

```prisma
enum CaseStatus {
  OPEN
  SUBMITTED
  UNDER_REVIEW
  RESOLVED
  CLOSED
}

enum IncidentCategory {
  HARASSMENT
  DISCRIMINATION
  FRAUD
  SAFETY
  RETALIATION
  DATA_BREACH
  MISCONDUCT
  OTHER
}

enum RiskLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

model Case {
  id                  String            @id @default(cuid())

  // Tracking
  trackingCode        String            @unique  // "SV-XXXXX-XXXX"
  secretHash          String
  secretSalt          String

  // Incident data (extracted from chat or user input)
  incidentDescription String?
  incidentCategory    IncidentCategory?
  location            String?
  occurredAt          DateTime?
  riskLevel           RiskLevel?

  // Case lifecycle
  caseStatus          CaseStatus        @default(OPEN)
  submittedAt         DateTime?
  resolvedAt          DateTime?
  resolution          String?

  // Assignment
  assignedToUserId    String?
  assignedTo          User?             @relation("assigned", fields: [assignedToUserId], references: [id])

  // Timestamps
  failedAttempts      Int               @default(0)
  lockedUntil         DateTime?
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  messages            CaseMessage[]

  @@index([caseStatus, createdAt])
  @@index([assignedToUserId, caseStatus])
}

model CaseMessage {
  id          String      @id @default(cuid())
  caseId      String
  role        MessageRole
  content     String
  attachments Json?       // Array of { url, type, name } for uploaded evidence
  clientReqId String?
  createdAt   DateTime    @default(now())
  case        Case        @relation(fields: [caseId], references: [id], onDelete: Cascade)

  @@index([caseId, createdAt])
  @@unique([caseId, clientReqId])
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  role          UserRole  @default(PARTNER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  assignedCases Case[]    @relation("assigned")
  sessions      Session[]
}

enum UserRole {
  PARTNER
  INVESTIGATOR
  ADMIN
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tokenHash, expiresAt])
}
```

### Reporting Extraction Schema Types (Current)

```typescript
// packages/ai/src/chat.ts
export const REPORTING_EXTRACTION_SCHEMA_VERSION = 1;

export type ReportingExtractionField =
    | 'incidentDescription'
    | 'location'
    | 'occurredAt'
    | 'attachments'
    | 'riskLevel';

export const REPORTING_EXTRACTION_FIELDS: readonly ReportingExtractionField[] = [
    'incidentDescription',
    'location',
    'occurredAt',
    'attachments',
    'riskLevel',
] as const;
```

### Case Credential System (Current)

```typescript
// apps/web/lib/case-access.ts
export function createCaseCredential(): { caseId: string; secret: string } {
    const caseId = generateCaseId();   // "SV-XXXXX-XXXX"
    const secret = randomBytes(16).toString('base64url');
    const secretSalt = randomBytes(16).toString('hex');
    const secretHash = hashSecret(secret, secretSalt);  // scrypt + HMAC
    caseStore.set(caseId, { caseId, secretHash, secretSalt, ... });
    return { caseId, secret };
}

export function verifyCaseCredential(input: { caseId: string; secret: string }):
    | { ok: true; token: string; expiresAt: Date }
    | { ok: false; reason: 'invalid' | 'locked' } {
    // Rate limiting, timing-safe comparison, session creation
}

export const CASE_SESSION_COOKIE = 'sv_case_session';
export const CASE_ID_REGEX = /^SV-[A-Z2-9]{5}-[A-Z2-9]{4}$/;
```

---

## Monitoring and Analytics

### Error Tracking
- AI failures surface as user-visible error banners with a "Dismiss" button
- Missing `AI_GATEWAY_API_KEY` returns a 503 with a clear setup message
- Case verification failures are rate-limited and logged

### Performance Considerations
- Streaming responses eliminate perceived latency (first token visible immediately)
- Message validation limits: max 40 messages, max 12,000 chars per message
- Image attachments are rendered client-side (data URLs, no server round-trip currently)
- Session TTL (15 minutes) balances security with usability

### Key Metrics to Track
- Case creation rate (anonymous cases per day)
- Case submission rate (created vs submitted)
- Chat message count per case
- AI response latency (time to first token)
- Session verification success/failure ratio
- Voice input usage rate
- Image attachment frequency
- Case status distribution (open vs submitted vs resolved)
- Investigator assignment time (time from submitted to under_review)
- Case resolution time (time from submitted to resolved)

---

## Conclusion

This specification describes the Safe Voices AI anonymous reporting chatbot as implemented and planned in the monorepo. Key architectural decisions:

1. **Privacy-first anonymous access** -- Reporters need no account; cryptographic case credentials with scrypt + HMAC hashing ensure secrets are never stored in plaintext
2. **Streaming AI chat** -- Vercel AI SDK v6 with Anthropic Claude Sonnet 4.5 provides real-time, production-quality conversational guidance
3. **Dual entry points** -- Next.js API routes for the web app + Hono standalone server, both consuming the shared `@safevoices/ai` package
4. **Monorepo with clear package boundaries** -- AI, UI, database, email, and tRPC as separate packages with named exports
5. **Case-centric pipeline** -- Cases flow from OPEN through SUBMITTED to RESOLVED, with investigator assignment and human-in-the-loop review
6. **Guidance-focused AI** -- The system prompt explicitly avoids legal/medical advice and encourages organizational channels
7. **Planned database persistence** -- Prisma schema ready for Case, CaseMessage, User, and Session models on Supabase PostgreSQL
8. **Security by design** -- Rate limiting, timing-safe comparisons, httpOnly cookies, short session TTLs, HMAC-peppered hashing

For the main codebase, see `/Users/pro/Documents/ProjectPacepard/clients/Safe-Voices`.
