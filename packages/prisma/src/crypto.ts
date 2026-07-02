import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

const PEPPER = process.env.SAFEVOICES_SECRET_PEPPER ?? 'safevoices-dev-pepper';

export function generateSecret(): string {
    return randomBytes(32).toString('base64url');
}

export async function hashSecret(secret: string): Promise<{
    hash: string;
    salt: string;
}> {
    const salt = randomBytes(16).toString('hex');
    const peppered = `${secret}:${PEPPER}`;
    const secretHash = await hash(peppered, {
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
        salt: Buffer.from(salt, 'hex'),
    });
    return { hash: secretHash, salt };
}

export async function verifySecret(
    secret: string,
    secretHash: string,
    salt: string,
): Promise<boolean> {
    const peppered = `${secret}:${PEPPER}`;
    try {
        return await verify(secretHash, peppered, {
            salt: Buffer.from(salt, 'hex'),
        });
    } catch {
        return false;
    }
}

export function hashSessionToken(token: string): string {
    return createHmac('sha256', PEPPER).update(token).digest('hex');
}

export function timingSafeCompareHex(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
}

export function generateTrackingCode(prefix: string): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let segment = '';
    for (let i = 0; i < 5; i += 1) {
        segment += chars[Math.floor(Math.random() * chars.length)];
    }
    let tail = '';
    for (let i = 0; i < 4; i += 1) {
        tail += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${prefix}-${segment}-${tail}`;
}

export function mintSessionToken(): string {
    return randomBytes(24).toString('base64url');
}
