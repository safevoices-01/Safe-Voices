export { getPrisma } from './client';
export { getCaseStore, resetCaseStoreForTests } from './get-case-store';
export { getPartnerStore, resetPartnerStoreForTests } from './get-partner-store';
export { canTransitionCaseStatus, ALLOWED_STATUS_TRANSITIONS } from './case-lifecycle';
export type {
    CaseStore,
    CaseSessionRecord,
    ExtractionPatch,
    VerifyResult,
    PartnerCaseSummary,
    PartnerCaseDetail,
    TransitionCaseStatusResult,
    CaseStatusValue,
} from './case-store-types';
export type {
    PartnerStore,
    PartnerSessionRecord,
} from './partner-store-types';
export {
    generateSecret,
    generateTrackingCode,
    hashSessionToken,
    mintSessionToken,
} from './crypto';
export { runRetentionPurge } from './jobs/purge';
export { cleanupOrphanUploads } from './jobs/orphan-upload-cleanup';
export {
    createSignedDownloadUrl,
    createSignedUploadUrl,
    deleteStorageObject,
    isAllowedUploadMime,
    isCaseUploadPublicUrl,
    listStorageObjects,
    storageObjectPathFromPublicUrl,
    type SignedUploadResult,
} from './storage';

export function getDatabaseProvider(): 'sqlite' | 'postgresql' {
    const url = process.env.DATABASE_URL ?? '';
    if (url.startsWith('postgres')) return 'postgresql';
    return 'sqlite';
}
