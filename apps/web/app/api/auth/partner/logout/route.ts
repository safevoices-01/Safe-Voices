import { cookies } from 'next/headers';
import {
    PARTNER_SESSION_COOKIE,
    revokePartnerSession,
} from '../../../../../lib/partner-access';

export async function POST(): Promise<Response> {
    const cookieStore = await cookies();
    const token = cookieStore.get(PARTNER_SESSION_COOKIE)?.value;
    if (token) {
        await revokePartnerSession(token);
    }
    cookieStore.set(PARTNER_SESSION_COOKIE, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    });
    return Response.json({ ok: true });
}
