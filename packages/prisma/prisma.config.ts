import { defineConfig } from 'prisma/config';

/**
 * `prisma generate` only needs a valid URL shape (CI/Vercel builds may not
 * inject DATABASE_URL). Runtime and migrations must set the real URL.
 */
const databaseUrl =
    process.env.DATABASE_URL ??
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
