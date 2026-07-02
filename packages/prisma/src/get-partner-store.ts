import type { PartnerStore } from './partner-store-types';
import { MemoryPartnerStore } from './memory-partner-store';

const partnerStoreKey = Symbol.for('safevoices.partnerStore');

export function getPartnerStore(): PartnerStore {
    const globalStore = globalThis as typeof globalThis & {
        [partnerStoreKey]?: PartnerStore;
    };
    if (!globalStore[partnerStoreKey]) {
        globalStore[partnerStoreKey] = new MemoryPartnerStore();
    }
    return globalStore[partnerStoreKey];
}

export { resetPartnerStoreForTests } from './memory-partner-store';
