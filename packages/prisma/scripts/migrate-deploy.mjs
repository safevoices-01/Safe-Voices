#!/usr/bin/env node
/**
 * Apply pending Prisma migrations during deploy/build.
 *
 * Prefers DIRECT_URL (session pooler :5432). Falls back to DATABASE_URL,
 * rewriting Supabase transaction-pooler (:6543?pgbouncer=true) to session
 * mode when possible.
 *
 * Skips when no database URL is set (local memory-store / CI without Postgres).
 * On Vercel with a database URL configured, migrate failure fails the build.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function trim(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function toSessionUrl(url) {
    if (!url) return '';
    try {
        const parsed = new URL(url);
        const isPooler =
            parsed.port === '6543' ||
            parsed.searchParams.get('pgbouncer') === 'true' ||
            /pgbouncer=true/i.test(url);
        if (!isPooler) return url;
        parsed.port = '5432';
        parsed.searchParams.delete('pgbouncer');
        return parsed.toString();
    } catch {
        return url
            .replace(':6543/', ':5432/')
            .replace(/([?&])pgbouncer=true&?/i, '$1')
            .replace(/[?&]$/, '');
    }
}

const directUrl = trim(process.env.DIRECT_URL);
const databaseUrl = trim(process.env.DATABASE_URL);
const migrateUrl = directUrl || toSessionUrl(databaseUrl) || databaseUrl;

const onVercel = process.env.VERCEL === '1';
const isProd =
    process.env.VERCEL_ENV === 'production' ||
    process.env.NODE_ENV === 'production';

if (!migrateUrl) {
    console.log(
        '[prisma] db:migrate:deploy skipped (no DATABASE_URL or DIRECT_URL). Using memory store until Postgres is configured.',
    );
    process.exit(0);
}

if (
    !migrateUrl.startsWith('postgres://') &&
    !migrateUrl.startsWith('postgresql://')
) {
    console.error(
        '[prisma] DATABASE_URL/DIRECT_URL must be a PostgreSQL connection string.',
    );
    process.exit(onVercel || isProd ? 1 : 0);
}

console.log(
    `[prisma] Running migrate deploy (${directUrl ? 'DIRECT_URL' : 'DATABASE_URL session rewrite'})…`,
);

const result = spawnSync(
    'pnpm',
    ['exec', 'prisma', 'migrate', 'deploy'],
    {
        cwd: packageRoot,
        env: {
            ...process.env,
            // prisma.config.ts reads DATABASE_URL; point it at the session URL.
            DATABASE_URL: migrateUrl,
            DIRECT_URL: directUrl || migrateUrl,
        },
        stdio: 'inherit',
        shell: process.platform === 'win32',
    },
);

if (result.error) {
    console.error('[prisma] Failed to start migrate deploy:', result.error);
    process.exit(1);
}

if (result.status !== 0) {
    console.error(
        '[prisma] migrate deploy failed. Set DIRECT_URL to the Supabase session pooler (:5432) and ensure the database is reachable.',
    );
    process.exit(result.status ?? 1);
}

console.log('[prisma] Migrations applied.');
