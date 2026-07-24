import {
    createHmac,
    randomBytes,
    scrypt as scryptCallback,
    timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const PEPPER = process.env.SAFEVOICES_SECRET_PEPPER ?? 'safevoices-dev-pepper';
const SCRYPT_PREFIX = 'scrypt$';
const SCRYPT_KEYLEN = 64;

export function generateSecret(): string {
    return randomBytes(32).toString('base64url');
}

/**
 * Hash case secrets with Node scrypt (portable on Vercel; no native addon).
 * Legacy Argon2 hashes remain verifiable when `@node-rs/argon2` is available.
 */
export async function hashSecret(secret: string): Promise<{
    hash: string;
    salt: string;
}> {
    const salt = randomBytes(16).toString('hex');
    const peppered = `${secret}:${PEPPER}`;
    const derived = (await scrypt(peppered, salt, SCRYPT_KEYLEN)) as Buffer;
    return {
        hash: `${SCRYPT_PREFIX}${derived.toString('hex')}`,
        salt,
    };
}

export async function verifySecret(
    secret: string,
    secretHash: string,
    salt: string,
): Promise<boolean> {
    const peppered = `${secret}:${PEPPER}`;

    if (secretHash.startsWith(SCRYPT_PREFIX)) {
        try {
            const expected = Buffer.from(
                secretHash.slice(SCRYPT_PREFIX.length),
                'hex',
            );
            const derived = (await scrypt(
                peppered,
                salt,
                SCRYPT_KEYLEN,
            )) as Buffer;
            if (expected.length !== derived.length) return false;
            return timingSafeEqual(expected, derived);
        } catch {
            return false;
        }
    }

    try {
        const { verify } = await import('@node-rs/argon2');
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
