import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
    MemoryPartnerStore,
    resetMemoryPartnerStoreForTests,
} from './memory-partner-store';

describe('MemoryPartnerStore', () => {
    beforeEach(() => {
        resetMemoryPartnerStoreForTests();
        process.env.PARTNER_ALLOWLIST = 'partner@example.com';
    });

    it('issues OTP for allowlisted email', async () => {
        const store = new MemoryPartnerStore();
        const result = await store.issueOtp('partner@example.com');
        assert.equal(result.ok, true);
        if (result.ok) {
            assert.match(result.code, /^\d{6}$/);
        }
    });

    it('rejects non-allowlisted email', async () => {
        const store = new MemoryPartnerStore();
        const result = await store.issueOtp('unknown@example.com');
        assert.deepEqual(result, { ok: false, reason: 'not_allowed' });
    });

    it('verifies a valid OTP and creates a session', async () => {
        const store = new MemoryPartnerStore();
        const issued = await store.issueOtp('partner@example.com');
        assert.equal(issued.ok, true);
        if (!issued.ok) return;

        const verified = await store.verifyOtp('partner@example.com', issued.code);
        assert.equal(verified.ok, true);
        if (!verified.ok) return;

        const session = await store.resolveSession(verified.token);
        assert.equal(session?.email, 'partner@example.com');
    });
});
