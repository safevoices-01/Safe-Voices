import type { CaseStore } from './case-store-types';
import { createRequire } from 'node:module';
import { MemoryCaseStore } from './memory-case-store';

const require = createRequire(import.meta.url);

const caseStoreKey = Symbol.for('safevoices.caseStore');

function loadPrismaCaseStore(): new () => CaseStore {
    return require('./prisma-case-store.ts').PrismaCaseStore as new () => CaseStore;
}

export function getCaseStore(): CaseStore {
    const globalStore = globalThis as typeof globalThis & {
        [caseStoreKey]?: CaseStore;
    };
    if (globalStore[caseStoreKey]) return globalStore[caseStoreKey];

    const explicit = process.env.CASE_STORE?.trim();
    const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

    if (explicit === 'memory' || (!explicit && !hasDatabase)) {
        globalStore[caseStoreKey] = new MemoryCaseStore();
    } else {
        const PrismaCaseStore = loadPrismaCaseStore();
        globalStore[caseStoreKey] = new PrismaCaseStore();
    }
    return globalStore[caseStoreKey];
}

export function resetCaseStoreForTests(): void {
    const globalStore = globalThis as typeof globalThis & {
        [caseStoreKey]?: CaseStore;
    };
    delete globalStore[caseStoreKey];
    const memoryStateKey = Symbol.for('safevoices.memoryCaseStore');
    delete (globalThis as typeof globalThis & {
        [key: symbol]: unknown;
    })[memoryStateKey];
}
