/**
 * Detects database connectivity / schema failures from Prisma driver adapters.
 * Used to decide memory fallback (dev) vs DATABASE_UNAVAILABLE (prod).
 */
export function collectErrorText(error: unknown): string {
    const texts: string[] = [];
    let current: unknown = error;
    for (let depth = 0; depth < 6 && current; depth += 1) {
        if (current instanceof Error) {
            texts.push(current.name, current.message);
            current = (current as Error & { cause?: unknown }).cause;
            continue;
        }
        if (typeof current === 'object' && current !== null) {
            const record = current as Record<string, unknown>;
            if (typeof record.message === 'string') texts.push(record.message);
            if (typeof record.code === 'string') texts.push(record.code);
            current = record.cause;
            continue;
        }
        texts.push(String(current));
        break;
    }
    return texts.join(' ');
}

export function isDatabaseConnectivityError(error: unknown): boolean {
    const haystack = collectErrorText(error).toLowerCase();
    const needles = [
        'enotfound',
        'econnrefused',
        'etimedout',
        'econnreset',
        'tenant/user',
        'driveradaptererror',
        'p1000',
        'p1001',
        'p1017',
        'p2021',
        'p2022',
        'p2010',
        "can't reach database",
        'cannot reach database',
        'connection refused',
        'password authentication failed',
        'too many connections',
        'does not exist',
        'relation "',
        'database_url is required',
        'must be a postgresql',
        'ssl',
        'pgbouncer',
    ];
    return needles.some((n) => haystack.includes(n));
}

export function shouldFallbackToMemoryStore(error: unknown): boolean {
    if (process.env.CASE_STORE?.trim() === 'prisma') return false;
    if (process.env.NODE_ENV === 'production') return false;
    return isDatabaseConnectivityError(error);
}

/** Production: any configured-Prisma failure that should not look like a random 500. */
export function shouldReportDatabaseUnavailable(error: unknown): boolean {
    if (process.env.CASE_STORE?.trim() === 'memory') return false;
    if (!process.env.DATABASE_URL?.trim()) return false;
    return true;
}
