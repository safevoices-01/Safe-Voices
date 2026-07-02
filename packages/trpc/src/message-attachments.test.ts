import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { getCaseStore, resetCaseStoreForTests } from '@safevoices/prisma';
import {
    parseMessageAttachmentsFromBody,
    validateMessageAttachments,
} from './message-attachments';

describe('parseMessageAttachmentsFromBody', () => {
    it('returns an empty array when messageAttachments is omitted', () => {
        assert.deepEqual(parseMessageAttachmentsFromBody({ messages: [] }), []);
    });

    it('parses valid attachment references', () => {
        const refs = parseMessageAttachmentsFromBody({
            messages: [],
            messageAttachments: [
                {
                    id: 'att-1',
                    url: 'https://example.test/file.png',
                    mimeType: 'image/png',
                    name: 'file.png',
                },
            ],
        });
        assert.equal(refs.length, 1);
        assert.equal(refs[0]?.id, 'att-1');
    });

    it('throws when messageAttachments is invalid', () => {
        assert.throws(() =>
            parseMessageAttachmentsFromBody({
                messages: [],
                messageAttachments: [{ id: 'only-id' }],
            }),
        );
    });
});

describe('validateMessageAttachments', () => {
    beforeEach(() => {
        resetCaseStoreForTests();
    });

    it('accepts attachments that belong to the case', async () => {
        const store = getCaseStore();
        const created = await store.createCase();
        const verified = await store.verifyCase({
            caseId: created.caseId,
            secret: created.secret,
        });
        assert.equal(verified.ok, true);
        if (!verified.ok) throw new Error('verify failed');

        const publicUrl = `https://example.test/storage/v1/object/public/case-uploads/cases/${created.caseId}/evidence.png`;
        const attachment = await store.createAttachment({
            caseId: created.caseId,
            url: publicUrl,
            mimeType: 'image/png',
            name: 'evidence.png',
            sizeBytes: 100,
        });
        assert.ok(attachment);

        const result = await validateMessageAttachments(created.caseId, [
            {
                id: attachment.id,
                url: publicUrl,
                mimeType: 'image/png',
                name: 'evidence.png',
            },
        ]);
        assert.equal(result.ok, true);
        if (!result.ok) throw new Error('expected ok');
        assert.equal(result.attachments.length, 1);
    });

    it('rejects attachments with mismatched URLs', async () => {
        const store = getCaseStore();
        const created = await store.createCase();
        const attachment = await store.createAttachment({
            caseId: created.caseId,
            url: 'https://example.test/a.png',
            mimeType: 'image/png',
            name: 'a.png',
            sizeBytes: 100,
        });
        assert.ok(attachment);

        const result = await validateMessageAttachments(created.caseId, [
            {
                id: attachment.id,
                url: 'https://evil.test/b.png',
                mimeType: 'image/png',
                name: 'b.png',
            },
        ]);
        assert.equal(result.ok, false);
        if (result.ok) throw new Error('expected failure');
        assert.equal(result.response.status, 400);
    });
});

describe('appendChatTurn message attachments', () => {
    beforeEach(() => {
        resetCaseStoreForTests();
    });

    it('persists attachment refs on the user message', async () => {
        const store = getCaseStore();
        const created = await store.createCase();
        const attachment = {
            id: 'att-1',
            url: 'https://example.test/file.png',
            mimeType: 'image/png',
            name: 'file.png',
        };

        await store.appendChatTurn({
            caseId: created.caseId,
            userContent: 'See attached',
            assistantContent: 'Received',
            userAttachments: [attachment],
        });

        const messages = await store.listMessages(created.caseId, 10);
        assert.equal(messages.length, 2);
        assert.deepEqual(messages[0]?.attachments, [attachment]);
        assert.equal(messages[1]?.attachments, undefined);
    });
});
