import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { EVIDENCE_MAX_BYTES } from '@safevoices/trpc/upload-limits';
import { isAllowedEvidenceMime, uploadEvidence } from './evidence-upload';

describe('isAllowedEvidenceMime', () => {
    it('allows png, jpeg, and webp', () => {
        expect(isAllowedEvidenceMime('image/png')).toBe(true);
        expect(isAllowedEvidenceMime('image/jpeg')).toBe(true);
        expect(isAllowedEvidenceMime('image/webp')).toBe(true);
        expect(isAllowedEvidenceMime('application/pdf')).toBe(false);
    });
});

describe('uploadEvidence', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('rejects files over 10MB', async () => {
        const file = new File(
            [new Uint8Array(EVIDENCE_MAX_BYTES + 1)],
            'large.png',
            { type: 'image/png' },
        );
        await expect(uploadEvidence('SV-ABCDE-FGHJ', file)).rejects.toEqual({
            code: 'FILE_TOO_LARGE',
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('presigns, uploads, then confirms', async () => {
        const file = new File([new Uint8Array([1, 2, 3])], 'shot.png', {
            type: 'image/png',
        });
        const signedUrl = 'https://storage.example/upload';
        const publicUrl =
            'https://storage.example/storage/v1/object/public/case-uploads/cases/SV-ABCDE-FGHJ/1-shot.png';

        fetchMock
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ signedUrl, publicUrl }),
            })
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    ok: true,
                    attachmentId: 'att-1',
                    publicUrl,
                }),
            });

        const result = await uploadEvidence('SV-ABCDE-FGHJ', file);
        expect(result).toEqual({
            publicUrl,
            attachmentId: 'att-1',
        });
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock.mock.calls[0]?.[0]).toContain('/upload');
        expect(fetchMock.mock.calls[1]?.[0]).toBe(signedUrl);
        expect(fetchMock.mock.calls[2]?.[0]).toContain('/upload/confirm');
    });
});
