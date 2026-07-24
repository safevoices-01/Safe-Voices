import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
    pgPool?: Pool;
};

function createPool(connectionString: string): Pool {
    const needsSsl =
        /supabase\.(co|com)/i.test(connectionString) ||
        /sslmode=require/i.test(connectionString) ||
        process.env.PGSSLMODE === 'require';

    return new Pool({
        connectionString,
        // Serverless: keep the pool tiny; reuse across warm invocations.
        max: Number(process.env.PG_POOL_MAX ?? '1') || 1,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 10_000,
        ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    });
}

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

    if (!globalForPrisma.pgPool) {
        globalForPrisma.pgPool = createPool(connectionString);
    }

    const adapter = new PrismaPg(globalForPrisma.pgPool);
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
