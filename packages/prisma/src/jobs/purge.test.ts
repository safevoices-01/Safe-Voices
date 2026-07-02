import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { getCaseStore, resetCaseStoreForTests } from '../get-case-store';
import { runRetentionPurge } from './purge';

describe('runRetentionPurge', () => {
    beforeEach(() => {
        resetCaseStoreForTests();
        process.env.RETENTION_DAYS = '30';
    });

    it('skips cases on legal hold', async () => {
        const store = getCaseStore();
        const { caseId } = await store.createCase();
        await store.markCaseSubmitted(caseId);
        await store.transitionCaseStatus(caseId, 'UNDER_REVIEW');
        await store.transitionCaseStatus(caseId, 'RESOLVED');

        const record = findMemoryCase(caseId);
        assert.ok(record);
        record.legalHold = true;
        record.submittedAt = new Date('2020-01-01');

        const result = await runRetentionPurge();
        assert.equal(result.purged, 0);
        assert.equal(await store.getCaseStatus(caseId), 'RESOLVED');
    });

    it('purges terminal cases older than retention window', async () => {
        const store = getCaseStore();
        const { caseId } = await store.createCase();
        await store.markCaseSubmitted(caseId);
        await store.transitionCaseStatus(caseId, 'UNDER_REVIEW');
        await store.transitionCaseStatus(caseId, 'CLOSED');

        const record = findMemoryCase(caseId);
        assert.ok(record);
        record.submittedAt = new Date('2020-01-01');

        const result = await runRetentionPurge();
        assert.equal(result.purged, 1);
        assert.equal(await store.getCaseStatus(caseId), null);
    });
});

function findMemoryCase(trackingCode: string): {
    legalHold: boolean;
    submittedAt: Date | null;
} | null {
    const globalState = globalThis as typeof globalThis & {
        [key: symbol]: {
            cases: Map<
                string,
                {
                    trackingCode: string;
                    legalHold: boolean;
                    submittedAt: Date | null;
                }
            >;
        };
    };
    const state = globalState[Symbol.for('safevoices.memoryCaseStore')];
    if (!state) return null;
    for (const record of state.cases.values()) {
        if (record.trackingCode === trackingCode) return record;
    }
    return null;
}
