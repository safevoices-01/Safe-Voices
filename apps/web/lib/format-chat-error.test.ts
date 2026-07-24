import { describe, expect, it } from 'vitest';
import { resolveChatErrorCopyKey } from './format-chat-error';

describe('resolveChatErrorCopyKey', () => {
    it('maps AI Gateway auth failures to errorAuth', () => {
        expect(
            resolveChatErrorCopyKey(
                new Error(
                    "AI Gateway authentication failed: Invalid API key. Create a new API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys Provide via 'apiKey' option or 'AI_GATEWAY_API_KEY' environment variable.",
                ),
            ),
        ).toBe('errorAuth');
    });

    it('maps missing gateway / unavailable to errorUnavailable', () => {
        expect(
            resolveChatErrorCopyKey(
                new Error('Missing AI_GATEWAY_API_KEY. Add it to the app environment'),
            ),
        ).toBe('errorUnavailable');
        expect(
            resolveChatErrorCopyKey(new Error('Chat is temporarily unavailable.')),
        ).toBe('errorUnavailable');
    });

    it('defaults to errorGeneric', () => {
        expect(resolveChatErrorCopyKey(new Error('stream aborted'))).toBe(
            'errorGeneric',
        );
    });
});
