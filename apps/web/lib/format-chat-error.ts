/**
 * Maps AI SDK / gateway errors to safe, user-facing chat copy keys.
 * Never surface API keys, Vercel URLs, or env var names to reporters.
 */
export type ChatErrorCopyKey =
    | 'errorAuth'
    | 'errorUnavailable'
    | 'errorGeneric';

export function resolveChatErrorCopyKey(error: unknown): ChatErrorCopyKey {
    const text = collectErrorText(error).toLowerCase();

    if (
        text.includes('invalid api key') ||
        text.includes('authentication failed') ||
        text.includes('unauthorized') ||
        /\b401\b/.test(text)
    ) {
        return 'errorAuth';
    }

    if (
        text.includes('chat_disabled') ||
        text.includes('chat is temporarily unavailable') ||
        text.includes('chat_unavailable') ||
        text.includes('missing ai_gateway') ||
        text.includes('ai_gateway_api_key') ||
        text.includes('overloaded') ||
        text.includes('rate limit') ||
        text.includes('temporarily unavailable') ||
        /\b503\b/.test(text)
    ) {
        return 'errorUnavailable';
    }

    return 'errorGeneric';
}

function collectErrorText(error: unknown): string {
    const parts: string[] = [];
    let current: unknown = error;
    for (let depth = 0; depth < 5 && current; depth += 1) {
        if (current instanceof Error) {
            parts.push(current.name, current.message);
            current = (current as Error & { cause?: unknown }).cause;
            continue;
        }
        if (typeof current === 'string') {
            parts.push(current);
            break;
        }
        if (typeof current === 'object' && current !== null) {
            const record = current as Record<string, unknown>;
            if (typeof record.message === 'string') parts.push(record.message);
            if (typeof record.error === 'string') parts.push(record.error);
            if (typeof record.code === 'string') parts.push(record.code);
            current = record.cause;
            continue;
        }
        break;
    }
    return parts.join(' ');
}
