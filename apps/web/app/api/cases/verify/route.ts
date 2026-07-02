import { verifyCaseAccessRequestSchema } from '@safevoices/trpc';
import { cookies } from 'next/headers';
import {
    apiErrorResponse,
    API_ERROR_CODES,
    CASE_ID_REGEX,
    SECRET_MIN_LENGTH,
} from '@safevoices/trpc';
import {
    CASE_SESSION_COOKIE,
    verifyCaseCredential,
    hashClientKey,
} from '../../../../lib/case-access';

export async function POST(req: Request): Promise<Response> {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return apiErrorResponse(API_ERROR_CODES.INVALID_JSON, 400);
    }

    const parsed = verifyCaseAccessRequestSchema.safeParse(body);
    if (!parsed.success) {
        return apiErrorResponse(API_ERROR_CODES.VERIFY_FAILED, 400);
    }

    const caseId = parsed.data.caseId.trim().toUpperCase();
    const secret = parsed.data.secret.trim();
    if (!CASE_ID_REGEX.test(caseId)) {
        return apiErrorResponse(API_ERROR_CODES.VERIFY_FAILED, 400);
    }
    if (secret.length < SECRET_MIN_LENGTH) {
        return apiErrorResponse(API_ERROR_CODES.VERIFY_FAILED, 400);
    }

    const verified = await verifyCaseCredential({
        caseId,
        secret,
        clientKey: hashClientKey(req),
    });
    if (!verified.ok) {
        const status = verified.reason === 'locked' ? 429 : 401;
        return apiErrorResponse(
            verified.reason === 'locked'
                ? API_ERROR_CODES.VERIFY_LOCKED
                : API_ERROR_CODES.VERIFY_FAILED,
            status,
        );
    }

    const cookieStore = await cookies();
    cookieStore.set(CASE_SESSION_COOKIE, verified.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        expires: verified.expiresAt,
    });

    return Response.json({
        ok: true,
        caseId,
        expiresAt: verified.expiresAt.toISOString(),
    });
}
