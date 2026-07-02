import {
    createChatStreamResponse,
    parseChatRequestBody,
} from '@safevoices/ai/chat-post';
import { getCaseStore } from '@safevoices/prisma';
import { API_ERROR_CODES, apiErrorResponse } from './api-errors';
import {
    CASE_ID_REGEX,
    hashClientKeyFromRequest,
    SECRET_MIN_LENGTH,
} from './case-http';
import {
    submitCaseResponseSchema,
    verifyCaseAccessRequestSchema,
} from './schemas';

function lastUserText(
    messages: { role: string; parts?: { type: string; text?: string }[] }[],
): string {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
        const m = messages[i];
        if (m?.role === 'user' && m.parts) {
            return m.parts
                .filter((p) => p.type === 'text' && p.text)
                .map((p) => p.text ?? '')
                .join('');
        }
    }
    return '';
}

function parseChatBodyError(
    parsed: { ok: false; error: string; status: number },
): Response {
    const code =
        parsed.status === 400 && parsed.error.includes('Too many messages')
            ? API_ERROR_CODES.CHAT_TOO_MANY_MESSAGES
            : parsed.error.includes('maximum allowed size')
              ? API_ERROR_CODES.CHAT_MESSAGE_TOO_LARGE
              : API_ERROR_CODES.INVALID_JSON;
    return apiErrorResponse(code, parsed.status, parsed.error);
}

export async function handleGeneralChatPost(req: Request): Promise<Response> {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return apiErrorResponse(API_ERROR_CODES.INVALID_JSON, 400);
    }

    const parsed = parseChatRequestBody(body);
    if (!parsed.ok) {
        return parseChatBodyError(parsed);
    }

    return createChatStreamResponse(parsed.messages, {
        locale: parsed.locale ?? 'en',
    });
}

export async function handleCaseVerifyPost(req: Request): Promise<Response> {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return apiErrorResponse(API_ERROR_CODES.INVALID_JSON, 400);
    }

    const parsed = verifyCaseAccessRequestSchema.safeParse(body);
    if (!parsed.success) {
        return apiErrorResponse(API_ERROR_CODES.VERIFY_FAILED, 400);
    }

    const caseId = parsed.data.caseId.trim().toUpperCase();
    const secret = parsed.data.secret.trim();
    if (!CASE_ID_REGEX.test(caseId)) {
        return apiErrorResponse(API_ERROR_CODES.VERIFY_FAILED, 400);
    }
    if (secret.length < SECRET_MIN_LENGTH) {
        return apiErrorResponse(API_ERROR_CODES.VERIFY_FAILED, 400);
    }

    const verified = await getCaseStore().verifyCase({
        caseId,
        secret,
        clientKey: hashClientKeyFromRequest(req),
    });
    if (!verified.ok) {
        const status = verified.reason === 'locked' ? 429 : 401;
        return apiErrorResponse(
            verified.reason === 'locked'
                ? API_ERROR_CODES.VERIFY_LOCKED
                : API_ERROR_CODES.VERIFY_FAILED,
            status,
        );
    }

    return Response.json({
        ok: true,
        caseId,
        token: verified.token,
        expiresAt: verified.expiresAt.toISOString(),
    });
}

export async function handleCaseSessionGet(
    sessionToken: string | undefined,
): Promise<Response> {
    const session = await getCaseStore().resolveSession(sessionToken);
    if (!session) {
        return Response.json({ ok: false }, { status: 401 });
    }
    const store = getCaseStore();
    const submitted = await store.isCaseSubmitted(session.caseId);
    const caseStatus = await store.getCaseStatus(session.caseId);
    return Response.json({
        ok: true,
        caseId: session.caseId,
        expiresAt: session.expiresAt.toISOString(),
        submitted,
        caseStatus,
    });
}

export async function handleCaseMessagesGet(
    caseId: string,
    sessionToken: string | undefined,
): Promise<Response> {
    const session = await getCaseStore().resolveSession(sessionToken);
    if (!session || session.caseId !== caseId) {
        return apiErrorResponse(API_ERROR_CODES.SESSION_EXPIRED, 401);
    }
    const store = getCaseStore();
    const messages = await store.listMessages(caseId, 80);
    const extraction = await store.getExtraction(caseId);
    return Response.json({ messages, extraction });
}

export async function handleCaseSubmitPost(
    caseId: string,
    sessionToken: string | undefined,
): Promise<Response> {
    const session = await getCaseStore().resolveSession(sessionToken);
    if (!session || session.caseId !== caseId) {
        return apiErrorResponse(API_ERROR_CODES.SESSION_EXPIRED, 401);
    }
    const store = getCaseStore();
    if (await store.isCaseSubmitted(caseId)) {
        return apiErrorResponse(API_ERROR_CODES.CASE_SUBMITTED, 409);
    }
    const ok = await store.markCaseSubmitted(caseId);
    if (!ok) {
        return apiErrorResponse(API_ERROR_CODES.CASE_NOT_FOUND, 404);
    }
    const submittedAt = new Date().toISOString();
    const body = submitCaseResponseSchema.parse({
        ok: true,
        caseId,
        submittedAt,
    });
    return Response.json(body);
}

export async function handleCaseChatPost(
    caseId: string,
    sessionToken: string | undefined,
    req: Request,
): Promise<Response> {
    const store = getCaseStore();
    const session = await store.resolveSession(sessionToken);
    if (!session || session.caseId !== caseId) {
        return apiErrorResponse(API_ERROR_CODES.SESSION_EXPIRED, 401);
    }

    if (await store.isCaseSubmitted(caseId)) {
        return apiErrorResponse(API_ERROR_CODES.CASE_SUBMITTED_READONLY, 409);
    }

    await store.touchSession(session.token);

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return apiErrorResponse(API_ERROR_CODES.INVALID_JSON, 400);
    }
    const parsed = parseChatRequestBody(body);
    if (!parsed.ok) {
        return parseChatBodyError(parsed);
    }

    const existingExtraction = (await store.getExtraction(caseId))?.fields ?? {};
    const caseStatus = (await store.getCaseStatus(caseId)) ?? 'OPEN';

    const streamResponse = await createChatStreamResponse(parsed.messages, {
        reportingMode: true,
        locale: parsed.locale ?? 'en',
        caseContext: {
            caseId,
            caseStatus,
            extraction: existingExtraction,
        },
        onFinish: async ({ userText, assistantText, crisis, extractionPatch }) => {
            await store.appendChatTurn({
                caseId,
                userContent: userText || lastUserText(parsed.messages as never[]),
                assistantContent: assistantText,
                clientReqId: parsed.clientRequestId,
                extraction: extractionPatch,
                crisisTriggered: crisis.triggered,
                crisisTriggerType: crisis.triggerType ?? undefined,
            });
        },
    });

    const extraction = await store.getExtraction(caseId);
    const headers = new Headers(streamResponse.headers);
    if (extraction) {
        headers.set(
            'x-sv-extraction',
            Buffer.from(JSON.stringify(extraction)).toString('base64url'),
        );
    }

    return new Response(streamResponse.body, {
        status: streamResponse.status,
        statusText: streamResponse.statusText,
        headers,
    });
}
