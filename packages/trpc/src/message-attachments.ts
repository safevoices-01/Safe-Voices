import { getCaseStore, type MessageAttachmentRef } from '@safevoices/prisma';
import { API_ERROR_CODES, apiErrorResponse } from './api-errors';
import { messageAttachmentsRequestSchema } from './schemas';

export type { MessageAttachmentRef };

export function parseMessageAttachmentsFromBody(
    body: unknown,
): MessageAttachmentRef[] {
    if (!body || typeof body !== 'object' || !('messageAttachments' in body)) {
        return [];
    }
    const raw = (body as { messageAttachments?: unknown }).messageAttachments;
    if (raw === undefined) return [];
    const parsed = messageAttachmentsRequestSchema.safeParse(raw);
    if (!parsed.success) {
        throw new Error('INVALID_MESSAGE_ATTACHMENTS');
    }
    return parsed.data;
}

export async function validateMessageAttachments(
    caseId: string,
    refs: MessageAttachmentRef[],
): Promise<
    | { ok: true; attachments: MessageAttachmentRef[] }
    | { ok: false; response: Response }
> {
    if (refs.length === 0) {
        return { ok: true, attachments: [] };
    }

    const store = getCaseStore();
    const validated: MessageAttachmentRef[] = [];

    for (const ref of refs) {
        const stored = await store.getAttachment({
            caseId,
            attachmentId: ref.id,
        });
        if (!stored || stored.url !== ref.url) {
            return {
                ok: false,
                response: apiErrorResponse(
                    API_ERROR_CODES.INVALID_ATTACHMENT,
                    400,
                    'Attachment does not belong to this case',
                ),
            };
        }
        validated.push({
            id: stored.id,
            url: stored.url,
            mimeType: stored.mimeType,
            name: stored.name,
        });
    }

    return { ok: true, attachments: validated };
}

export function invalidMessageAttachmentsResponse(): Response {
    return apiErrorResponse(
        API_ERROR_CODES.INVALID_JSON,
        400,
        'messageAttachments must be an array of attachment references',
    );
}
