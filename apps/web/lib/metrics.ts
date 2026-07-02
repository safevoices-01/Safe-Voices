type CounterMap = Map<string, number>;

const counters: CounterMap = new Map();

export function incrementMetric(name: string, delta = 1): void {
    counters.set(name, (counters.get(name) ?? 0) + delta);
}

export function getMetricsSnapshot(): Record<string, number> {
    return Object.fromEntries(counters.entries());
}

export const METRIC_CASE_CREATE = 'safevoices_case_create_total';
export const METRIC_VERIFY_FAILURE = 'safevoices_verify_failure_total';
export const METRIC_LOCKOUT = 'safevoices_lockout_total';
export const METRIC_SESSION_EXPIRY = 'safevoices_session_expiry_total';
export const METRIC_CRISIS = 'safevoices_crisis_trigger_total';
export const METRIC_SUBMIT_ERROR = 'safevoices_submit_error_total';
