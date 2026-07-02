import { createCaseResponseSchema } from '@safevoices/trpc';
import { createCaseCredential } from '../../../lib/case-access';

export async function POST(): Promise<Response> {
    const { caseId, secret } = await createCaseCredential();
    const body = createCaseResponseSchema.parse({
        caseId,
        secret,
        secretShownOnce: true,
    });
    return Response.json(body);
}
