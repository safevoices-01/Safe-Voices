import { createHash, timingSafeEqual } from 'node:crypto';
import type {
    IssueOtpResult,
    PartnerSessionRecord,
    PartnerStore,
    VerifyPartnerOtpResult,
} from './partner-store-types';
import {
    hashSessionToken,
    mintSessionToken,
} from './crypto';

const DEFAULT_ORG = 'default-org';
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? '5');
const OTP_RESEND_COOLDOWN_MS =
    Number(process.env.OTP_RESEND_COOLDOWN_SEC ?? '60') * 1000;
const PARTNER_SESSION_TTL_MS = Number(
    process.env.SAFEVOICES_PARTNER_SESSION_TTL ?? String(8 * 60 * 60),
) * 1000;

type OtpChallenge = {
    email: string;
    codeHash: string;
    attempts: number;
    expiresAt: Date;
    lastSentAt: Date;
};

type MemoryPartnerSession = {
    token: string;
    tokenHash: string;
    partnerUserId: string;
    email: string;
    orgId: string;
    expiresAt: Date;
};

type PartnerMemoryState = {
    challenges: Map<string, OtpChallenge>;
    sessionsByHash: Map<string, MemoryPartnerSession>;
};

const partnerMemoryStateKey = Symbol.for('safevoices.memoryPartnerStore');

function getPartnerMemoryState(): PartnerMemoryState {
    const globalStore = globalThis as typeof globalThis & {
        [partnerMemoryStateKey]?: PartnerMemoryState;
    };
    if (!globalStore[partnerMemoryStateKey]) {
        globalStore[partnerMemoryStateKey] = {
            challenges: new Map(),
            sessionsByHash: new Map(),
        };
    }
    return globalStore[partnerMemoryStateKey];
}

const challenges = () => getPartnerMemoryState().challenges;
const sessionsByHash = () => getPartnerMemoryState().sessionsByHash;

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function hashOtpCode(email: string, code: string): string {
    return createHash('sha256')
        .update(`${email}:${code}:partner-otp`)
        .digest('hex');
}

function generateOtpCode(): string {
    return String(Math.floor(100_000 + Math.random() * 900_000));
}

function getAllowlist(): Set<string> {
    const raw =
        process.env.PARTNER_ALLOWLIST?.trim() ??
        'partner@example.com,investigator@example.com';
    return new Set(
        raw
            .split(',')
            .map((e) => normalizeEmail(e))
            .filter(Boolean),
    );
}

function partnerUserIdFor(email: string): string {
    return createHash('sha256').update(`partner:${email}`).digest('hex').slice(0, 16);
}

export class MemoryPartnerStore implements PartnerStore {
    async issueOtp(email: string): Promise<IssueOtpResult> {
        const normalized = normalizeEmail(email);
        if (!getAllowlist().has(normalized)) {
            return { ok: false, reason: 'not_allowed' };
        }

        const existing = challenges().get(normalized);
        const now = Date.now();
        if (
            existing &&
            now - existing.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS
        ) {
            return { ok: false, reason: 'rate_limited' };
        }

        const code = generateOtpCode();
        challenges().set(normalized, {
            email: normalized,
            codeHash: hashOtpCode(normalized, code),
            attempts: 0,
            expiresAt: new Date(now + OTP_TTL_MS),
            lastSentAt: new Date(now),
        });
        return { ok: true, code };
    }

    async verifyOtp(
        email: string,
        code: string,
    ): Promise<VerifyPartnerOtpResult> {
        const normalized = normalizeEmail(email);
        const challenge = challenges().get(normalized);
        if (!challenge) {
            return { ok: false, reason: 'invalid' };
        }
        if (challenge.expiresAt.getTime() <= Date.now()) {
            challenges().delete(normalized);
            return { ok: false, reason: 'expired' };
        }
        if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
            return { ok: false, reason: 'locked' };
        }

        const hash = hashOtpCode(normalized, code.trim());
        const valid =
            hash.length === challenge.codeHash.length &&
            timingSafeEqual(
                Buffer.from(hash, 'utf8'),
                Buffer.from(challenge.codeHash, 'utf8'),
            );
        if (!valid) {
            challenge.attempts += 1;
            challenges().set(normalized, challenge);
            return {
                ok: false,
                reason: challenge.attempts >= OTP_MAX_ATTEMPTS ? 'locked' : 'invalid',
            };
        }

        challenges().delete(normalized);
        const token = mintSessionToken();
        const tokenHash = hashSessionToken(token);
        const expiresAt = new Date(Date.now() + PARTNER_SESSION_TTL_MS);
        sessionsByHash().set(tokenHash, {
            token,
            tokenHash,
            partnerUserId: partnerUserIdFor(normalized),
            email: normalized,
            orgId: DEFAULT_ORG,
            expiresAt,
        });
        return {
            ok: true,
            token,
            expiresAt,
            partnerUserId: partnerUserIdFor(normalized),
            email: normalized,
            orgId: DEFAULT_ORG,
        };
    }

    private getSession(token: string | undefined): MemoryPartnerSession | null {
        if (!token) return null;
        const session = sessionsByHash().get(hashSessionToken(token));
        if (!session) return null;
        if (session.expiresAt.getTime() <= Date.now()) {
            sessionsByHash().delete(session.tokenHash);
            return null;
        }
        return session;
    }

    async resolveSession(
        token: string | undefined,
    ): Promise<PartnerSessionRecord | null> {
        const session = this.getSession(token);
        if (!session) return null;
        return {
            token: session.token,
            partnerUserId: session.partnerUserId,
            email: session.email,
            orgId: session.orgId,
            expiresAt: session.expiresAt,
        };
    }

    async revokeSession(token: string): Promise<void> {
        sessionsByHash().delete(hashSessionToken(token));
    }
}

export function resetMemoryPartnerStoreForTests(): void {
    const globalStore = globalThis as typeof globalThis & {
        [key: symbol]: unknown;
    };
    delete globalStore[Symbol.for('safevoices.partnerStore')];
    delete globalStore[Symbol.for('safevoices.memoryPartnerStore')];
}

export const resetPartnerStoreForTests = resetMemoryPartnerStoreForTests;
