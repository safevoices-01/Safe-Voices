import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCaseStore } from '@safevoices/prisma';
import { extractBearerToken } from '@safevoices/trpc';
import {
    handleCaseChatPost,
    handleCaseMessagesGet,
    handleCaseSessionGet,
    handleCaseSubmitPost,
    handleCaseVerifyPost,
    handleGeneralChatPost,
} from '@safevoices/trpc/case-handlers';
import {
    handlePartnerAttachmentDownloadGet,
    handlePartnerCaseDetailGet,
    handlePartnerCasesGet,
    handlePartnerCaseStatusPatch,
    handlePartnerOtpPost,
    handlePartnerVerifyPost,
} from '@safevoices/trpc/partner-handlers';
import {
    handleCaseUploadConfirmPost,
    handleCaseUploadPost,
} from '@safevoices/trpc/upload-handlers';
import { config as loadEnv } from 'dotenv';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const envPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '.env',
);
loadEnv({ path: envPath });

const defaultCorsOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
];

function getCorsOrigins(): string[] {
    const raw = process.env.SAFEVOICES_CORS_ORIGINS?.trim();
    if (!raw) {
        return defaultCorsOrigins;
    }
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

const app = new Hono();

app.use(
    '/*',
    cors({
        origin: getCorsOrigins(),
        allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
    }),
);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.post('/api/chat', (c) => handleGeneralChatPost(c.req.raw));

app.post('/api/cases', async (c) => {
    const result = await getCaseStore().createCase();
    return c.json({ ...result, secretShownOnce: true });
});

app.post('/api/cases/verify', (c) => handleCaseVerifyPost(c.req.raw));

app.get('/api/cases/session', (c) =>
    handleCaseSessionGet(extractBearerToken(c.req.header('Authorization'))),
);

app.get('/api/cases/:caseId/messages', (c) =>
    handleCaseMessagesGet(
        c.req.param('caseId'),
        extractBearerToken(c.req.header('Authorization')),
    ),
);

app.post('/api/cases/:caseId/submit', (c) =>
    handleCaseSubmitPost(
        c.req.param('caseId'),
        extractBearerToken(c.req.header('Authorization')),
    ),
);

app.post('/api/cases/:caseId/upload', (c) =>
    handleCaseUploadPost(
        c.req.param('caseId'),
        extractBearerToken(c.req.header('Authorization')),
        c.req.raw,
    ),
);

app.post('/api/cases/:caseId/upload/confirm', (c) =>
    handleCaseUploadConfirmPost(
        c.req.param('caseId'),
        extractBearerToken(c.req.header('Authorization')),
        c.req.raw,
    ),
);

app.post('/api/cases/:caseId/chat', (c) =>
    handleCaseChatPost(
        c.req.param('caseId'),
        extractBearerToken(c.req.header('Authorization')),
        c.req.raw,
    ),
);

app.post('/api/auth/partner/otp', (c) => handlePartnerOtpPost(c.req.raw));

app.post('/api/auth/partner/verify', (c) => handlePartnerVerifyPost(c.req.raw));

app.get('/api/partner/cases', (c) =>
    handlePartnerCasesGet(
        c.req.raw,
        extractBearerToken(c.req.header('Authorization')),
    ),
);

app.get('/api/partner/cases/:caseId', (c) =>
    handlePartnerCaseDetailGet(
        c.req.param('caseId'),
        extractBearerToken(c.req.header('Authorization')),
    ),
);

app.patch('/api/partner/cases/:caseId/status', (c) =>
    handlePartnerCaseStatusPatch(
        c.req.param('caseId'),
        extractBearerToken(c.req.header('Authorization')),
        c.req.raw,
    ),
);

app.get('/api/partner/cases/:caseId/attachments/:attachmentId/url', (c) =>
    handlePartnerAttachmentDownloadGet(
        c.req.param('caseId'),
        c.req.param('attachmentId'),
        extractBearerToken(c.req.header('Authorization')),
    ),
);

const port = Number(process.env.PORT ?? '8787');

serve(
    {
        fetch: app.fetch,
        port,
    },
    (info) => {
        console.info(
            `Safe Voices API listening on http://127.0.0.1:${info.port}`,
        );
    },
);
