import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

/**
 * Prisma 7 requires a driver adapter (or Accelerate URL).
 * Production and local persistence use PostgreSQL via `@prisma/adapter-pg`.
 */
export function getPrisma(): PrismaClient {
    if (globalForPrisma.prisma) return globalForPrisma.prisma;

    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) {
        throw new Error(
            'DATABASE_URL is required to use PrismaCaseStore. Unset DATABASE_URL or set CASE_STORE=memory for in-memory stores.',
        );
    }

    if (
        !connectionString.startsWith('postgres://') &&
        !connectionString.startsWith('postgresql://')
    ) {
        throw new Error(
            'DATABASE_URL must be a PostgreSQL connection string (postgresql://…). SQLite file: URLs are not supported at runtime.',
        );
    }

    const adapter = new PrismaPg({ connectionString });
    globalForPrisma.prisma = new PrismaClient({
        adapter,
        log:
            process.env.NODE_ENV === 'development'
                ? ['error', 'warn']
                : ['error'],
    });

    return globalForPrisma.prisma;
}

/** @deprecated Use getPrisma() so Prisma is not initialized at import time. */
export const prisma = new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
        return Reflect.get(getPrisma(), prop, receiver);
    },
});
