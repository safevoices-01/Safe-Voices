export type CaseStatusValue =
    | 'OPEN'
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'RESOLVED'
    | 'CLOSED';

export type VerifyResult =
    | { ok: true; token: string; expiresAt: Date }
    | { ok: false; reason: 'invalid' | 'locked' };

export type CaseSessionRecord = {
    token: string;
    caseId: string;
    expiresAt: Date;
};

export type ExtractionPatch = {
    schemaVersion: number;
    fields: Record<string, unknown>;
};

export type MessageAttachmentRef = {
    id: string;
    url: string;
    mimeType: string;
    name: string;
};

export type CaseMessageRecord = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    attachments?: MessageAttachmentRef[];
};

export type ChatPersistInput = {
    caseId: string;
    userContent: string;
    assistantContent: string;
    clientReqId?: string;
    userAttachments?: MessageAttachmentRef[];
    extraction?: ExtractionPatch;
    crisisTriggered?: boolean;
    crisisTriggerType?: string;
};

export type PartnerCaseSummary = {
    caseId: string;
    caseStatus: CaseStatusValue;
    submittedAt: string | null;
    riskLevel: string | null;
    incidentCategory: string | null;
    createdAt: string;
};

export type PartnerCaseDetail = PartnerCaseSummary & {
    messages: Array<{ id: string; role: 'user' | 'assistant'; content: string }>;
    extraction: ExtractionPatch | null;
    attachments: Array<{
        id: string;
        name: string;
        mimeType: string;
        url: string;
        createdAt: string;
    }>;
};

export type CaseAttachmentInput = {
    caseId: string;
    url: string;
    mimeType: string;
    name: string;
    sizeBytes: number;
};

export type CaseAttachmentRecord = {
    id: string;
    url: string;
    mimeType: string;
    name: string;
    sizeBytes: number | null;
    createdAt: string;
};

export type TransitionCaseStatusResult =
    | { ok: true; caseStatus: CaseStatusValue }
    | { ok: false; reason: 'not_found' | 'invalid_transition' };

export interface CaseStore {
    createCase(): Promise<{ caseId: string; secret: string }>;
    verifyCase(input: {
        caseId: string;
        secret: string;
        clientKey?: string;
    }): Promise<VerifyResult>;
    resolveSession(token: string | undefined): Promise<CaseSessionRecord | null>;
    touchSession(token: string): Promise<CaseSessionRecord | null>;
    revokeSession(token: string): Promise<void>;
    isCaseSubmitted(caseId: string): Promise<boolean>;
    markCaseSubmitted(caseId: string): Promise<boolean>;
    getCaseStatus(caseId: string): Promise<CaseStatusValue | null>;
    appendChatTurn(input: ChatPersistInput): Promise<ExtractionPatch | null>;
    listMessages(caseId: string, limit: number): Promise<CaseMessageRecord[]>;
    getExtraction(caseId: string): Promise<ExtractionPatch | null>;
    listPartnerCases(input?: {
        status?: CaseStatusValue;
        search?: string;
    }): Promise<PartnerCaseSummary[]>;
    getPartnerCaseDetail(caseId: string): Promise<PartnerCaseDetail | null>;
    transitionCaseStatus(
        caseId: string,
        toStatus: CaseStatusValue,
    ): Promise<TransitionCaseStatusResult>;
    countAttachments(caseId: string): Promise<number>;
    createAttachment(input: CaseAttachmentInput): Promise<{ id: string } | null>;
    getAttachment(input: {
        caseId: string;
        attachmentId: string;
    }): Promise<CaseAttachmentRecord | null>;
    purgeRetention(cutoff: Date): Promise<number>;
}
