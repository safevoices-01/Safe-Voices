import { createHash } from 'node:crypto';

export const CASE_ID_REGEX = /^SV-[A-Z2-9]{5}-[A-Z2-9]{4}$/;
export const SECRET_MIN_LENGTH = 16;

export function extractBearerToken(
    authHeader: string | undefined,
): string | undefined {
    return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
}

export function hashClientKeyFromRequest(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const ip = forwarded ?? req.headers.get('x-real-ip') ?? 'unknown';
    return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}
