import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    detectCrisisLanguage,
    getReportingSystemPrompt,
    mergeExtractionFromText,
} from './reporting';

describe('detectCrisisLanguage', () => {
    it('triggers on English urgency keywords', () => {
        const result = detectCrisisLanguage('I want to kill myself', 'en');
        assert.equal(result.triggered, true);
    });

    it('triggers on Arabic urgency keywords', () => {
        const result = detectCrisisLanguage('أفكر في الانتحار', 'ar');
        assert.equal(result.triggered, true);
    });

    it('does not trigger on neutral text', () => {
        const result = detectCrisisLanguage('I saw unsafe equipment', 'en');
        assert.equal(result.triggered, false);
    });
});

describe('getReportingSystemPrompt', () => {
    it('includes MSA respond instruction for Arabic', () => {
        const prompt = getReportingSystemPrompt('ar');
        assert.match(prompt, /الفصحى/);
    });
});

describe('mergeExtractionFromText', () => {
    it('fills incident description from user text', () => {
        const merged = mergeExtractionFromText(
            {},
            'A long description of what happened at work today with enough detail.',
            '',
        );
        assert.ok(merged.incidentDescription);
    });
});
