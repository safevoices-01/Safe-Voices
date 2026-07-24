import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    isDatabaseConnectivityError,
    shouldFallbackToMemoryStore,
} from './db-errors';

describe('db-errors', () => {
    it('detects Supabase tenant ENOTFOUND adapter errors', () => {
        const error = new Error(
            '(ENOTFOUND) tenant/user postgres.abc not found',
        );
        error.name = 'DriverAdapterError';
        assert.equal(isDatabaseConnectivityError(error), true);
    });

    it('detects nested cause codes', () => {
        const cause = new Error('connect ECONNREFUSED 127.0.0.1:5432');
        const error = new Error('query failed');
        (error as Error & { cause: Error }).cause = cause;
        assert.equal(isDatabaseConnectivityError(error), true);
    });

    it('ignores unrelated errors', () => {
        assert.equal(
            isDatabaseConnectivityError(new Error('secret hash failed')),
            false,
        );
    });

    it('allows memory fallback outside production', () => {
        const prevNode = process.env.NODE_ENV;
        const prevStore = process.env.CASE_STORE;
        process.env.NODE_ENV = 'development';
        delete process.env.CASE_STORE;
        try {
            const error = new Error('ENOTFOUND tenant/user');
            assert.equal(shouldFallbackToMemoryStore(error), true);
        } finally {
            process.env.NODE_ENV = prevNode;
            if (prevStore === undefined) delete process.env.CASE_STORE;
            else process.env.CASE_STORE = prevStore;
        }
    });

    it('blocks memory fallback in production', () => {
        const prevNode = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            const error = new Error('ENOTFOUND tenant/user');
            assert.equal(shouldFallbackToMemoryStore(error), false);
        } finally {
            process.env.NODE_ENV = prevNode;
        }
    });
});
