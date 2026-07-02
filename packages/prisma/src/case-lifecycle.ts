import type { CaseStatusValue } from './case-store-types';

export const ALLOWED_STATUS_TRANSITIONS: Record<
    CaseStatusValue,
    readonly CaseStatusValue[]
> = {
    OPEN: [],
    SUBMITTED: ['UNDER_REVIEW'],
    UNDER_REVIEW: ['RESOLVED', 'CLOSED'],
    RESOLVED: ['CLOSED'],
    CLOSED: [],
};

export function canTransitionCaseStatus(
    from: CaseStatusValue,
    to: CaseStatusValue,
): boolean {
    return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}
