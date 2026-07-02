import { REPORTING_EXTRACTION_FIELDS } from '@safevoices/ai/chat';

export function formatExtractionValue(value: unknown): string {
    if (value == null || value === '') return '—';
    if (Array.isArray(value)) {
        return value.map((item) => formatExtractionValue(item)).join(', ');
    }
    if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
    }
    return String(value);
}

export function getExtractionEntries(
    fields: Record<string, unknown>,
    orderedKeys: readonly string[] = REPORTING_EXTRACTION_FIELDS,
): Array<{ key: string; value: unknown }> {
    const entries: Array<{ key: string; value: unknown }> = [];
    const seen = new Set<string>();

    for (const key of orderedKeys) {
        const value = fields[key];
        if (value == null || value === '') continue;
        entries.push({ key, value });
        seen.add(key);
    }

    for (const [key, value] of Object.entries(fields)) {
        if (seen.has(key) || value == null || value === '') continue;
        entries.push({ key, value });
    }

    return entries;
}

export function extractionLabelKey(
    fieldKey: string,
): 'incidentDescription' | 'location' | 'occurredAt' | 'attachments' | 'riskLevel' | null {
    if (
        fieldKey === 'incidentDescription' ||
        fieldKey === 'location' ||
        fieldKey === 'occurredAt' ||
        fieldKey === 'attachments' ||
        fieldKey === 'riskLevel'
    ) {
        return fieldKey;
    }
    return null;
}
