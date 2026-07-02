import {
    REPORTING_EXTRACTION_FIELDS,
    REPORTING_EXTRACTION_SCHEMA_VERSION,
    type ReportingExtractionField,
} from './chat';

export type ReportingLocale = 'en' | 'ar';

export const REPORTING_SYSTEM_PROMPT_EN = `You are the Safe Voices reporting assistant. You help someone describe a workplace concern at their own pace for anonymous reporting.

Rules:
- Do not ask for legal name, email, phone, or government ID unless they voluntarily offer contact information.
- Do not present yourself as a therapist, lawyer, law enforcement, or investigator.
- Do not guarantee outcomes, timelines, or disciplinary results.
- Allow them to skip any question. Use calm, neutral, supportive language.
- Encourage official organizational channels when appropriate.
- If they describe immediate danger to life, pause normal questions and focus on safety resources.

You help them articulate: what happened, where, when, who was involved (roles only if they wish), and any evidence they choose to share.`;

export const REPORTING_SYSTEM_PROMPT_AR = `أنت مساعد الإبلاغ في Safe Voices. تساعد شخصًا على وصف مخاوفه المتعلقة ببيئة العمل على وتيرته للإبلاغ المجهول.

القواعد:
- لا تطلب الاسم القانوني أو البريد الإلكتروني أو الهاتف أو هوية حكومية ما لم يقدّمها طواعية.
- لا تقدّم نفسك كمعالج نفسي أو محامٍ أو جهة إنفاذ قانون أو محقق.
- لا تضمن نتائج أو جداول زمنية أو إجراءات تأديبية.
- اسمح بتخطي أي سؤال. استخدم لغة هادئة ومحايدة وداعمة.
- شجّع القنوات الرسمية للمؤسسة عند الاقتضاء.
- إذا وصف خطرًا فوريًا على الحياة، أوقف الأسئلة الاعتيادية وركّز على موارد السلامة.

ساعده على توضيح: ما الذي حدث، وأين، ومتى، ومن كان متورطًا (الأدوار فقط إن رغب)، وأي أدلة يختار مشاركتها.

ردّ فقط بالعربية الفصحى الحديثة (الفصحى).`;

/** @deprecated Use getReportingSystemPrompt('en') */
export const REPORTING_SYSTEM_PROMPT = REPORTING_SYSTEM_PROMPT_EN;

export function getReportingSystemPrompt(locale: ReportingLocale = 'en'): string {
    return locale === 'ar' ? REPORTING_SYSTEM_PROMPT_AR : REPORTING_SYSTEM_PROMPT_EN;
}

export const CRISIS_KEYWORDS_EN = [
    'kill myself',
    'suicide',
    'end my life',
    'hurt myself',
    'going to die',
    'murder',
    'kill them',
    'weapon',
    'gun at work',
] as const;

export const CRISIS_KEYWORDS_AR = [
    'انتحار',
    'أقتل نفسي',
    'اقتل نفسي',
    'أؤذي نفسي',
    'اؤذي نفسي',
    'سأموت',
    'سأقتل',
    'قتل',
    'سلاح',
    'مسدس',
    'خطر فوري',
    'أريد الموت',
] as const;

/** @deprecated Use CRISIS_KEYWORDS_EN */
export const CRISIS_KEYWORDS = CRISIS_KEYWORDS_EN;

export type CrisisDetection = {
    triggered: boolean;
    triggerType: string | null;
};

export function detectCrisisLanguage(
    text: string,
    locale?: ReportingLocale,
): CrisisDetection {
    const lower = text.toLowerCase();
    const lists =
        locale === 'ar'
            ? [CRISIS_KEYWORDS_AR]
            : locale === 'en'
              ? [CRISIS_KEYWORDS_EN]
              : [CRISIS_KEYWORDS_EN, CRISIS_KEYWORDS_AR];

    for (const keywords of lists) {
        for (const keyword of keywords) {
            const needle = keyword.toLowerCase();
            if (lower.includes(needle) || text.includes(keyword)) {
                return { triggered: true, triggerType: keyword };
            }
        }
    }
    return { triggered: false, triggerType: null };
}

