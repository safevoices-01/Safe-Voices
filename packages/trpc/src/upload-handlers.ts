import {
    createSignedUploadUrl,
    getCaseStore,
    isAllowedUploadMime,
    isCaseUploadPublicUrl,
} from '@safevoices/prisma';
import { API_ERROR_CODES, apiErrorResponse } from './api-errors';
import {
    uploadConfirmRequestSchema,
    uploadRequestSchema,
} from './schemas';
import {
    EVIDENCE_MAX_BYTES,
    MAX_ATTACHMENTS_PER_CASE,
} from './upload-limits';

type UploadGateResult =
    | { ok: true }
    | { ok: false; response: Response };

async function gateReporterUpload(
    caseId: string,
    sessionToken: string | undefined,
): Promise<UploadGateResult> {
    const session = await getCaseStore().resolveSession(sessionToken);
    if (!session || session.caseId !== caseId) {
        return {
            ok: false,
            response: apiErrorResponse(API_ERROR_CODES.SESSION_EXPIRED, 401),
        };
    }
    if (await getCaseStore().isCaseSubmitted(caseId)) {
        return {
            ok: false,
            response: apiErrorResponse(
                API_ERROR_CODES.CASE_SUBMITTED_READONLY,
                409,
            ),
        };
    }
    return { ok: true };
}

async function gateAttachmentLimit(caseId: string): Promise<UploadGateResult> {
    const count = await getCaseStore().countAttachments(caseId);
    if (count >= MAX_ATTACHMENTS_PER_CASE) {
        return {
            ok: false,
            response: apiErrorResponse(
                API_ERROR_CODES.UPLOAD_LIMIT_EXCEEDED,
                409,
            ),
        };
    }
    return { ok: true };
}

export async function handleCaseUploadPost(
    caseId: string,
    sessionToken: string | undefined,
    req: Request,
): Promise<Response> {
    const sessionGate = await gateReporterUpload(caseId, sessionToken);
    if (!sessionGate.ok) return sessionGate.response;

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return apiErrorResponse(API_ERROR_CODES.INVALID_JSON, 400);
    }

    const parsed = uploadRequestSchema.safeParse(body);
    if (!parsed.success) {
        return apiErrorResponse(
            API_ERROR_CODES.INVALID_JSON,
            400,
            'filename, mimeType, and sizeBytes required',
        );
    }

    if (!isAllowedUploadMime(parsed.data.mimeType)) {
        return apiErrorResponse(API_ERROR_CODES.UPLOAD_UNSUPPORTED_TYPE, 400);
    }

    if (parsed.data.sizeBytes > EVIDENCE_MAX_BYTES) {
        return apiErrorResponse(API_ERROR_CODES.FILE_TOO_LARGE, 413);
    }

    const limitGate = await gateAttachmentLimit(caseId);
    if (!limitGate.ok) return limitGate.response;

    const signed = await createSignedUploadUrl({
        caseId,
        filename: parsed.data.filename,
        mimeType: parsed.data.mimeType,
    });

    if (!signed) {
        return apiErrorResponse(API_ERROR_CODES.UPLOAD_NOT_CONFIGURED, 503);
    }

    return Response.json(signed);
}

export async function handleCaseUploadConfirmPost(
    caseId: string,
    sessionToken: string | undefined,
    req: Request,
): Promise<Response> {
    const sessionGate = await gateReporterUpload(caseId, sessionToken);
    if (!sessionGate.ok) return sessionGate.response;

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return apiErrorResponse(API_ERROR_CODES.INVALID_JSON, 400);
    }

    const parsed = uploadConfirmRequestSchema.safeParse(body);
    if (!parsed.success) {
        return apiErrorResponse(API_ERROR_CODES.INVALID_JSON, 400);
    }

    if (!isAllowedUploadMime(parsed.data.mimeType)) {
        return apiErrorResponse(API_ERROR_CODES.UPLOAD_UNSUPPORTED_TYPE, 400);
    }

    if (parsed.data.sizeBytes > EVIDENCE_MAX_BYTES) {
        return apiErrorResponse(API_ERROR_CODES.FILE_TOO_LARGE, 413);
    }

    if (!isCaseUploadPublicUrl(parsed.data.publicUrl, caseId)) {
        return apiErrorResponse(API_ERROR_CODES.UPLOAD_FAILED, 400);
    }

    const limitGate = await gateAttachmentLimit(caseId);
    if (!limitGate.ok) return limitGate.response;

    const created = await getCaseStore().createAttachment({
        caseId,
        url: parsed.data.publicUrl,
        mimeType: parsed.data.mimeType,
        name: parsed.data.filename,
        sizeBytes: parsed.data.sizeBytes,
    });

    if (!created) {
        return apiErrorResponse(API_ERROR_CODES.CASE_NOT_FOUND, 404);
    }

    return Response.json({
        ok: true as const,
        attachmentId: created.id,
        publicUrl: parsed.data.publicUrl,
    });
}
