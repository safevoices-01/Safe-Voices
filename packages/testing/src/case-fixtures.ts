export const FIXTURE_CASE_ID = 'SV-TEST1-2345';
export const FIXTURE_SECRET = 'fixture-secret-minimum-length-ok';

export function buildVerifyBody(overrides?: {
    caseId?: string;
    secret?: string;
}): { caseId: string; secret: string } {
    return {
        caseId: overrides?.caseId ?? FIXTURE_CASE_ID,
        secret: overrides?.secret ?? FIXTURE_SECRET,
    };
}
