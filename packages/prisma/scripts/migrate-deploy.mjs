#!/usr/bin/env node
/**
 * Apply pending Prisma migrations during deploy/build.
 *
 * Tries, in order:
 * 1. DIRECT_URL (recommended: Session pooler :5432 from Supabase Connect)
 * 2. DATABASE_URL rewritten from transaction pooler (:6543) → session (:5432)
 * 3. Direct DB host db.{projectRef}.supabase.co with user `postgres`
 *
 * Skips when no database URL is set (local memory-store / CI without Postgres).
 * On Vercel with a database URL configured, migrate failure fails the build.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
);

function trim(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function parsePgUrl(url) {
    try {
        return new URL(url);
    } catch {
        return null;
    }
}

function toSessionPoolerUrl(url) {
    if (!url) return '';
    const parsed = parsePgUrl(url);
    if (!parsed) {
        return url
            .replace(':6543/', ':5432/')
            .replace(/([?&])pgbouncer=true&?/i, '$1')
            .replace(/[?&]$/, '');
    }
    const isPooler =
        parsed.port === '6543' ||
        parsed.searchParams.get('pgbouncer') === 'true' ||
        /pooler\.supabase\.com$/i.test(parsed.hostname);
    if (!isPooler) return url;
    parsed.port = '5432';
    parsed.searchParams.delete('pgbouncer');
    return parsed.toString();
}

/**
 * Convert pooler URL (user postgres.{ref}) → direct host db.{ref}.supabase.co
 * with user `postgres`. Useful when the shared pooler returns tenant/user not found.
 */
function toDirectDbUrl(url) {
    const parsed = parsePgUrl(url);
    if (!parsed) return '';

    const user = decodeURIComponent(parsed.username || '');
    const match = /^postgres\.([a-z0-9]+)$/i.exec(user);
    if (!match) return '';

    const projectRef = match[1];
    const password = parsed.password || '';
    const direct = new URL('postgresql://localhost/postgres');
    direct.username = 'postgres';
    direct.password = password;
    direct.hostname = `db.${projectRef}.supabase.co`;
    direct.port = '5432';
    direct.pathname = parsed.pathname || '/postgres';
    direct.search = '';
    direct.searchParams.set('sslmode', 'require');
    return direct.toString();
}

function redactUrl(url) {
    try {
        const parsed = new URL(url);
        if (parsed.password) parsed.password = '***';
        return parsed.toString();
    } catch {
        return '(invalid url)';
    }
}

function runMigrate(url, label) {
    console.log(`[prisma] migrate deploy via ${label}: ${redactUrl(url)}`);
    const result = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
        cwd: packageRoot,
        env: {
            ...process.env,
            DATABASE_URL: url,
            DIRECT_URL: url,
        },
        encoding: 'utf8',
        shell: process.platform === 'win32',
    });

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    return {
        ok: result.status === 0,
        status: result.status ?? 1,
        error: result.error,
        output: `${result.stdout ?? ''}\n${result.stderr ?? ''}`,
    };
}

function printRemediation(lastOutput) {
    console.error(`
[prisma] migrate deploy failed.

Supabase rejected the connection (often: "tenant/user … not found").

Fix on Vercel → Project → Settings → Environment Variables (Production):

1. Open Supabase → Project → Connect → ORMs → Prisma (or Session / Direct).
2. Copy fresh URLs (password + region must match the live project):

   DATABASE_URL  = Transaction pooler  (:6543?pgbouncer=true)
                   user = postgres.<project-ref>
                   host = aws-0-<REGION>.pooler.supabase.com

   DIRECT_URL    = Session pooler (:5432)  OR  Direct
                   Session: same pooler host, port 5432, user postgres.<project-ref>
                   Direct:  postgresql://postgres:PASSWORD@db.<project-ref>.supabase.co:5432/postgres?sslmode=require

3. Confirm the project is Active (not paused) and the region in the host
   matches the dashboard (aws-0-… vs aws-1-… mistakes cause tenant/user errors).

4. Redeploy after saving env vars.

Last engine output:
${lastOutput.trim().slice(-800)}
`);
}

const directUrl = trim(process.env.DIRECT_URL);
const databaseUrl = trim(process.env.DATABASE_URL);

const onVercel = process.env.VERCEL === '1';
const isProd =
    process.env.VERCEL_ENV === 'production' ||
    process.env.NODE_ENV === 'production';

const candidates = [];
const seen = new Set();

function addCandidate(url, label) {
    if (!url || seen.has(url)) return;
    seen.add(url);
    candidates.push({ url, label });
}

addCandidate(directUrl, 'DIRECT_URL');
addCandidate(toSessionPoolerUrl(databaseUrl), 'DATABASE_URL→session');
addCandidate(databaseUrl, 'DATABASE_URL');
addCandidate(toDirectDbUrl(directUrl || databaseUrl), 'db.<ref>.supabase.co');

if (candidates.length === 0) {
    console.log(
        '[prisma] db:migrate:deploy skipped (no DATABASE_URL or DIRECT_URL). Using memory store until Postgres is configured.',
    );
    process.exit(0);
}

for (const candidate of candidates) {
    if (
        !candidate.url.startsWith('postgres://') &&
        !candidate.url.startsWith('postgresql://')
    ) {
        console.error(`[prisma] Skipping invalid URL (${candidate.label}).`);
        continue;
    }

    const result = runMigrate(candidate.url, candidate.label);
    if (result.error) {
        console.error('[prisma] Failed to start migrate:', result.error);
        continue;
    }
    if (result.ok) {
        console.log('[prisma] Migrations applied.');
        process.exit(0);
    }

    const tenantMissing = /tenant\/user|tenant or user not found/i.test(
        result.output,
    );
    if (!tenantMissing && candidates.indexOf(candidate) === candidates.length - 1) {
        printRemediation(result.output);
        process.exit(result.status);
    }
    if (tenantMissing) {
        console.warn(
            `[prisma] ${candidate.label} rejected (tenant/user). Trying next candidate…`,
        );
    }
}

printRemediation('(all connection candidates failed)');
process.exit(onVercel || isProd ? 1 : 1);
