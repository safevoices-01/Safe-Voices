import { describe, expect, it } from 'vitest';
import {
    formatExtractionValue,
    getExtractionEntries,
} from './format-extraction';

describe('formatExtractionValue', () => {
    it('formats arrays and empty values', () => {
        expect(formatExtractionValue(null)).toBe('—');
        expect(formatExtractionValue(['a', 'b'])).toBe('a, b');
    });
});

describe('getExtractionEntries', () => {
    it('orders known fields first and skips empty values', () => {
        const entries = getExtractionEntries({
            riskLevel: 'high',
            incidentDescription: 'Details',
            location: '',
            custom: 'extra',
        });
        expect(entries.map((e) => e.key)).toEqual([
            'incidentDescription',
            'riskLevel',
            'custom',
        ]);
    });
});
