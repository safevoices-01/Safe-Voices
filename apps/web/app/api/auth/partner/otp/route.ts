import { handlePartnerOtpPost } from '@safevoices/trpc/partner-handlers';

export async function POST(req: Request): Promise<Response> {
    return handlePartnerOtpPost(req);
}
