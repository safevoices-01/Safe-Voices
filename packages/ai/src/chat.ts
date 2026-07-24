import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

const defaultGatewayModel = 'anthropic/claude-sonnet-4-5';
const defaultGeminiModel = 'gemini-flash-latest';

export type ChatLocale = 'en' | 'ar';

export type ChatProviderKind = 'gemini' | 'gateway' | 'none';

export const CHAT_SYSTEM_PROMPT_EN = `You are the Safe Voices assistant. You help visitors understand confidential and anonymous workplace reporting: how to describe concerns clearly, what to expect from a triage process, how tracking codes typically work, and how to stay safe when sharing sensitive information.

You do not provide legal advice, medical advice, or definitive judgments about specific situations. Encourage users to follow their organization's official channels and local laws. Keep answers concise, calm, and respectful.`;

export const CHAT_SYSTEM_PROMPT_AR = `أنت مساعد Safe Voices. تساعد الزوار على فهم الإبلاغ السري والمجهول في بيئة العمل: كيفية وصف المخاوف بوضوح، وما يمكن توقعه من عملية الفرز، وكيف تعمل رموز المتابعة عادة، وكيف يبقى الشخص آمنا عند مشاركة معلومات حساسة.

لا تقدّم استشارة قانونية أو طبية أو أحكامًا نهائية عن حالات محددة. شجّع المستخدمين على اتباع القنوات الرسمية للمؤسسة والقوانين المحلية. اجعل الإجابات موجزة وهادئة ومحترمة.

ردّ فقط بالعربية الفصحى الحديثة (الفصحى).`;

/** @deprecated Use getChatSystemPrompt('en') */
export const CHAT_SYSTEM_PROMPT = CHAT_SYSTEM_PROMPT_EN;

export function getChatSystemPrompt(locale: ChatLocale = 'en'): string {
    return locale === 'ar' ? CHAT_SYSTEM_PROMPT_AR : CHAT_SYSTEM_PROMPT_EN;
}

export function getGeminiApiKey(): string | undefined {
    const google = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
    if (google) return google;
    const alias = process.env.GEMINI_API_KEY?.trim();
    return alias || undefined;
}

export function getChatProvider(): ChatProviderKind {
    if (getGeminiApiKey()) return 'gemini';
    if (process.env.AI_GATEWAY_API_KEY?.trim()) return 'gateway';
    return 'none';
}

export function hasChatProviderCredentials(): boolean {
    return getChatProvider() !== 'none';
}

function resolveGeminiModelId(): string {
    const fromEnv = process.env.SAFEVOICES_CHAT_MODEL?.trim();
    if (!fromEnv) return defaultGeminiModel;
    const normalized = fromEnv.replace(/^google\//, '');
    if (normalized.startsWith('gemini')) return normalized;
    return defaultGeminiModel;
}

/**
 * Model id for gateway provider (provider/model string).
 * Prefer {@link getChatModel} for streaming.
 */
export function getChatModelId(): string {
    const fromEnv = process.env.SAFEVOICES_CHAT_MODEL?.trim();
    return fromEnv && fromEnv.length > 0 ? fromEnv : defaultGatewayModel;
}

/**
 * Language model for streamText / generateText.
 * Gemini wins when a Gemini API key is configured.
 */
export function getChatModel(): LanguageModel | string | null {
    const provider = getChatProvider();
    if (provider === 'gemini') {
        const apiKey = getGeminiApiKey();
        if (!apiKey) return null;
        const google = createGoogleGenerativeAI({ apiKey });
        return google(resolveGeminiModelId());
    }
    if (provider === 'gateway') {
        return getChatModelId();
    }
    return null;
}

export const CHAT_DEFAULT_MODEL = defaultGatewayModel;
export const CHAT_DEFAULT_GEMINI_MODEL = defaultGeminiModel;

export const REPORTING_EXTRACTION_SCHEMA_VERSION = 1;

export type ReportingExtractionField =
    | 'incidentDescription'
    | 'location'
    | 'occurredAt'
    | 'attachments'
    | 'riskLevel';

export const REPORTING_EXTRACTION_FIELDS: readonly ReportingExtractionField[] = [
    'incidentDescription',
    'location',
    'occurredAt',
    'attachments',
    'riskLevel',
] as const;
