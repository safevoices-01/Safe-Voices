import { describe, expect, it } from 'vitest';
import {
    buildUserMessageParts,
    historyMessageToUiMessage,
    parseHistoryAttachments,
    uploadsToAttachmentRefs,
} from './message-attachments';

describe('buildUserMessageParts', () => {
    it('builds file parts with storage URLs and optional text', () => {
        const parts = buildUserMessageParts('note', [
            {
                id: 'att-1',
                url: 'https://storage.example/file.png',
                mimeType: 'image/png',
                name: 'file.png',
            },
        ]);
        expect(parts).toEqual([
            {
                type: 'file',
                mediaType: 'image/png',
                url: 'https://storage.example/file.png',
                filename: 'file.png',
            },
            { type: 'text', text: 'note' },
        ]);
    });
});

describe('historyMessageToUiMessage', () => {
    it('restores storage-backed attachments from history', () => {
        const ui = historyMessageToUiMessage({
            id: 'msg-1',
            role: 'user',
            content: 'Evidence attached',
            attachments: [
                {
                    id: 'att-1',
                    url: 'https://storage.example/file.png',
                    mimeType: 'image/png',
                    name: 'file.png',
                },
            ],
        });
        expect(ui.parts).toEqual([
            {
                type: 'file',
                mediaType: 'image/png',
                url: 'https://storage.example/file.png',
                filename: 'file.png',
            },
            { type: 'text', text: 'Evidence attached' },
        ]);
    });
});

describe('uploadsToAttachmentRefs', () => {
    it('maps upload results to message attachment refs', () => {
        const file = new File([new Uint8Array([1])], 'shot.png', {
            type: 'image/png',
        });
        const refs = uploadsToAttachmentRefs([file], [
            {
                attachmentId: 'att-1',
                publicUrl: 'https://storage.example/shot.png',
            },
        ]);
        expect(refs).toEqual([
            {
                id: 'att-1',
                url: 'https://storage.example/shot.png',
                mimeType: 'image/png',
                name: 'shot.png',
            },
        ]);
    });
});

describe('parseHistoryAttachments', () => {
    it('ignores invalid attachment payloads', () => {
        expect(
            parseHistoryAttachments([
                { id: 'x' },
                {
                    id: 'att-1',
                    url: 'https://storage.example/a.png',
                    mimeType: 'image/png',
                    name: 'a.png',
                },
            ]),
        ).toHaveLength(1);
    });
});
