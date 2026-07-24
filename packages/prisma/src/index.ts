export { getPrisma } from './client';
export {
    getCaseStore,
    forceMemoryCaseStore,
    resetCaseStoreForTests,
} from './get-case-store';
export {
    isDatabaseConnectivityError,
    shouldFallbackToMemoryStore,
    shouldReportDatabaseUnavailable,
} from './db-errors';
export { getPartnerStore, resetPartnerStoreForTests } from './get-partner-store';
export { canTransitionCaseStatus, ALLOWED_STATUS_TRANSITIONS } from './case-lifecycle';
export type {
    CaseStore,
    CaseSessionRecord,
    CaseMessageRecord,
    MessageAttachmentRef,
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

export function getDatabaseProvider(): 'postgresql' | 'memory' {
    const url = process.env.DATABASE_URL ?? '';
    if (url.startsWith('postgres')) return 'postgresql';
    return 'memory';
}
