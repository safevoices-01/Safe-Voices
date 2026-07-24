import { defineConfig } from 'prisma/config';

/**
 * Prefer DIRECT_URL (session / migrate) over DATABASE_URL (pooler / runtime).
 * `prisma generate` only needs a valid URL shape when neither is set (CI build).
 * Runtime Prisma client still reads DATABASE_URL in src/client.ts.
 */
const databaseUrl =
    process.env.DIRECT_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    'postgresql://postgres:postgres@127.0.0.1:5432/safevoices?schema=public';

export default defineConfig({
    schema: './schema.prisma',
    migrations: {
        path: './migrations',
    },
    datasource: {
        url: databaseUrl,
    },
});
