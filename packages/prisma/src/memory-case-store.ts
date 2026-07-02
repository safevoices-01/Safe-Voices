import type {
    CaseAttachmentInput,
    CaseAttachmentRecord,
    CaseSessionRecord,
    CaseStore,
    CaseStatusValue,
    ChatPersistInput,
    ExtractionPatch,
    PartnerCaseDetail,
    PartnerCaseSummary,
    TransitionCaseStatusResult,
    VerifyResult,
} from './case-store-types';
import {
    generateSecret,
    generateTrackingCode,
    hashSecret,
    hashSessionToken,
    mintSessionToken,
    verifySecret,
} from './crypto';
import { canTransitionCaseStatus } from './case-lifecycle';

const CASE_PREFIX = 'SV';
const SESSION_TTL_MS = 15 * 60 * 1000;
const SESSION_ABSOLUTE_MS = 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000;

type MemoryStoreState = {
    cases: Map<string, MemoryCase>;
    sessionsByHash: Map<string, MemorySession>;
    networkAttempts: Map<string, { count: number; resetAt: number }>;
};

const memoryStateKey = Symbol.for('safevoices.memoryCaseStore');

function getMemoryState(): MemoryStoreState {
    const globalStore = globalThis as typeof globalThis & {
        [memoryStateKey]?: MemoryStoreState;
    };
    if (!globalStore[memoryStateKey]) {
        globalStore[memoryStateKey] = {
            cases: new Map(),
            sessionsByHash: new Map(),
            networkAttempts: new Map(),
        };
    }
    return globalStore[memoryStateKey];
}

type MemoryAttachment = {
    id: string;
    url: string;
    mimeType: string;
    name: string;
    sizeBytes: number;
    createdAt: Date;
};

type MemoryCase = {
    internalId: string;
    trackingCode: string;
    secretHash: string;
    secretSalt: string;
    caseStatus: CaseStatusValue;
    submittedAt: Date | null;
    failedAttempts: number;
    lockedUntil: Date | null;
    legalHold: boolean;
    createdAt: Date;
    extraction: ExtractionPatch | null;
    messages: Array<{ id: string; role: 'user' | 'assistant'; content: string }>;
    attachments: MemoryAttachment[];
};

type MemorySession = {
    token: string;
    tokenHash: string;
    caseId: string;
    trackingCode: string;
    expiresAt: Date;
    createdAt: Date;
};

const cases = () => getMemoryState().cases;
const sessionsByHash = () => getMemoryState().sessionsByHash;
const networkAttempts = () => getMemoryState().networkAttempts;

const NETWORK_LIMIT = Number(process.env.SAFEVOICES_NETWORK_VERIFY_LIMIT ?? '30');
const NETWORK_WINDOW_MS = 15 * 60 * 1000;

function checkNetworkLimit(clientKey: string | undefined): boolean {
    if (!clientKey) return true;
    const now = Date.now();
    const entry = networkAttempts().get(clientKey);
    if (!entry || entry.resetAt <= now) {
        networkAttempts().set(clientKey, {
            count: 1,
            resetAt: now + NETWORK_WINDOW_MS,
        });
        return true;
    }
    if (entry.count >= NETWORK_LIMIT) return false;
    entry.count += 1;
    return true;
}

function findCase(trackingCode: string): MemoryCase | undefined {
    for (const record of cases().values()) {
        if (record.trackingCode === trackingCode) return record;
    }
    return undefined;
}

export class MemoryCaseStore implements CaseStore {
    async createCase(): Promise<{ caseId: string; secret: string }> {
        const secret = generateSecret();
        const { hash, salt } = await hashSecret(secret);
        let trackingCode = '';
        do {
            trackingCode = generateTrackingCode(CASE_PREFIX);
        } while (findCase(trackingCode));

        const internalId = crypto.randomUUID();
        cases().set(internalId, {
            internalId,
            trackingCode,
            secretHash: hash,
            secretSalt: salt,
            caseStatus: 'OPEN',
            submittedAt: null,
            failedAttempts: 0,
            lockedUntil: null,
            legalHold: false,
            createdAt: new Date(),
            extraction: null,
            messages: [],
            attachments: [],
        });
        return { caseId: trackingCode, secret };
    }

