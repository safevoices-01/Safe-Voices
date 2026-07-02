import { describe, expect, it } from 'vitest';
import { decodeExtractionHeader } from './decode-extraction-header';
import { isSafeReturnPath } from './safe-return-path';
import { EVIDENCE_MAX_BYTES, isAllowedEvidenceMime } from './evidence-upload';

describe('isSafeReturnPath', () => {
    it('allows locale-prefixed internal paths', () => {
        expect(isSafeReturnPath('/en/chat?caseId=SV-ABCDE-FGHJ')).toBe(true);
    });

    it('rejects protocol-relative and absolute URLs', () => {
        expect(isSafeReturnPath('//evil.com/phish')).toBe(false);
        expect(isSafeReturnPath('https://evil.com')).toBe(false);
    });
});

describe('decodeExtractionHeader', () => {
    it('decodes base64url JSON payloads', () => {
        const payload = { schemaVersion: 1, fields: { location: 'Office' } };
        const header = btoa(JSON.stringify(payload))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        expect(decodeExtractionHeader(header)?.fields).toEqual({
            location: 'Office',
        });
    });
});

describe('evidence upload helpers', () => {
    it('accepts whitelisted image MIME types', () => {
        expect(isAllowedEvidenceMime('image/png')).toBe(true);
        expect(isAllowedEvidenceMime('application/pdf')).toBe(false);
    });

    it('defines a 10 MB max file size', () => {
        expect(EVIDENCE_MAX_BYTES).toBe(10 * 1024 * 1024);
    });
});
