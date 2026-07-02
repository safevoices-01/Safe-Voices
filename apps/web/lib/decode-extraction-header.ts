export type ExtractionHeaderPayload = {
    schemaVersion?: number;
    fields?: Record<string, unknown>;
};

/** Decode `x-sv-extraction` (base64url JSON) from case chat responses. */
export function decodeExtractionHeader(
    header: string,
): ExtractionHeaderPayload | null {
    try {
        const base64 = header.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const json = atob(padded);
        const parsed = JSON.parse(json) as ExtractionHeaderPayload;
        if (typeof parsed !== 'object' || parsed === null) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}
