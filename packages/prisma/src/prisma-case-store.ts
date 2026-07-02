import type { MessageRole, Prisma } from '@prisma/client';
import { getPrisma } from './client';
import type {
    CaseAttachmentInput,
    CaseAttachmentRecord,
    CaseMessageRecord,
    CaseSessionRecord,
    CaseStore,
    CaseStatusValue,
    ChatPersistInput,
    ExtractionPatch,
    MessageAttachmentRef,
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

const networkAttempts = new Map<string, { count: number; resetAt: number }>();
const NETWORK_LIMIT = Number(process.env.SAFEVOICES_NETWORK_VERIFY_LIMIT ?? '30');
const NETWORK_WINDOW_MS = 15 * 60 * 1000;

function parseStoredMessageAttachments(
    value: unknown,
): MessageAttachmentRef[] | undefined {
    if (!Array.isArray(value) || value.length === 0) return undefined;
    const parsed: MessageAttachmentRef[] = [];
    for (const item of value) {
        if (
            item &&
            typeof item === 'object' &&
            typeof (item as MessageAttachmentRef).id === 'string' &&
            typeof (item as MessageAttachmentRef).url === 'string' &&
            typeof (item as MessageAttachmentRef).mimeType === 'string' &&
            typeof (item as MessageAttachmentRef).name === 'string'
        ) {
            parsed.push(item as MessageAttachmentRef);
        }
    }
    return parsed.length > 0 ? parsed : undefined;
}

function checkNetworkLimit(clientKey: string | undefined): boolean {
    if (!clientKey) return true;
    const now = Date.now();
    const entry = networkAttempts.get(clientKey);
    if (!entry || entry.resetAt <= now) {
        networkAttempts.set(clientKey, {
            count: 1,
            resetAt: now + NETWORK_WINDOW_MS,
        });
        return true;
    }
    if (entry.count >= NETWORK_LIMIT) return false;
    entry.count += 1;
    return true;
}

export class PrismaCaseStore implements CaseStore {
    async createCase(): Promise<{ caseId: string; secret: string }> {
        const secret = generateSecret();
        const { hash, salt } = await hashSecret(secret);
        let trackingCode = '';
        for (let attempt = 0; attempt < 8; attempt += 1) {
            trackingCode = generateTrackingCode(CASE_PREFIX);
            const existing = await getPrisma().case.findUnique({
                where: { trackingCode },
            });
            if (!existing) break;
        }
        await getPrisma().case.create({
            data: {
                trackingCode,
                secretHash: hash,
                secretSalt: salt,
            },
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

        const record = await getPrisma().case.findUnique({
            where: { trackingCode: input.caseId },
        });
        if (!record) return { ok: false, reason: 'invalid' };

        const now = new Date();
        if (record.lockedUntil && record.lockedUntil.getTime() > now.getTime()) {
            return { ok: false, reason: 'locked' };
        }

        const valid = await verifySecret(
            input.secret,
            record.secretHash,
            record.secretSalt,
        );
        if (!valid) {
            const failedAttempts = record.failedAttempts + 1;
            const lockedUntil =
                failedAttempts >= MAX_ATTEMPTS
                    ? new Date(now.getTime() + LOCKOUT_MS)
                    : null;
            await getPrisma().case.update({
                where: { id: record.id },
                data: { failedAttempts, lockedUntil },
            });
            return { ok: false, reason: lockedUntil ? 'locked' : 'invalid' };
        }

        await getPrisma().case.update({
            where: { id: record.id },
            data: { failedAttempts: 0, lockedUntil: null },
        });

        const token = mintSessionToken();
        const tokenHash = hashSessionToken(token);
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
        await getPrisma().caseSession.create({
            data: {
                caseId: record.id,
                tokenHash,
                expiresAt,
            },
        });
        return { ok: true, token, expiresAt };
    }

    private async findSession(
        token: string | undefined,
    ): Promise<{ sessionId: string; trackingCode: string; token: string; expiresAt: Date; createdAt: Date } | null> {
        if (!token) return null;
        const tokenHash = hashSessionToken(token);
        const row = await getPrisma().caseSession.findUnique({
            where: { tokenHash },
            include: { case: true },
        });
        if (!row || row.revokedAt) return null;
        const now = Date.now();
        if (row.expiresAt.getTime() <= now) {
            await getPrisma().caseSession.delete({ where: { id: row.id } });
            return null;
        }
        if (row.createdAt.getTime() + SESSION_ABSOLUTE_MS <= now) {
            await getPrisma().caseSession.delete({ where: { id: row.id } });
            return null;
        }
        return {
            sessionId: row.id,
            trackingCode: row.case.trackingCode,
            token,
            expiresAt: row.expiresAt,
            createdAt: row.createdAt,
        };
    }

    async resolveSession(
        token: string | undefined,
    ): Promise<CaseSessionRecord | null> {
        const session = await this.findSession(token);
        if (!session) return null;
        return {
            token: session.token,
            caseId: session.trackingCode,
            expiresAt: session.expiresAt,
        };
    }

    async touchSession(token: string): Promise<CaseSessionRecord | null> {
        const session = await this.findSession(token);
        if (!session) return null;
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
        await getPrisma().caseSession.update({
            where: { tokenHash: hashSessionToken(token) },
            data: { expiresAt },
        });
        return {
            token: session.token,
            caseId: session.trackingCode,
            expiresAt,
        };
    }

    async revokeSession(token: string): Promise<void> {
        await getPrisma().caseSession.updateMany({
            where: { tokenHash: hashSessionToken(token) },
            data: { revokedAt: new Date() },
        });
    }

    async isCaseSubmitted(caseId: string): Promise<boolean> {
        const record = await getPrisma().case.findUnique({
            where: { trackingCode: caseId },
            select: { submittedAt: true },
        });
        return Boolean(record?.submittedAt);
    }

    async markCaseSubmitted(caseId: string): Promise<boolean> {
        const record = await getPrisma().case.findUnique({
            where: { trackingCode: caseId },
        });
        if (!record) return false;
        await getPrisma().case.update({
            where: { id: record.id },
            data: {
                submittedAt: new Date(),
                caseStatus: 'SUBMITTED',
            },
        });
        return true;
    }

    async getCaseStatus(caseId: string): Promise<CaseStatusValue | null> {
        const record = await getPrisma().case.findUnique({
            where: { trackingCode: caseId },
            select: { caseStatus: true },
        });
        return (record?.caseStatus as CaseStatusValue) ?? null;
    }

    async appendChatTurn(input: ChatPersistInput): Promise<ExtractionPatch | null> {
        const record = await getPrisma().case.findUnique({
            where: { trackingCode: input.caseId },
        });
        if (!record) return null;

        if (input.clientReqId) {
            const existing = await getPrisma().caseMessage.findUnique({
                where: {
                    caseId_clientReqId: {
                        caseId: record.id,
                        clientReqId: input.clientReqId,
                    },
                },
            });
            if (existing) {
                const ext = await getPrisma().caseExtraction.findUnique({
                    where: { caseId: record.id },
                });
                if (!ext) return null;
                return {
                    schemaVersion: ext.schemaVersion,
                    fields: ext.payload as Record<string, unknown>,
                };
            }
        }

        await getPrisma().$transaction([
            getPrisma().caseMessage.create({
                data: {
                    caseId: record.id,
                    role: 'user' as MessageRole,
                    content: input.userContent,
                    clientReqId: input.clientReqId ?? null,
                    attachments:
                        input.userAttachments && input.userAttachments.length > 0
                            ? (input.userAttachments as Prisma.InputJsonValue)
                            : undefined,
                },
            }),
            getPrisma().caseMessage.create({
                data: {
                    caseId: record.id,
                    role: 'assistant' as MessageRole,
                    content: input.assistantContent,
                },
            }),
        ]);

        if (input.extraction) {
            await getPrisma().caseExtraction.upsert({
                where: { caseId: record.id },
                create: {
                    caseId: record.id,
                    schemaVersion: input.extraction.schemaVersion,
                    payload: input.extraction.fields as Prisma.InputJsonValue,
                },
                update: {
                    schemaVersion: input.extraction.schemaVersion,
                    payload: input.extraction.fields as Prisma.InputJsonValue,
                },
            });
        }

        if (input.crisisTriggered && input.crisisTriggerType) {
            await getPrisma().crisisEvent.create({
                data: {
                    caseId: record.id,
                    triggerType: input.crisisTriggerType,
                },
            });
        }

        return input.extraction ?? null;
    }

    async listMessages(caseId: string, limit: number): Promise<CaseMessageRecord[]> {
        const record = await getPrisma().case.findUnique({
            where: { trackingCode: caseId },
        });
        if (!record) return [];
        const rows = await getPrisma().caseMessage.findMany({
            where: { caseId: record.id, role: { in: ['user', 'assistant'] } },
            orderBy: { createdAt: 'asc' },
            take: limit,
        });
        return rows.map((r) => ({
            id: r.id,
            role: r.role as 'user' | 'assistant',
            content: r.content,
            attachments: parseStoredMessageAttachments(r.attachments),
        }));
    }

    async getExtraction(caseId: string): Promise<ExtractionPatch | null> {
        const record = await getPrisma().case.findUnique({
            where: { trackingCode: caseId },
        });
        if (!record) return null;
        const ext = await getPrisma().caseExtraction.findUnique({
            where: { caseId: record.id },
        });
        if (!ext) return null;
        return {
            schemaVersion: ext.schemaVersion,
            fields: ext.payload as Record<string, unknown>,
        };
    }

    async listPartnerCases(input?: {
        status?: CaseStatusValue;
        search?: string;
    }): Promise<PartnerCaseSummary[]> {
        const search = input?.search?.trim();
        const rows = await getPrisma().case.findMany({
            where: {
                caseStatus: input?.status
                    ? input.status
                    : { not: 'OPEN' },
                ...(search
                    ? { trackingCode: { contains: search.toUpperCase() } }
                    : {}),
            },
            orderBy: { submittedAt: 'desc' },
            select: {
                trackingCode: true,
                caseStatus: true,
                submittedAt: true,
                riskLevel: true,
                incidentCategory: true,
                createdAt: true,
            },
        });
        return rows.map((r) => ({
            caseId: r.trackingCode,
            caseStatus: r.caseStatus as CaseStatusValue,
            submittedAt: r.submittedAt?.toISOString() ?? null,
            riskLevel: r.riskLevel,
            incidentCategory: r.incidentCategory,
            createdAt: r.createdAt.toISOString(),
        }));
    }

    async getPartnerCaseDetail(caseId: string): Promise<PartnerCaseDetail | null> {
        const record = await getPrisma().case.findUnique({
            where: { trackingCode: caseId },
            include: {
                messages: {
                    where: { role: { in: ['user', 'assistant'] } },
                    orderBy: { createdAt: 'asc' },
                },
                extractions: true,
                attachments: { orderBy: { createdAt: 'asc' } },
            },
        });
        if (!record || record.caseStatus === 'OPEN') return null;
        const ext = record.extractions[0];
        return {
            caseId: record.trackingCode,
            caseStatus: record.caseStatus as CaseStatusValue,
            submittedAt: record.submittedAt?.toISOString() ?? null,
            riskLevel: record.riskLevel,
            incidentCategory: record.incidentCategory,
            createdAt: record.createdAt.toISOString(),
            messages: record.messages.map((m) => ({
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
            extraction: ext
                ? {
                      schemaVersion: ext.schemaVersion,
                      fields: ext.payload as Record<string, unknown>,
                  }
                : null,
            attachments: record.attachments.map((a) => ({
                id: a.id,
                name: a.name,
                mimeType: a.mimeType,
                url: a.url,
                createdAt: a.createdAt.toISOString(),
            })),
        };
    }

    async transitionCaseStatus(
        caseId: string,
        toStatus: CaseStatusValue,
    ): Promise<TransitionCaseStatusResult> {
        const record = await getPrisma().case.findUnique({
            where: { trackingCode: caseId },
            select: { id: true, caseStatus: true },
        });
        if (!record) return { ok: false, reason: 'not_found' };
        const from = record.caseStatus as CaseStatusValue;
        if (!canTransitionCaseStatus(from, toStatus)) {
            return { ok: false, reason: 'invalid_transition' };
        }
        await getPrisma().case.update({
            where: { id: record.id },
            data: { caseStatus: toStatus },
        });
        return { ok: true, caseStatus: toStatus };
    }

    async countAttachments(caseId: string): Promise<number> {
        const record = await getPrisma().case.findUnique({
            where: { trackingCode: caseId },
            select: { _count: { select: { attachments: true } } },
        });
        return record?._count.attachments ?? 0;
    }

    async createAttachment(
        input: CaseAttachmentInput,
    ): Promise<{ id: string } | null> {
        const record = await getPrisma().case.findUnique({
            where: { trackingCode: input.caseId },
            select: { id: true },
        });
        if (!record) return null;
        const created = await getPrisma().caseAttachment.create({
            data: {
                caseId: record.id,
                url: input.url,
                mimeType: input.mimeType,
                name: input.name,
                sizeBytes: input.sizeBytes,
            },
        });
        return { id: created.id };
    }

    async getAttachment(input: {
        caseId: string;
        attachmentId: string;
    }): Promise<CaseAttachmentRecord | null> {
        const record = await getPrisma().case.findUnique({
            where: { trackingCode: input.caseId },
            select: { id: true },
        });
        if (!record) return null;
        const attachment = await getPrisma().caseAttachment.findFirst({
            where: { id: input.attachmentId, caseId: record.id },
        });
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

    async purgeRetention(cutoff: Date): Promise<number> {
        const result = await getPrisma().case.deleteMany({
            where: {
                legalHold: false,
                caseStatus: { in: ['RESOLVED', 'CLOSED'] },
                OR: [
                    { submittedAt: { lt: cutoff } },
                    {
                        submittedAt: null,
                        updatedAt: { lt: cutoff },
                    },
                ],
            },
        });
        return result.count;
    }
}