    async verifyCase(input: {
        caseId: string;
        secret: string;
        clientKey?: string;
    }): Promise<VerifyResult> {
        if (!checkNetworkLimit(input.clientKey)) {
            return { ok: false, reason: 'locked' };
        }

        const record = findCase(input.caseId);
        if (!record) return { ok: false, reason: 'invalid' };

        const now = new Date();
        if (record.lockedUntil && record.lockedUntil.getTime() > now.getTime()) {
            return { ok: false, reason: 'locked' };
        }
        if (record.lockedUntil && record.lockedUntil.getTime() <= now.getTime()) {
            record.failedAttempts = 0;
            record.lockedUntil = null;
        }

        const valid = await verifySecret(
            input.secret,
            record.secretHash,
            record.secretSalt,
        );
        if (!valid) {
            record.failedAttempts += 1;
            if (record.failedAttempts >= MAX_ATTEMPTS) {
                record.lockedUntil = new Date(now.getTime() + LOCKOUT_MS);
            }
            return {
                ok: false,
                reason: record.lockedUntil ? 'locked' : 'invalid',
            };
        }

        record.failedAttempts = 0;
        record.lockedUntil = null;
        const token = mintSessionToken();
        const tokenHash = hashSessionToken(token);
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
        sessionsByHash().set(tokenHash, {
            token,
            tokenHash,
            caseId: record.internalId,
            trackingCode: record.trackingCode,
            expiresAt,
            createdAt: new Date(),
        });
        return { ok: true, token, expiresAt };
    }

    private getSession(token: string | undefined): MemorySession | null {
        if (!token) return null;
        const session = sessionsByHash().get(hashSessionToken(token));
        if (!session) return null;
        const now = Date.now();
        if (session.expiresAt.getTime() <= now) {
            sessionsByHash().delete(session.tokenHash);
            return null;
        }
        if (session.createdAt.getTime() + SESSION_ABSOLUTE_MS <= now) {
            sessionsByHash().delete(session.tokenHash);
            return null;
        }
        return session;
    }

    async resolveSession(
        token: string | undefined,
    ): Promise<CaseSessionRecord | null> {
        const session = this.getSession(token);
        if (!session) return null;
        return {
            token: session.token,
            caseId: session.trackingCode,
            expiresAt: session.expiresAt,
        };
    }

    async touchSession(token: string): Promise<CaseSessionRecord | null> {
        const session = this.getSession(token);
        if (!session) return null;
        session.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
        sessionsByHash().set(session.tokenHash, session);
        return {
            token: session.token,
            caseId: session.trackingCode,
            expiresAt: session.expiresAt,
        };
    }

    async revokeSession(token: string): Promise<void> {
        sessionsByHash().delete(hashSessionToken(token));
    }

    async isCaseSubmitted(caseId: string): Promise<boolean> {
        const record = findCase(caseId);
        return Boolean(record?.submittedAt);
    }

    async markCaseSubmitted(caseId: string): Promise<boolean> {
        const record = findCase(caseId);
        if (!record) return false;
        record.submittedAt = new Date();
        record.caseStatus = 'SUBMITTED';
        return true;
    }

    async getCaseStatus(caseId: string): Promise<CaseStatusValue | null> {
        return findCase(caseId)?.caseStatus ?? null;
    }

    async appendChatTurn(input: ChatPersistInput): Promise<ExtractionPatch | null> {
        const record = findCase(input.caseId);
        if (!record) return null;
        if (input.clientReqId) {
            const dup = record.messages.some(
                (m) => m.id === `req-${input.clientReqId}`,
            );
            if (dup) return record.extraction;
        }
        record.messages.push({
            id: input.clientReqId
                ? `req-${input.clientReqId}-user`
                : crypto.randomUUID(),
            role: 'user',
            content: input.userContent,
        });
        record.messages.push({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: input.assistantContent,
        });
        if (input.extraction) {
            record.extraction = input.extraction;
        }
        return record.extraction;
    }

