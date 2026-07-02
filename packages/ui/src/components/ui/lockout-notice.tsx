import type { ReactElement, ReactNode } from 'react';

export function LockoutNotice({ children }: { children: ReactNode }): ReactElement {
    return (
        <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive-foreground"
        >
            {children}
        </div>
    );
}
