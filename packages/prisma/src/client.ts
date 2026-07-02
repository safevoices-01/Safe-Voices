import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
    if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = new PrismaClient({
            log:
                process.env.NODE_ENV === 'development'
                    ? ['error', 'warn']
                    : ['error'],
        });
    }
    return globalForPrisma.prisma;
}

/** @deprecated Use getPrisma() so Prisma is not initialized at import time. */
export const prisma = new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
        return Reflect.get(getPrisma(), prop, receiver);
    },
});
