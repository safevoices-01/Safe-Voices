# feat-0030: Tech Spec — Google Gemini chat provider

## Context

See [`PRODUCT.md`](./PRODUCT.md). Wires `@ai-sdk/google` into `createChatStreamResponse`.

## Modules

| File | Role |
|------|------|
| `packages/ai/src/chat.ts` | Provider selection + model helpers |
| `packages/ai/src/chat-post.ts` | Uses `getChatModel()`; requires any configured provider key |
| `apps/web/.env.example` | Documents Gemini env vars |

## Env

| Variable | Required | Purpose |
|----------|----------|---------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | One of Gemini/Gateway | Google Generative Language API key |
| `GEMINI_API_KEY` | Alias | Same as above if Google-named var unset |
| `AI_GATEWAY_API_KEY` | Fallback | Vercel AI Gateway |
| `SAFEVOICES_CHAT_MODEL` | Optional | Gemini: `gemini-flash-latest` (default). Gateway: `provider/model` |

## Runtime sketch

```ts
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
if (key) {
  const google = createGoogleGenerativeAI({ apiKey: key });
  return google('gemini-flash-latest');
}
// else AI Gateway string model id
```

Equivalent REST probe (ops only; app uses AI SDK streaming):

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent" \
  -H "Content-Type: application/json" \
  -H "X-goog-api-key: $GOOGLE_GENERATIVE_AI_API_KEY" \
  -d '{"contents":[{"parts":[{"text":"ping"}]}]}'
```

## Testing

```bash
pnpm --filter @safevoices/ai test
pnpm --filter @safevoices/ai typecheck
# With key in apps/web/.env — send a chat message in /en/demo or reporting chat
```

## Related

- [feat-0030 PRODUCT](./PRODUCT.md)
- [feat-0007 TECH](../feat-0007-general-ai-chat/TECH.md)
