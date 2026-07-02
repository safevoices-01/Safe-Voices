# feat-0028: Message attachment linkage — TECH

See [PRODUCT.md](./PRODUCT.md).

## Data model

`CaseMessage.attachments` JSON array:

```json
[
  {
    "id": "cuid",
    "url": "https://…/cases/SV-…/file.png",
    "mimeType": "image/png",
    "name": "screenshot.png"
  }
]
```

## API changes

### `POST /api/cases/:caseId/chat`

Request body adds optional:

```json
{
  "messages": [],
  "clientRequestId": "uuid",
  "locale": "en",
  "messageAttachments": [
    {
      "id": "att-id",
      "url": "https://…",
      "mimeType": "image/png",
      "name": "shot.png"
    }
  ]
}
```

Server validates each `id` via `getAttachment(caseId, id)` and URL match.

### `GET /api/cases/:caseId/messages`

User messages may include `attachments: MessageAttachmentRef[]`.

## Modules

| File | Role |
|------|------|
| `packages/prisma/src/case-store-types.ts` | `MessageAttachmentRef`, `ChatPersistInput.userAttachments` |
| `packages/prisma/src/memory-case-store.ts` | Persist + list attachments on messages |
| `packages/prisma/src/prisma-case-store.ts` | `attachments` JSON column |
| `packages/trpc/src/message-attachments.ts` | Parse + validate refs |
| `packages/trpc/src/case-handlers.ts` | Wire validation into chat POST |
| `packages/trpc/src/upload-handlers.ts` | Submit guard (existing `gateReporterUpload`) |
| `apps/web/lib/message-attachments.ts` | Client helpers: parts, history restore |
| `apps/web/components/chat/chat-experience.tsx` | Upload → storage URL send |

## Tests

```bash
pnpm --filter @safevoices/trpc test
pnpm --filter @safevoices/web test
```

| Test | File |
|------|------|
| Upload submit guard (presign + confirm) | `upload-handlers.test.ts` |
| Message attachment validation | `message-attachments.test.ts` |
| Client history parts | `message-attachments.test.ts` (web) |

## Related

- [feat-0026 PRODUCT](../feat-0026-image-upload/PRODUCT.md)
- [feat-0028 PRODUCT](./PRODUCT.md)
