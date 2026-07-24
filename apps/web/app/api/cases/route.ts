import {
    forceMemoryCaseStore,
    isDatabaseConnectivityError,
    shouldFallbackToMemoryStore,
    shouldReportDatabaseUnavailable,
} from '@safevoices/prisma';
import { createCaseResponseSchema } from '@safevoices/trpc';
import {
    API_ERROR_CODES,
    apiErrorResponse,
} from '../../../lib/api-errors';
import { createCaseCredential } from '../../../lib/case-access';

async function createCaseBody(): Promise<Response> {
    const { caseId, secret } = await createCaseCredential();
    const body = createCaseResponseSchema.parse({
        caseId,
        secret,
        secretShownOnce: true,
    });
    return Response.json(body);
}

export async function POST(): Promise<Response> {
    try {
        return await createCaseBody();
    } catch (error) {
        if (shouldFallbackToMemoryStore(error)) {
            console.warn(
                '[api/cases] DATABASE_URL unreachable; falling back to memory case store. Fix DATABASE_URL or set CASE_STORE=memory.',
                error,
            );
            forceMemoryCaseStore();
            try {
                return await createCaseBody();
            } catch (retryError) {
                console.error(
                    '[api/cases] create failed after memory fallback',
                    retryError,
                );
                return apiErrorResponse(API_ERROR_CODES.CASE_CREATE_FAILED, 500);
            }
        }

        console.error('[api/cases] create failed', error);

        if (
            shouldReportDatabaseUnavailable(error) ||
            isDatabaseConnectivityError(error)
        ) {
            return apiErrorResponse(API_ERROR_CODES.DATABASE_UNAVAILABLE, 503);
        }

        return apiErrorResponse(API_ERROR_CODES.CASE_CREATE_FAILED, 500);
    }
}
