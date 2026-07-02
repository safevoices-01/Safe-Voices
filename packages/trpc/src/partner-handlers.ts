import { sendPartnerOtpEmail } from '@safevoices/emails';
import {
    createSignedDownloadUrl,
    getCaseStore,
    getPartnerStore,
    storageObjectPathFromPublicUrl,
} from '@safevoices/prisma';
import { API_ERROR_CODES, apiErrorResponse } from './api-errors';
import {
    partnerCaseStatusPatchSchema,
    partnerCasesListResponseSchema,
    partnerOtpRequestSchema,
    partnerOtpVerifySchema,
} from './schemas';

export async function handlePartnerOtpPost(req: Request): Promise<Response> {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return apiErrorResponse(API_ERROR_CODES.INVALID_JSON, 400);
    }

    const parsed = partnerOtpRequestSchema.safeParse(body);
    if (!parsed.success) {
        return apiErrorResponse(API_ERROR_CODES.INVALID_JSON, 400);
    }

    const store = getPartnerStore();
    const result = await store.issueOtp(parsed.data.email);
    if (!result.ok) {
        if (result.reason === 'not_allowed') {
            return apiErrorResponse(API_ERROR_CODES.PARTNER_NOT_ALLOWED, 403);
        }
        return apiErrorResponse(API_ERROR_CODES.OTP_RATE_LIMITED, 429);
    }

    const email = parsed.data.email.trim().toLowerCase();
    const emailSent = await sendPartnerOtpEmail({ to: email, code: result.code });
    if (!emailSent.ok && process.env.NODE_ENV !== 'production') {
        console.info(`[partner-otp] ${email} code: ${result.code}`);
    }

    return Response.json(
        process.env.SAFEVOICES_E2E_OTP_RETURN === 'true' ||
            process.env.NODE_ENV !== 'production'
            ? { ok: true, code: result.code }
            : { ok: true },
    );
}

export async function handlePartnerVerifyPost(req: Request): Promise<Response> {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return apiErrorResponse(API_ERROR_CODES.INVALID_JSON, 400);
    }

    const parsed = partnerOtpVerifySchema.safeParse(body);
    if (!parsed.success) {
        return apiErrorResponse(API_ERROR_CODES.INVALID_JSON, 400);
    }

    const store = getPartnerStore();
    const result = await store.verifyOtp(parsed.data.email, parsed.data.code);
    if (!result.ok) {
        if (result.reason === 'expired') {
            return apiErrorResponse(API_ERROR_CODES.OTP_EXPIRED, 401);
        }
        if (result.reason === 'locked') {
            return apiErrorResponse(API_ERROR_CODES.OTP_RATE_LIMITED, 429);
        }
        return apiErrorResponse(API_ERROR_CODES.OTP_INVALID, 401);
    }

    return Response.json({
        ok: true,
        email: result.email,
        token: result.token,
        expiresAt: result.expiresAt.toISOString(),
    });
}

export async function handlePartnerCasesGet(
    req: Request,
    partnerToken: string | undefined,
): Promise<Response> {
    const session = await getPartnerStore().resolveSession(partnerToken);
    if (!session) {
        return apiErrorResponse(API_ERROR_CODES.PARTNER_SESSION_EXPIRED, 401);
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status')?.trim() as
        | 'SUBMITTED'
        | 'UNDER_REVIEW'
        | 'RESOLVED'
        | 'CLOSED'
        | undefined;
    const search = url.searchParams.get('search')?.trim();

    const cases = await getCaseStore().listPartnerCases({
        status: status || undefined,
        search: search || undefined,
    });

    const body = partnerCasesListResponseSchema.parse({ cases });
    return Response.json(body);
}

export async function handlePartnerCaseDetailGet(
    caseId: string,
    partnerToken: string | undefined,
): Promise<Response> {
    const session = await getPartnerStore().resolveSession(partnerToken);
    if (!session) {
        return apiErrorResponse(API_ERROR_CODES.PARTNER_SESSION_EXPIRED, 401);
    }

    const detail = await getCaseStore().getPartnerCaseDetail(caseId);
    if (!detail) {
        return apiErrorResponse(API_ERROR_CODES.CASE_NOT_FOUND, 404);
    }

    return Response.json({ ok: true, case: detail });
}

export async function handlePartnerCaseStatusPatch(
    caseId: string,
    partnerToken: string | undefined,
    req: Request,
): Promise<Response> {
    const session = await getPartnerStore().resolveSession(partnerToken);
    if (!session) {
        return apiErrorResponse(API_ERROR_CODES.PARTNER_SESSION_EXPIRED, 401);
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return apiErrorResponse(API_ERROR_CODES.INVALID_JSON, 400);
    }

    const parsed = partnerCaseStatusPatchSchema.safeParse(body);
    if (!parsed.success) {
        return apiErrorResponse(API_ERROR_CODES.INVALID_JSON, 400);
    }

    const result = await getCaseStore().transitionCaseStatus(
        caseId,
        parsed.data.status,
    );
    if (!result.ok) {
        if (result.reason === 'not_found') {
            return apiErrorResponse(API_ERROR_CODES.CASE_NOT_FOUND, 404);
        }
        return apiErrorResponse(API_ERROR_CODES.INVALID_STATUS_TRANSITION, 409);
    }

    return Response.json({
        ok: true,
        caseId,
        caseStatus: result.caseStatus,
    });
}

export async function handlePartnerAttachmentDownloadGet(
    caseId: string,
    attachmentId: string,
    partnerToken: string | undefined,
): Promise<Response> {
    const session = await getPartnerStore().resolveSession(partnerToken);
    if (!session) {
        return apiErrorResponse(API_ERROR_CODES.PARTNER_SESSION_EXPIRED, 401);
    }

    const detail = await getCaseStore().getPartnerCaseDetail(caseId);
    if (!detail) {
        return apiErrorResponse(API_ERROR_CODES.CASE_NOT_FOUND, 404);
    }

    const attachment = await getCaseStore().getAttachment({
        caseId,
        attachmentId,
    });
    if (!attachment) {
        return apiErrorResponse(API_ERROR_CODES.CASE_NOT_FOUND, 404);
    }

    const path = storageObjectPathFromPublicUrl(attachment.url);
    if (path) {
        const signedUrl = await createSignedDownloadUrl(path);
        if (signedUrl) {
            return Response.redirect(signedUrl, 302);
        }
    }

    return Response.redirect(attachment.url, 302);
}
