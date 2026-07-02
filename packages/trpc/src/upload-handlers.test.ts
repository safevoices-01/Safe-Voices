import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { getCaseStore, resetCaseStoreForTests } from '@safevoices/prisma';
import {
    EVIDENCE_MAX_BYTES,
    MAX_ATTACHMENTS_PER_CASE,
} from './upload-limits';
import {
    handleCaseUploadConfirmPost,
    handleCaseUploadPost,
} from './upload-handlers';

describe('handleCaseUploadPost', () => {
    beforeEach(() => {
        resetCaseStoreForTests();
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });

    async function openSession(): Promise<{
        caseId: string;
        token: string;
    }> {
        const store = getCaseStore();
        const created = await store.createCase();
        const verified = await store.verifyCase({
            caseId: created.caseId,
            secret: created.secret,
        });
        assert.equal(verified.ok, true);
        if (!verified.ok) throw new Error('verify failed');
        return { caseId: created.caseId, token: verified.token };
    }

    it('rejects uploads without a valid session', async () => {
        const res = await handleCaseUploadPost(
            'SV-ABCDE-FGHJ',
            undefined,
            new Request('http://localhost/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: 'a.png',
                    mimeType: 'image/png',
                    sizeBytes: 100,
                }),
            }),
        );
        assert.equal(res.status, 401);
    });

    it('rejects uploads after case submit', async () => {
        const { caseId, token } = await openSession();
        await getCaseStore().markCaseSubmitted(caseId);

        const res = await handleCaseUploadPost(
            caseId,
            token,
            new Request('http://localhost/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: 'a.png',
                    mimeType: 'image/png',
                    sizeBytes: 100,
                }),
            }),
        );
        assert.equal(res.status, 409);
    });

    it('rejects files over the size limit', async () => {
        const { caseId, token } = await openSession();
        const res = await handleCaseUploadPost(
            caseId,
            token,
            new Request('http://localhost/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: 'a.png',
                    mimeType: 'image/png',
                    sizeBytes: EVIDENCE_MAX_BYTES + 1,
                }),
            }),
        );
        assert.equal(res.status, 413);
    });

    it('rejects when attachment limit is reached', async () => {
        const { caseId, token } = await openSession();
        const store = getCaseStore();
        for (let i = 0; i < MAX_ATTACHMENTS_PER_CASE; i += 1) {
            await store.createAttachment({
                caseId,
                url: `https://example.test/storage/v1/object/public/case-uploads/cases/${caseId}/${i}.png`,
                mimeType: 'image/png',
                name: `file-${i}.png`,
                sizeBytes: 100,
            });
        }

        const res = await handleCaseUploadPost(
            caseId,
            token,
            new Request('http://localhost/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: 'a.png',
                    mimeType: 'image/png',
                    sizeBytes: 100,
                }),
            }),
        );
        assert.equal(res.status, 409);
        const json = (await res.json()) as { code: string };
        assert.equal(json.code, 'UPLOAD_LIMIT_EXCEEDED');
    });

    it('returns UPLOAD_NOT_CONFIGURED when storage env is missing', async () => {
        const { caseId, token } = await openSession();
        const res = await handleCaseUploadPost(
            caseId,
            token,
            new Request('http://localhost/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: 'a.png',
                    mimeType: 'image/png',
                    sizeBytes: 100,
                }),
            }),
        );
        assert.equal(res.status, 503);
    });
});

describe('handleCaseUploadConfirmPost', () => {
    beforeEach(() => {
        resetCaseStoreForTests();
    });

    it('persists attachment metadata after upload', async () => {
        const store = getCaseStore();
        const created = await store.createCase();
        const verified = await store.verifyCase({
            caseId: created.caseId,
            secret: created.secret,
        });
        assert.equal(verified.ok, true);
        if (!verified.ok) throw new Error('verify failed');

        const publicUrl = `https://example.test/storage/v1/object/public/case-uploads/cases/${created.caseId}/123-evidence.png`;
        const res = await handleCaseUploadConfirmPost(
            created.caseId,
            verified.token,
            new Request('http://localhost/upload/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    publicUrl,
                    filename: 'evidence.png',
                    mimeType: 'image/png',
                    sizeBytes: 2048,
                }),
            }),
        );
        assert.equal(res.status, 200);
        const json = (await res.json()) as {
            ok: boolean;
            attachmentId: string;
            publicUrl: string;
        };
        assert.equal(json.ok, true);
        assert.ok(json.attachmentId);
        assert.equal(json.publicUrl, publicUrl);
        assert.equal(await store.countAttachments(created.caseId), 1);
    });
});