    async listMessages(
        caseId: string,
        limit: number,
    ): Promise<
        Array<{ id: string; role: 'user' | 'assistant'; content: string }>
    > {
        const record = findCase(caseId);
        if (!record) return [];
        return record.messages.slice(-limit);
    }

    async getExtraction(caseId: string): Promise<ExtractionPatch | null> {
        return findCase(caseId)?.extraction ?? null;
    }

    async listPartnerCases(input?: {
        status?: CaseStatusValue;
        search?: string;
    }): Promise<PartnerCaseSummary[]> {
        const search = input?.search?.trim().toUpperCase();
        const rows: PartnerCaseSummary[] = [];
        for (const record of cases().values()) {
            if (record.caseStatus === 'OPEN') continue;
            if (input?.status && record.caseStatus !== input.status) continue;
            if (search && !record.trackingCode.includes(search)) continue;
            rows.push({
                caseId: record.trackingCode,
                caseStatus: record.caseStatus,
                submittedAt: record.submittedAt?.toISOString() ?? null,
                riskLevel: null,
                incidentCategory: null,
                createdAt: record.submittedAt?.toISOString() ?? new Date().toISOString(),
            });
        }
        return rows.sort((a, b) =>
            (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''),
        );
    }

    async getPartnerCaseDetail(caseId: string): Promise<PartnerCaseDetail | null> {
        const record = findCase(caseId);
        if (!record || record.caseStatus === 'OPEN') return null;
        return {
            caseId: record.trackingCode,
            caseStatus: record.caseStatus,
            submittedAt: record.submittedAt?.toISOString() ?? null,
            riskLevel: null,
            incidentCategory: null,
            createdAt: record.submittedAt?.toISOString() ?? new Date().toISOString(),
            messages: record.messages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
            })),
            extraction: record.extraction,
            attachments: record.attachments.map((a) => ({
                id: a.id,
                name: a.name,
                mimeType: a.mimeType,
                url: a.url,
                createdAt: a.createdAt.toISOString(),
            })),
        };
    }

    async countAttachments(caseId: string): Promise<number> {
        return findCase(caseId)?.attachments.length ?? 0;
    }

    async createAttachment(
        input: CaseAttachmentInput,
    ): Promise<{ id: string } | null> {
        const record = findCase(input.caseId);
        if (!record) return null;
        const id = crypto.randomUUID();
        record.attachments.push({
            id,
            url: input.url,
            mimeType: input.mimeType,
            name: input.name,
            sizeBytes: input.sizeBytes,
            createdAt: new Date(),
        });
        return { id };
    }

    async getAttachment(input: {
        caseId: string;
        attachmentId: string;
    }): Promise<CaseAttachmentRecord | null> {
        const record = findCase(input.caseId);
        if (!record) return null;
        const attachment = record.attachments.find(
            (row) => row.id === input.attachmentId,
        );
        if (!attachment) return null;
        return {
            id: attachment.id,
            url: attachment.url,
            mimeType: attachment.mimeType,
            name: attachment.name,
            sizeBytes: attachment.sizeBytes,
            createdAt: attachment.createdAt.toISOString(),
        };
    }

    async transitionCaseStatus(
        caseId: string,
        toStatus: CaseStatusValue,
    ): Promise<TransitionCaseStatusResult> {
        const record = findCase(caseId);
        if (!record) return { ok: false, reason: 'not_found' };
        if (!canTransitionCaseStatus(record.caseStatus, toStatus)) {
            return { ok: false, reason: 'invalid_transition' };
        }
        record.caseStatus = toStatus;
        return { ok: true, caseStatus: toStatus };
    }

    async purgeRetention(cutoff: Date): Promise<number> {
        let purged = 0;
        for (const [internalId, record] of cases().entries()) {
            if (record.legalHold) continue;
            if (record.caseStatus !== 'RESOLVED' && record.caseStatus !== 'CLOSED') {
                continue;
            }
            const anchor = record.submittedAt ?? record.createdAt;
            if (anchor.getTime() > cutoff.getTime()) continue;
            cases().delete(internalId);
            for (const [hash, session] of sessionsByHash().entries()) {
                if (session.caseId === internalId) {
                    sessionsByHash().delete(hash);
                }
            }
            purged += 1;
        }
        return purged;
    }
}
