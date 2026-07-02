import { handlePartnerVerifyPost } from '@safevoices/trpc/partner-handlers';
import { cookies } from 'next/headers';
import {
    PARTNER_SESSION_COOKIE,
    partnerSessionCookieOptions,
} from '../../../../../lib/partner-access';

export async function POST(req: Request): Promise<Response> {
    const response = await handlePartnerVerifyPost(req);
    if (!response.ok) return response;

    const payload = (await response.json()) as {
        ok: true;
        email: string;
        token: string;
        expiresAt: string;
    };

    const cookieStore = await cookies();
    cookieStore.set(
        PARTNER_SESSION_COOKIE,
        payload.token,
        partnerSessionCookieOptions(new Date(payload.expiresAt)),
    );

    return Response.json({
        ok: true,
        email: payload.email,
        expiresAt: payload.expiresAt,
    });
}
