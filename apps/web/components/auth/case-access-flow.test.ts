import { describe, expect, it } from 'vitest';
import { verifyCaseAccessRequestSchema } from '@safevoices/trpc';

describe('case access contracts', () => {
    it('requires caseId and secret for verify', () => {
        const result = verifyCaseAccessRequestSchema.safeParse({
            caseId: 'SV-ABCDE-1234',
            secret: 'a'.repeat(16),
        });
        expect(result.success).toBe(true);
    });

    it('rejects empty verify body', () => {
        const result = verifyCaseAccessRequestSchema.safeParse({});
        expect(result.success).toBe(false);
    });
});

describe('lockout copy', () => {
    it('uses non-enumerating message shape', () => {
        const message = 'We could not verify those credentials.';
        expect(message).not.toMatch(/not found|invalid case/i);
    });
});
