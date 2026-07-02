# AI Chat Media, Evidence, and Context Integration

> **Note:** Canonical spec: [feat-0026-image-upload](./feat-0026-image-upload/PRODUCT.md). Legacy: [feat-0010](./feat-0010-evidence-upload-storage/PRODUCT.md), [feat-0023](./feat-0023-evidence-pipeline/PRODUCT.md), [feat-0008](./feat-0008-reporting-chat-ai/PRODUCT.md). Index: [README.md](./README.md).

## Overview

This document explains how the Safe Voices anonymous reporting chat system handles multi-media evidence (text, image, voice), attachments, and AI-generated guidance responses. Reporters submit workplace concerns through an AI-assisted chat, optionally attach evidence files, and the AI receives conversation context to produce helpful reporting guidance. The system is designed around anonymity, security, and progressive disclosure of information.

## How It Works

### 1. Frontend: Chat Page (`apps/web/app/chat/page.tsx`)

The chat page handles:
- **Session awareness**: reads `caseId` from search params to determine authenticated case context
- **Message composition**: text input with voice dictation and image attachment support
- **Streaming display**: renders assistant responses in real-time via Vercel AI SDK's `useChat` hook
- **File attachments**: sends images as `FileUIPart` objects within `UIMessage.parts`
- **Thinking indicator**: shows a typing loader while the AI generates a response
- **Sidebar navigation**: main conversation, chat history, saved answers (UI scaffolded)

### 2. Backend: Streaming Chat Endpoints

Two entry points, both consuming the shared `@safevoices/ai` package:

**Next.js API Routes (apps/web):**
- `/api/chat` -- generic streaming chat (no case context)
- `/api/cases/[caseId]/chat` -- authenticated per-case chat (validates session cookie, extends TTL)

**Hono API Server (apps/api):**
- `/api/chat` -- standalone streaming chat endpoint

Both endpoints:
- Parse and validate the request body (max 40 messages, max 12,000 chars per message)
- Verify `AI_GATEWAY_API_KEY` is configured
- Call `streamText()` with the system prompt and conversation history
- Return a `UIMessageStreamResponse` for real-time rendering

### 3. AI Generation (`@safevoices/ai`)

The shared AI package:
- **Configures the model**: `anthropic/claude-sonnet-4-5` (override via `SAFEVOICES_CHAT_MODEL`)
- **Defines the system prompt**: focused on anonymous workplace reporting guidance
- **Validates requests**: enforces message count and character limits
- **Streams responses**: uses Vercel AI SDK v6 `streamText()` with `convertToModelMessages()`

### 4. Current Attachment Handling

Image attachments are currently handled client-side through the Vercel AI SDK's file parts system:

1. User selects files via the image attachment button
2. Files are sent through `sendMessage({ files })` which encodes them as data URLs
3. The `UserMessageBody` component renders image thumbnails inline
4. The AI receives file parts as part of the message context (if the model supports vision)

### 5. Planned: Supabase Storage Integration

When database persistence is implemented, the evidence upload pipeline will use:
- **Bucket**: `case-uploads` (private, signed URLs only)
- **Path format**: `cases/{caseId}/{timestamp}-{safeName}`
- **Size limit**: 5 MB for images (configurable via `CHAT_IMAGE_MAX_BYTES`)
- **Allowed types**: PNG, JPEG, WebP (expandable for documents in future)

## Evidence Upload Flow (Planned)

```
Reporter selects evidence file (image, screenshot, document photo)
    |
    v
Client validates: file type, size, dimensions (fail fast with user-visible error)
    |
    v
Client calls POST /api/cases/{caseId}/upload
    |-- Validates: file type, session ownership
    |-- Returns: { signedUrl, publicUrl }
    |
    v
Client uploads file to signedUrl (PUT request to Supabase Storage)
    |
    v
Client includes publicUrl in message via sendMessage({ files, text })
    |
    v
CaseMessage saved with attachments JSON (when persistence is implemented)
    |
    v
AI receives conversation context including attachment references
    |
    v
Chat UI renders:
    |-- Text content (reporting guidance)
    |-- Evidence thumbnails from file parts or attachment URLs
```

## Current Attachment Data Model

### UIMessage.parts (Vercel AI SDK v6)

Attachments are currently represented as `FileUIPart` objects within the `UIMessage.parts` array:

