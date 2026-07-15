import { createCaseResponseSchema } from '@safevoices/trpc';
import {
    API_ERROR_CODES,
    apiErrorResponse,
} from '../../../lib/api-errors';
import { createCaseCredential } from '../../../lib/case-access';

export async function POST(): Promise<Response> {
    try {
        const { caseId, secret } = await createCaseCredential();
        const body = createCaseResponseSchema.parse({
            caseId,
            secret,
            secretShownOnce: true,
        });
        return Response.json(body);
    } catch (error) {
        console.error('[api/cases] create failed', error);
        return apiErrorResponse(API_ERROR_CODES.CASE_CREATE_FAILED, 500);
    }
}
