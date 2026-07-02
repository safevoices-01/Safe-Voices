import { runRetentionPurge } from '@safevoices/prisma';

export async function POST(req: Request): Promise<Response> {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) {
        return Response.json(
            { code: 'NOT_CONFIGURED', error: 'CRON_SECRET is not set' },
            { status: 503 },
        );
    }

    const auth = req.headers.get('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token || token !== secret) {
        return Response.json(
            { code: 'UNAUTHORIZED', error: 'Unauthorized' },
            { status: 401 },
        );
    }

    const result = await runRetentionPurge();
    return Response.json({ ok: true, purged: result.purged });
}