```typescript
// FileUIPart from 'ai' package
interface FileUIPart {
  type: 'file';
  url: string;        // data URL or Supabase Storage URL (future)
  mediaType: string;   // MIME type (image/jpeg, etc.)
  filename?: string;   // Original filename
}
```

### Planned: CaseMessage.attachments Schema

When database persistence is implemented, attachments will be stored as a JSON array on the `CaseMessage` model:

```json
[
  {
    "url": "https://xxx.supabase.co/storage/v1/object/sign/case-uploads/case_id/photo.jpg?token=...",
    "type": "image/jpeg",
    "name": "photo.jpg"
  }
]
```

### Planned: Prisma Schema (Relevant Models)

```prisma
model Case {
  id                  String         @id @default(cuid())
  trackingCode        String         @unique   // "SV-XXXXX-XXXX"
  secretHash          String
  secretSalt          String
  incidentDescription String?
  incidentCategory    IncidentCategory?
  location            String?
  occurredAt          DateTime?
  riskLevel           RiskLevel?
  caseStatus          CaseStatus     @default(OPEN)
  submittedAt         DateTime?
  resolvedAt          DateTime?
  resolution          String?
  assignedToUserId    String?
  failedAttempts      Int            @default(0)
  lockedUntil         DateTime?
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
  messages            CaseMessage[]

  @@index([caseStatus, createdAt])
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
```

## Signed URL Upload Flow (Planned)

### Step 1: Request Upload URL

```typescript
// Client-side
const response = await fetch(`/api/cases/${caseId}/upload`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filename: 'evidence.jpg',
    mimeType: 'image/jpeg',
  }),
});
const { signedUrl, publicUrl } = await response.json();
```

### Step 2: Upload File to Signed URL

```typescript
// Client-side - direct upload to Supabase Storage
await fetch(signedUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type },
});
```

### Step 3: Include in Message

```typescript
// Client-side - send message with attachment reference
void sendMessage({
  text: 'Here is a photo of the safety violation I reported',
  files: attachedFiles,
  data: { clientRequestId: crypto.randomUUID() },
});
```

### Server-Side: Upload Endpoint (Planned)

```typescript
// apps/web/app/api/cases/[caseId]/upload/route.ts
export async function POST(req: Request, ctx: Params): Promise<Response> {
    const { caseId } = await ctx.params;
    const cookieStore = await cookies();
    const token = cookieStore.get(CASE_SESSION_COOKIE)?.value;
    const session = resolveSession(token);
    if (!session || session.caseId !== caseId) {
        return Response.json({ error: 'Session expired.' }, { status: 401 });
    }

    const { filename, mimeType } = await req.json();

    if (!ALLOWED_TYPES.includes(mimeType)) {
        return Response.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const { signedUrl, publicUrl } = await createSignedUploadUrl({
        caseId,
        filename,
        mimeType,
    });

    return Response.json({ signedUrl, publicUrl });
}
```

## AI Context Integration

### How the System Prompt Guides the AI

The AI receives a carefully crafted system prompt that establishes its role as a reporting guidance assistant. Unlike a fact-checking system, the Safe Voices AI does not render verdicts -- it helps users describe their concerns clearly and understand the reporting process.

### System Prompt (Current)

```typescript
export const CHAT_SYSTEM_PROMPT = `You are the Safe Voices assistant. You help visitors understand confidential and anonymous workplace reporting: how to describe concerns clearly, what to expect from a triage process, how tracking codes typically work, and how to stay safe when sharing sensitive information.

You do not provide legal advice, medical advice, or definitive judgments about specific situations. Encourage users to follow their organization's official channels and local laws. Keep answers concise, calm, and respectful.`;
```

### Planned: Context-Enriched System Prompt

When case metadata is available (via database persistence), the system prompt will be dynamically extended:

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
```

### Full Request (Sent to Anthropic via AI Gateway)

The Vercel AI SDK handles message formatting, but conceptually the request looks like:

