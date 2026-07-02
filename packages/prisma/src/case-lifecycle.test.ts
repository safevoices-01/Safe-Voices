import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canTransitionCaseStatus } from './case-lifecycle';

describe('canTransitionCaseStatus', () => {
    it('allows SUBMITTED to UNDER_REVIEW', () => {
        assert.equal(canTransitionCaseStatus('SUBMITTED', 'UNDER_REVIEW'), true);
    });

    it('rejects OPEN transitions', () => {
        assert.equal(canTransitionCaseStatus('OPEN', 'SUBMITTED'), false);
    });

    it('rejects skipping UNDER_REVIEW from SUBMITTED', () => {
        assert.equal(canTransitionCaseStatus('SUBMITTED', 'RESOLVED'), false);
    });
});