export type CrisisResource = {
    label: string;
    detail: string;
    url?: string;
};

const DEFAULT_CRISIS_EN: CrisisResource[] = [
    {
        label: 'Emergency',
        detail: 'If you are in immediate danger, contact local emergency services (for example 911 in the US).',
    },
    {
        label: 'Crisis support (US)',
        detail: '988 Suicide and Crisis Lifeline — call or text 988.',
        url: 'https://988lifeline.org/',
    },
];

const DEFAULT_CRISIS_AR: CrisisResource[] = [
    {
        label: 'طوارئ',
        detail: 'إذا كنت في خطر فوري، اتصل بخدمات الطوارئ المحلية.',
    },
    {
        label: 'دعم الأزمات (الولايات المتحدة)',
        detail: 'خط المساعدة 988 — اتصل أو أرسل رسالة إلى 988.',
        url: 'https://988lifeline.org/',
    },
];

export function getCrisisResources(locale: ReportingLocale = 'en'): CrisisResource[] {
    const raw = process.env.SAFEVOICES_CRISIS_RESOURCES_JSON;
    if (raw) {
        try {
            const parsed = JSON.parse(raw) as
                | CrisisResource[]
                | Partial<Record<ReportingLocale, CrisisResource[]>>;
            if (Array.isArray(parsed)) return parsed;
            if (parsed[locale]?.length) return parsed[locale]!;
            if (parsed.en?.length) return parsed.en;
        } catch {
            /* fall through */
        }
    }
    return locale === 'ar' ? DEFAULT_CRISIS_AR : DEFAULT_CRISIS_EN;
}

export function buildReportingSystemPrompt(
    context?: {
        extraction?: Record<string, unknown>;
        caseStatus?: string;
    },
    locale: ReportingLocale = 'en',
): string {
    const lines = [getReportingSystemPrompt(locale)];
    if (context?.caseStatus) {
        lines.push(`Case status: ${context.caseStatus}`);
    }
    if (context?.extraction && Object.keys(context.extraction).length > 0) {
        lines.push('Known details from the conversation so far:');
        for (const field of REPORTING_EXTRACTION_FIELDS) {
            const value = context.extraction[field];
            if (value != null && String(value).trim()) {
                lines.push(`- ${field}: ${String(value)}`);
            }
        }
    }
    return lines.join('\n\n');
}

export function mergeExtractionFromText(
    existing: Record<string, unknown>,
    userText: string,
    assistantText: string,
): Record<string, unknown> {
    const combined = `${userText}\n${assistantText}`;
    const next = { ...existing };
    if (!next.incidentDescription && userText.trim().length > 20) {
        next.incidentDescription = userText.trim().slice(0, 4000);
    }
    const locationMatch = combined.match(
        /\b(?:at|in|near)\s+([A-Za-z0-9\s,.-]{3,80})/i,
    );
    if (!next.location && locationMatch?.[1]) {
        next.location = locationMatch[1].trim();
    }
    if (
        /\b(urgent|immediate|danger|unsafe|threat)\b/i.test(combined) &&
        !next.riskLevel
    ) {
        next.riskLevel = 'high';
    }
    return next;
}

export function toExtractionPatch(
    fields: Record<string, unknown>,
): { schemaVersion: number; fields: Record<string, unknown> } {
    const filtered: Record<string, unknown> = {};
    for (const key of REPORTING_EXTRACTION_FIELDS) {
        if (fields[key] != null) filtered[key] = fields[key];
    }
    return {
        schemaVersion: REPORTING_EXTRACTION_SCHEMA_VERSION,
        fields: filtered,
    };
}

export type { ReportingExtractionField };
