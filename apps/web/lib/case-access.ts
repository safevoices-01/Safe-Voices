import { createHash } from 'node:crypto';
import { getCaseStore } from '@safevoices/prisma';

export type CaseSession = {
    token: string;
    caseId: string;
    expiresAt: Date;
};

export const CASE_SESSION_COOKIE = 'sv_case_session';
export const CASE_PREFIX = 'SV';
export const CASE_ID_REGEX = new RegExp(
    `^${CASE_PREFIX}-[A-Z2-9]{5}-[A-Z2-9]{4}$`,
);
export const SECRET_MIN_LENGTH = 16;

export function hashClientKey(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const ip = forwarded ?? req.headers.get('x-real-ip') ?? 'unknown';
    return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

export async function createCaseCredential(): Promise<{
    caseId: string;
    secret: string;
}> {
    return getCaseStore().createCase();
}

export async function verifyCaseCredential(input: {
    caseId: string;
    secret: string;
    clientKey?: string;
}): Promise<
    | { ok: true; token: string; expiresAt: Date }
    | { ok: false; reason: 'invalid' | 'locked' }
> {
    return getCaseStore().verifyCase(input);
}

export async function resolveSession(
    token: string | undefined,
): Promise<CaseSession | null> {
    return getCaseStore().resolveSession(token);
}

export async function touchSession(token: string): Promise<CaseSession | null> {
    return getCaseStore().touchSession(token);
}

export async function revokeSession(token: string): Promise<void> {
    return getCaseStore().revokeSession(token);
}

export async function markCaseSubmitted(caseId: string): Promise<boolean> {
    return getCaseStore().markCaseSubmitted(caseId);
}

export async function isCaseSubmitted(caseId: string): Promise<boolean> {
    return getCaseStore().isCaseSubmitted(caseId);
}

export async function getCaseStatus(
    caseId: string,
): Promise<string | null> {
    return getCaseStore().getCaseStatus(caseId);
}

export { getCaseStore } from '@safevoices/prisma';
