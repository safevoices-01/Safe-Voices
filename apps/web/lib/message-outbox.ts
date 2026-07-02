const STORAGE_KEY = 'safevoices_message_outbox';

export type OutboxEntry = {
    id: string;
    caseId: string;
    content: string;
    status: 'queued' | 'sending' | 'sent' | 'failed';
    attempts: number;
    createdAt: number;
};

export function loadOutbox(): OutboxEntry[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as OutboxEntry[];
    } catch {
        return [];
    }
}

export function saveOutbox(entries: OutboxEntry[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function enqueueMessage(entry: OutboxEntry): void {
    const next = [...loadOutbox(), entry];
    saveOutbox(next);
}
