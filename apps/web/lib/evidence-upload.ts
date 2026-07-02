import {
    uploadConfirmResponseSchema,
    uploadResponseSchema,
} from '@safevoices/trpc/schemas';
import { EVIDENCE_MAX_BYTES } from '@safevoices/trpc/upload-limits';

export { EVIDENCE_MAX_BYTES };

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function isAllowedEvidenceMime(mimeType: string): boolean {
    return ALLOWED_MIME.has(mimeType);
}

export type UploadEvidenceResult = {
    publicUrl: string;
    attachmentId: string;
};

export async function uploadEvidence(
    caseId: string,
    file: File,
): Promise<UploadEvidenceResult> {
    if (file.size > EVIDENCE_MAX_BYTES) {
        throw { code: 'FILE_TOO_LARGE' };
    }
    if (!isAllowedEvidenceMime(file.type)) {
        throw { code: 'UPLOAD_UNSUPPORTED_TYPE' };
    }

    const presignRes = await fetch(
        `/api/cases/${encodeURIComponent(caseId)}/upload`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                filename: file.name,
                mimeType: file.type,
                sizeBytes: file.size,
            }),
        },
    );

    const presignBody: unknown = await presignRes.json().catch(() => ({}));
    if (!presignRes.ok) {
        throw presignBody;
    }

    const presign = uploadResponseSchema.safeParse(presignBody);
    if (!presign.success) {
        throw { code: 'UPLOAD_FAILED' };
    }

    const putRes = await fetch(presign.data.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
    });
    if (!putRes.ok) {
        throw { code: 'UPLOAD_FAILED' };
    }

    const confirmRes = await fetch(
        `/api/cases/${encodeURIComponent(caseId)}/upload/confirm`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                publicUrl: presign.data.publicUrl,
                filename: file.name,
                mimeType: file.type,
                sizeBytes: file.size,
            }),
        },
    );

    const confirmBody: unknown = await confirmRes.json().catch(() => ({}));
    if (!confirmRes.ok) {
        throw confirmBody;
    }

    const confirmed = uploadConfirmResponseSchema.safeParse(confirmBody);
    if (!confirmed.success) {
        throw { code: 'UPLOAD_FAILED' };
    }

    return {
        publicUrl: confirmed.data.publicUrl,
        attachmentId: confirmed.data.attachmentId,
    };
}
