import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { getChatModelId, getChatSystemPrompt, type ChatLocale } from './chat';
import {
    buildReportingSystemPrompt,
    detectCrisisLanguage,
    mergeExtractionFromText,
    toExtractionPatch,
} from './reporting';

export type ChatParseFailure = {
    ok: false;
    error: string;
    status: number;
};

export type ChatParseSuccess = {
    ok: true;
    messages: UIMessage[];
    clientRequestId?: string;
    locale?: ChatLocale;
};

export type ChatStreamOptions = {
    reportingMode?: boolean;
    locale?: ChatLocale;
    caseContext?: {
        caseId?: string;
        caseStatus?: string;
        extraction?: Record<string, unknown>;
    };
    onFinish?: (payload: {
        userText: string;
        assistantText: string;
        crisis: ReturnType<typeof detectCrisisLanguage>;
        extractionPatch: ReturnType<typeof toExtractionPatch>;
    }) => void | Promise<void>;
};

export function getChatMaxMessages(): number {
    return Math.min(
        Math.max(
            Number(process.env.SAFEVOICES_CHAT_MAX_MESSAGES ?? '40') || 40,
            1,
        ),
        100,
    );
}

export function getChatMaxCharsPerMessage(): number {
    return Math.min(
        Math.max(
            Number(
                process.env.SAFEVOICES_CHAT_MAX_CHARS_PER_MESSAGE ?? '12000',
            ) || 12000,
            1000,
        ),
        100_000,
    );
}

export function parseChatRequestBody(
    body: unknown,
): ChatParseSuccess | ChatParseFailure {
    if (!body || typeof body !== 'object' || !('messages' in body)) {
        return {
            ok: false,
            error: 'Expected a JSON object with a messages array',
            status: 400,
        };
    }

    const record = body as {
        messages: unknown;
        clientRequestId?: unknown;
        locale?: unknown;
    };
    const { messages } = record;
    if (!Array.isArray(messages)) {
        return { ok: false, error: 'messages must be an array', status: 400 };
    }

    const maxMessages = getChatMaxMessages();
    if (messages.length > maxMessages) {
        return {
            ok: false,
            error: `Too many messages (max ${maxMessages})`,
            status: 400,
        };
    }

    const maxChars = getChatMaxCharsPerMessage();
    for (const m of messages) {
        const text = JSON.stringify(m);
        if (text.length > maxChars) {
            return {
                ok: false,
                error: 'A message exceeds the maximum allowed size',
                status: 400,
            };
        }
    }

    const clientRequestId =
        typeof record.clientRequestId === 'string'
            ? record.clientRequestId
            : undefined;

    const locale =
        record.locale === 'ar' || record.locale === 'en'
            ? record.locale
            : undefined;

    return {
        ok: true,
        messages: messages as UIMessage[],
        clientRequestId,
        locale,
    };
}

export function missingGatewayKeyResponse(): Response {
    return Response.json(
        {
            code: 'CHAT_UNAVAILABLE',
            error: 'CHAT_UNAVAILABLE',
        },
        { status: 503 },
    );
}

function lastUserText(messages: UIMessage[]): string {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
        const m = messages[i];
        if (m?.role === 'user') {
            return m.parts
                .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map((p) => p.text)
                .join('');
        }
    }
    return '';
}

export async function createChatStreamResponse(
    messages: UIMessage[],
    options: ChatStreamOptions = {},
): Promise<Response> {
    if (process.env.SAFEVOICES_CHAT_DISABLED === 'true') {
        return Response.json(
            { code: 'CHAT_DISABLED', error: 'CHAT_DISABLED' },
            { status: 503 },
        );
    }
    if (!process.env.AI_GATEWAY_API_KEY?.trim()) {
        return missingGatewayKeyResponse();
    }

    const reportingMode = options.reportingMode ?? false;
    const locale = options.locale ?? 'en';
    const system = reportingMode
        ? buildReportingSystemPrompt(
              {
                  extraction: options.caseContext?.extraction,
                  caseStatus: options.caseContext?.caseStatus,
              },
              locale,
          )
        : getChatSystemPrompt(locale);

    const modelMessages = await convertToModelMessages(messages);
    const userText = lastUserText(messages);
    const crisis = reportingMode
        ? detectCrisisLanguage(userText, locale)
        : { triggered: false, triggerType: null };

    const result = streamText({
        model: getChatModelId(),
        system: crisis.triggered
            ? `${system}\n\nThe user may be in immediate danger. Respond with brief safety-oriented guidance first. Do not continue investigative questions until safety is addressed.`
            : system,
        messages: modelMessages,
        onFinish: async ({ text }) => {
            if (!options.onFinish) return;
            const existing = options.caseContext?.extraction ?? {};
            const merged = reportingMode
                ? mergeExtractionFromText(existing, userText, text)
                : existing;
            await options.onFinish({
                userText,
                assistantText: text,
                crisis,
                extractionPatch: toExtractionPatch(merged),
            });
        },
    });

    return result.toUIMessageStreamResponse();
}
