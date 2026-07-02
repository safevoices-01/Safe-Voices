import { handleGeneralChatPost } from '@safevoices/trpc/case-handlers';

export async function POST(req: Request): Promise<Response> {
    return handleGeneralChatPost(req);
}
