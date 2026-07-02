import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    CASE_ID_REGEX,
    SECRET_MIN_LENGTH,
    extractBearerToken,
} from './case-http';

describe('extractBearerToken', () => {
    it('parses Bearer tokens', () => {
        assert.equal(extractBearerToken('Bearer abc123'), 'abc123');
    });

    it('returns undefined for missing or invalid headers', () => {
        assert.equal(extractBearerToken(undefined), undefined);
        assert.equal(extractBearerToken('Basic abc'), undefined);
    });
});

describe('case credential constants', () => {
    it('validates tracking code shape', () => {
        assert.equal(CASE_ID_REGEX.test('SV-ABCDE-FGHJ'), true);
        assert.equal(CASE_ID_REGEX.test('sv-abcde-fghj'), false);
    });

    it('requires minimum secret length', () => {
        assert.equal(SECRET_MIN_LENGTH, 16);
    });
});