```json
{
  "model": "anthropic/claude-sonnet-4-5",
  "system": "You are the Safe Voices assistant. You help visitors understand confidential and anonymous workplace reporting...",
  "messages": [
    {
      "role": "assistant",
      "content": "Hello! How can I assist you today?"
    },
    {
      "role": "user",
      "content": "I witnessed something concerning at work and I'm not sure how to report it safely."
    },
    {
      "role": "assistant",
      "content": "I understand this can be a difficult situation. Let me help you think through how to describe your concern clearly and safely.\n\nHere are some things to consider:\n\n1. **What happened**: Describe the specific behavior or event you witnessed, focusing on facts rather than interpretations.\n2. **When and where**: Note the approximate date, time, and location.\n3. **Who was involved**: You can describe roles or positions without necessarily naming individuals.\n4. **Impact**: Explain how this affects you, others, or the organization.\n\nWould you like to start by describing what you observed?"
    },
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "Here is a photo showing the unsafe conditions I mentioned." },
        {
          "type": "image",
          "image": "data:image/jpeg;base64,..."
        }
      ]
    }
  ]
}
```

### Current Limitations

- The AI currently receives **text and image parts** (via Vercel AI SDK's `FileUIPart`). Whether the model processes the image depends on the model's vision capabilities.
- Conversation history is **not persisted** -- messages exist only in the browser's `useChat` state and are lost on page refresh.
- Case metadata (category, location, risk level) is **not yet extracted or fed back** into the system prompt.

### Planned: Reporting Data Extraction

The `@safevoices/ai` package defines extraction field types for structured data extraction from chat conversations:

```typescript
export type ReportingExtractionField =
    | 'incidentDescription'
    | 'location'
    | 'occurredAt'
    | 'attachments'
    | 'riskLevel';
```

A future extraction pipeline will:
1. Analyze the chat conversation after the user submits the case
2. Extract structured fields (incident description, location, date, risk level)
3. Store the extracted data on the Case model
4. Feed the extracted context back into the system prompt for follow-up questions

## Frontend Rendering

### UserMessageBody (Current)

The `UserMessageBody` component renders text content and image attachments from `UIMessage.parts`:

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

### AssistantMessageBody (Current)

Assistant messages are rendered with markdown support via the `MessageContent` component:

```typescript
<MessageContent
    markdown
    className="rounded-3xl bg-white px-4 py-3 text-[16px] leading-[24.4px]"
>
    {body}
</MessageContent>
```

### Thinking Indicator (Current)

While the AI is generating a response, a typing loader is displayed:

```typescript
{showThinkingLoader ? (
    <Message className="max-w-[704px] gap-3">
        <Avatar className="size-10 shrink-0">
            <AvatarFallback className="bg-[#df2929] text-white">
                <Bot className="size-4" aria-hidden />
            </AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2 rounded-3xl bg-white px-4 py-3 text-[#808080]">
            <Loader variant="typing" size="sm" />
            <span className="text-sm">Thinking</span>
        </div>
    </Message>
) : null}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_GATEWAY_API_KEY` | (required) | API key for the AI Gateway (Anthropic) |
| `SAFEVOICES_CHAT_MODEL` | `anthropic/claude-sonnet-4-5` | Model identifier |
| `SAFEVOICES_CHAT_MAX_MESSAGES` | `40` | Maximum messages per conversation |
| `SAFEVOICES_CHAT_MAX_CHARS_PER_MESSAGE` | `12000` | Maximum characters per message |
| `SAFEVOICES_SECRET_PEPPER` | `safevoices-dev-pepper` | HMAC pepper for case secret hashing |

### Planned Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPABASE_STORAGE_BUCKET` | `case-uploads` | Storage bucket name |
| `CHAT_IMAGE_MAX_BYTES` | `5242880` (5 MB) | Maximum upload file size |
| `CHAT_ALLOWED_IMAGE_MIME_TYPES` | `image/png,image/jpeg,image/webp` | Comma-separated allowed types |

### Planned: Supabase Storage Bucket Setup

Create the `case-uploads` bucket in Supabase Dashboard:
1. Navigate to Storage in the Supabase Dashboard
2. Create bucket named `case-uploads`
3. Set access to private (signed URLs only)
4. Configure file size limit to 5 MB
5. No RLS policies needed (uploads use service role via signed URLs)

## Example Interactions

### Example 1: Initial reporting guidance

**Reporter:** "I need to report something that happened at work but I'm scared of being identified."

**AI Response:**
```
I understand your concern about staying anonymous. Here are some things to keep in mind:

1. **Your case tracking code** is the only identifier -- it is not linked to your name, email, or any personal information.
2. **Describe the situation** using facts and observations rather than personal details that could identify you.
3. **Avoid mentioning** your exact role, department, or unique characteristics unless they are essential to the report.

Would you like to start describing what happened? I can help you frame it in a way that protects your identity while still conveying the key details.
```

### Example 2: Describing a safety concern with image

**Reporter uploads a photo and asks:** "This is what the storage area looks like. Chemical containers are left open with no ventilation."

**Chat Display:**
- Reporter message with text and photo thumbnail
- AI guidance response

**AI Response:**
```
Thank you for sharing that photo. Based on your description, this sounds like a workplace safety concern that should be documented carefully.

Here is how I would suggest framing this in your report:

1. **What**: Chemical containers left open without proper ventilation in a storage area.
2. **Where**: Note the specific building, floor, or area if possible.
3. **When**: How long has this been the case? Is it a recurring situation?
4. **Risk**: Open chemical containers without ventilation can pose inhalation hazards.

This type of concern is often handled by your organization's Health & Safety department or a compliance officer. Would you like to add more details before submitting?
```

### Example 3: Harassment reporting

**Reporter:** "My manager has been making comments about my appearance for months. I've asked them to stop but they continue."

**AI Response:**
```
I'm sorry you're experiencing this. What you're describing sounds like it could be workplace harassment, and it's important that you know you have the right to a safe work environment.

To help you create a clear report, consider documenting:

1. **Specific examples**: What comments were made? Can you recall approximate dates?
2. **Frequency**: How often does this happen?
3. **Your response**: You mentioned asking them to stop -- when did that happen and how did they react?
4. **Witnesses**: Were others present during any of these incidents? (You don't need to name them, just note whether there were witnesses.)

This information helps investigators understand the pattern and severity. Would you like to work through these points one at a time?
```

## Troubleshooting

### AI Not Responding
- Check that `AI_GATEWAY_API_KEY` is set and valid in the environment
- Verify `SAFEVOICES_CHAT_MODEL` resolves to a valid model identifier
- Check the browser console for streaming errors
- The chat page displays error banners with a "Dismiss" button for API errors

### Chat Session Expired
- Case sessions have a 15-minute TTL (`SESSION_TTL_MS`)
- Each successful chat request extends the TTL via `touchSession()`
- If the session expires, users see: "Session expired. Please verify your case credentials again."
- Re-verify via `/auth` to get a new session

### Voice Input Not Working
- Web Speech API requires a supported browser (Chrome recommended)
- Check microphone permissions in browser settings
- The fallback message reads: "Voice input unavailable. Speech recognition needs a supported browser. You can still type your message."

### Images Not Displaying
- Currently, images are sent as data URLs (client-side only, no server upload)
- Large images may cause performance issues (data URL encoding)
- Verify the file input accepts the correct MIME types (`accept="image/*"`)

### Case Credentials Lost
- Case secrets are shown **once** at creation and cannot be recovered
- If a user loses their secret, they must create a new case
- Secrets are hashed with scrypt + HMAC and never stored in plaintext

### Missing Case Session Warning
- The chat page shows a warning banner when no `caseId` is in the URL
- Users must navigate through `/auth` to create or verify a case first
- The generic `/api/chat` endpoint works without a case session but provides no case-specific context

## Best Practices

1. **Always start from the auth flow**: Direct users to `/auth` before the chat. The case session provides context and enables case-specific features.
2. **Validate files client-side first**: Check file type, size, and dimensions before uploading to avoid unnecessary API calls.
3. **Use the case tracking code**: Remind users to save their `SV-XXXXX-XXXX` code and secret -- it is their only way to access the case later.
4. **Respect session TTL**: The 15-minute session window balances security with usability. Guide users to complete their report in one session when possible.
5. **Keep conversations focused**: The AI is guidance-only. It does not investigate, render judgments, or provide legal advice.
6. **Plan for persistence**: Current in-memory state is lost on restart. The Prisma schema should be implemented before production deployment.
7. **Protect reporter anonymity**: Never log, store, or transmit information that could identify anonymous reporters (IP addresses, browser fingerprints, etc.).
8. **Idempotent message submission**: When database persistence is implemented, always pass a `clientRequestId` to prevent duplicate messages on network retries.
9. **Test with the mock OTP client**: In development, the email OTP flow uses a mock client where code `123456` always succeeds.
10. **Monitor AI response quality**: The system prompt is critical for appropriate guidance. Review and tune it regularly to ensure the AI stays within its defined boundaries (no legal advice, no definitive judgments).
