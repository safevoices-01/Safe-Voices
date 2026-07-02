import { describe, expect, it } from 'vitest';
import ar from './ar.json';
import en from './en.json';

function flattenKeys(
    obj: Record<string, unknown>,
    prefix = '',
): string[] {
    return Object.entries(obj).flatMap(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return flattenKeys(value as Record<string, unknown>, path);
        }
        return [path];
    });
}

describe('message catalog key parity', () => {
    it('en and ar have the same keys', () => {
        const enKeys = flattenKeys(en as Record<string, unknown>).sort();
        const arKeys = flattenKeys(ar as Record<string, unknown>).sort();
        expect(arKeys).toEqual(enKeys);
    });
});
