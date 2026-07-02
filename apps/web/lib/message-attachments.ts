import type { FileUIPart, UIMessage } from 'ai';
import { messageAttachmentRefSchema } from '@safevoices/trpc/schemas';
import type { UploadEvidenceResult } from './evidence-upload';

export type MessageAttachmentRef = {
    id: string;
    url: string;
    mimeType: string;
    name: string;
};

export type HistoryMessage = {
    id: string;
    role: string;
    content: string;
    attachments?: unknown;
};

export function uploadsToAttachmentRefs(
    files: File[],
    uploads: UploadEvidenceResult[],
): MessageAttachmentRef[] {
    return uploads.map((upload, index) => ({
        id: upload.attachmentId,
        url: upload.publicUrl,
        mimeType: files[index]?.type ?? 'application/octet-stream',
        name: files[index]?.name ?? 'attachment',
    }));
}

export function buildUserMessageParts(
    text: string,
    attachments: MessageAttachmentRef[],
): UIMessage['parts'] {
    const parts: UIMessage['parts'] = attachments.map(
        (attachment): FileUIPart => ({
            type: 'file',
            mediaType: attachment.mimeType,
            url: attachment.url,
            filename: attachment.name,
        }),
    );
    const trimmed = text.trim();
    if (trimmed) {
        parts.push({ type: 'text', text: trimmed });
    }
    return parts;
}

export function parseHistoryAttachments(
    value: unknown,
): MessageAttachmentRef[] {
    if (!Array.isArray(value)) return [];
    const parsed: MessageAttachmentRef[] = [];
    for (const item of value) {
        const result = messageAttachmentRefSchema.safeParse(item);
        if (result.success) {
            parsed.push(result.data);
        }
    }
    return parsed;
}

export function historyMessageToUiMessage(
    message: HistoryMessage,
): Pick<UIMessage, 'id' | 'role' | 'parts'> {
    const attachments = parseHistoryAttachments(message.attachments);
    const parts: UIMessage['parts'] =
        message.role === 'user' && attachments.length > 0
            ? buildUserMessageParts(message.content, attachments)
            : [{ type: 'text', text: message.content }];
    return {
        id: message.id,
        role: message.role as 'user' | 'assistant',
        parts,
    };
}
