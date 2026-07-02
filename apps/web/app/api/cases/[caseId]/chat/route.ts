import { handleCaseChatPost } from '@safevoices/trpc/case-handlers';
import { cookies } from 'next/headers';
import { CASE_SESSION_COOKIE } from '../../../../../lib/case-access';

type Params = {
    params: Promise<{ caseId: string }>;
};

export async function POST(req: Request, ctx: Params): Promise<Response> {
    const { caseId } = await ctx.params;
    const cookieStore = await cookies();
    const token = cookieStore.get(CASE_SESSION_COOKIE)?.value;
    return handleCaseChatPost(caseId, token, req);
}
