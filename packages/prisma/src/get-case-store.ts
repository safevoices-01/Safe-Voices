import type { CaseStore } from './case-store-types';
import { MemoryCaseStore } from './memory-case-store';
import { PrismaCaseStore } from './prisma-case-store';

const caseStoreKey = Symbol.for('safevoices.caseStore');

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
