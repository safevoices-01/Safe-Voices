import { handlePartnerCaseDetailGet } from '@safevoices/trpc/partner-handlers';
import { cookies } from 'next/headers';
import { PARTNER_SESSION_COOKIE } from '../../../../../lib/partner-access';

type Params = {
    params: Promise<{ caseId: string }>;
};

export async function GET(_req: Request, ctx: Params): Promise<Response> {
    const { caseId } = await ctx.params;
    const cookieStore = await cookies();
    const token = cookieStore.get(PARTNER_SESSION_COOKIE)?.value;
    return handlePartnerCaseDetailGet(caseId, token);
}
