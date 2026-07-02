'use client';

import { toastManager } from '@safevoices/ui/components/toast';

export function toastApiError(title: string, description?: string): void {
    toastManager.add({
        type: 'error',
        title,
        ...(description ? { description } : {}),
    });
}

export function toastApiSuccess(title: string, description?: string): void {
    toastManager.add({
        type: 'success',
        title,
        ...(description ? { description } : {}),
    });
}

export function readJsonErrorMessage(body: unknown): string | undefined {
    if (
        typeof body === 'object' &&
        body !== null &&
        'error' in body &&
        typeof (body as { error: unknown }).error === 'string'
    ) {
        return (body as { error: string }).error;
    }
    return undefined;
}

export function toastFromResponse(res: Response, body: unknown): boolean {
    if (res.ok) {
        return true;
    }
    const detail = readJsonErrorMessage(body) ?? res.statusText;
    toastApiError(`Request failed (${res.status})`, detail);
    return false;
}

export async function fetchJsonWithToast<T>(
    input: RequestInfo | URL,
    init?: RequestInit,
): Promise<T | null> {
    let res: Response;
    try {
        res = await fetch(input, init);
    } catch (err) {
        const message =
            err instanceof Error ? err.message : 'Could not reach the server';
        toastApiError('Network error', message);
        return null;
    }

    const raw = await res.text();
    let body: unknown;
    if (raw.length === 0) {
        body = undefined;
    } else {
        try {
            body = JSON.parse(raw) as unknown;
        } catch {
            toastFromResponse(res, { error: 'Invalid JSON response' });
            return null;
        }
    }

    if (!toastFromResponse(res, body)) {
        return null;
    }

    return body as T;
}

type ToastPromiseLabels = {
    loading: string;
    success: string;
    error: string;
};

export function runWithApiToast<Value>(
    promise: Promise<Value>,
    labels: ToastPromiseLabels,
): Promise<Value> {
    return toastManager.promise(promise, {
        loading: { title: labels.loading, type: 'loading' },
        success: { title: labels.success, type: 'success' },
        error: { title: labels.error, type: 'error' },
    });
}
