import type { ApiErrorCode } from './api-errors';
import { readJsonErrorMessage } from './api-toast';

const ERROR_CODES = new Set<string>([
    'INVALID_JSON',
    'VERIFY_FAILED',
    'VERIFY_LOCKED',
    'SESSION_EXPIRED',
    'CASE_CREATE_FAILED',
    'DATABASE_UNAVAILABLE',
    'CASE_SUBMITTED',
    'CASE_SUBMITTED_READONLY',
    'CASE_NOT_FOUND',
    'CHAT_TOO_MANY_MESSAGES',
    'CHAT_MESSAGE_TOO_LARGE',
    'UPLOAD_UNSUPPORTED_TYPE',
    'UPLOAD_NOT_CONFIGURED',
    'FILE_TOO_LARGE',
    'UPLOAD_FAILED',
    'UPLOAD_LIMIT_EXCEEDED',
    'CHAT_DISABLED',
    'CHAT_UNAVAILABLE',
    'OTP_INVALID',
    'OTP_EXPIRED',
    'OTP_RATE_LIMITED',
    'PARTNER_NOT_ALLOWED',
    'INVALID_STATUS_TRANSITION',
    'PARTNER_SESSION_EXPIRED',
]);

export function readApiErrorCode(body: unknown): ApiErrorCode | undefined {
    if (
        typeof body === 'object' &&
        body !== null &&
        'code' in body &&
        typeof (body as { code: unknown }).code === 'string'
    ) {
        const code = (body as { code: string }).code;
        if (ERROR_CODES.has(code)) {
            return code as ApiErrorCode;
        }
    }
    return undefined;
}

export function translateApiError(
    tErrors: (key: string) => string,
    body: unknown,
    fallback?: string,
): string {
    const code = readApiErrorCode(body);
    if (code) {
        return tErrors(code);
    }
    return readJsonErrorMessage(body) ?? fallback ?? tErrors('INVALID_JSON');
}
