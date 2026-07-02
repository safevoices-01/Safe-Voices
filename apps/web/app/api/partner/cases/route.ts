import { handlePartnerCasesGet } from '@safevoices/trpc/partner-handlers';
import { cookies } from 'next/headers';
import { PARTNER_SESSION_COOKIE } from '../../../../lib/partner-access';

export async function GET(req: Request): Promise<Response> {
    const cookieStore = await cookies();
    const token = cookieStore.get(PARTNER_SESSION_COOKIE)?.value;
    return handlePartnerCasesGet(req, token);
}
