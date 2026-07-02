import type { ReactElement, ReactNode } from 'react';

export function SafetyNotice({ children }: { children: ReactNode }): ReactElement {
    return (
        <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            {children}
        </div>
    );
}
