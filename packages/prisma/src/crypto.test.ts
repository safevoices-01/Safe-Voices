import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashSecret, verifySecret } from './crypto';

describe('crypto hashSecret/verifySecret', () => {
    it('round-trips scrypt hashes', async () => {
        const secret = 'test-secret-value-1234';
        const { hash, salt } = await hashSecret(secret);
        assert.match(hash, /^scrypt\$/);
        assert.equal(await verifySecret(secret, hash, salt), true);
        assert.equal(await verifySecret('wrong-secret', hash, salt), false);
    });
});
