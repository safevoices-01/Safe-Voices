import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
    getChatProvider,
    getGeminiApiKey,
    hasChatProviderCredentials,
} from './chat';

const KEYS = [
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'GEMINI_API_KEY',
    'AI_GATEWAY_API_KEY',
    'SAFEVOICES_CHAT_MODEL',
] as const;

const saved: Partial<Record<(typeof KEYS)[number], string | undefined>> = {};

function stashEnv(): void {
    for (const key of KEYS) {
        saved[key] = process.env[key];
        delete process.env[key];
    }
}

function restoreEnv(): void {
    for (const key of KEYS) {
        const value = saved[key];
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
}

describe('chat provider selection', () => {
    afterEach(() => {
        restoreEnv();
    });

    it('prefers Gemini when GOOGLE_GENERATIVE_AI_API_KEY is set', () => {
        stashEnv();
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-key';
        process.env.AI_GATEWAY_API_KEY = 'gateway-key';
        assert.equal(getChatProvider(), 'gemini');
        assert.equal(hasChatProviderCredentials(), true);
        assert.equal(getGeminiApiKey(), 'test-google-key');
    });

    it('accepts GEMINI_API_KEY alias', () => {
        stashEnv();
        process.env.GEMINI_API_KEY = 'alias-key';
        assert.equal(getChatProvider(), 'gemini');
        assert.equal(getGeminiApiKey(), 'alias-key');
    });

    it('falls back to gateway when only AI_GATEWAY_API_KEY is set', () => {
        stashEnv();
        process.env.AI_GATEWAY_API_KEY = 'gateway-key';
        assert.equal(getChatProvider(), 'gateway');
        assert.equal(hasChatProviderCredentials(), true);
    });

    it('returns none without credentials', () => {
        stashEnv();
        assert.equal(getChatProvider(), 'none');
        assert.equal(hasChatProviderCredentials(), false);
    });
});
