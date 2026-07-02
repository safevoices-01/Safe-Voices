import { getPartnerStore } from '@safevoices/prisma';

export const PARTNER_SESSION_COOKIE = 'sv_partner_session';

export type PartnerSession = {
    token: string;
    partnerUserId: string;
    email: string;
    orgId: string;
    expiresAt: Date;
};

export async function resolvePartnerSession(
    token: string | undefined,
): Promise<PartnerSession | null> {
    return getPartnerStore().resolveSession(token);
}

export async function revokePartnerSession(token: string): Promise<void> {
    return getPartnerStore().revokeSession(token);
}

export function partnerSessionCookieOptions(expiresAt: Date): {
    httpOnly: boolean;
    sameSite: 'lax';
    secure: boolean;
    path: string;
    expires: Date;
} {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        expires: expiresAt,
    };
}
