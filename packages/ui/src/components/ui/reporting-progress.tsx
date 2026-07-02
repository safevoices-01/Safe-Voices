import type { ReactElement } from 'react';

const DEFAULT_FIELD_LABELS: Record<string, string> = {
    incidentDescription: 'What happened',
    location: 'Where',
    occurredAt: 'When',
    attachments: 'Evidence',
    riskLevel: 'Safety signal',
};

export type ReportingProgressProps = {
    fields: Record<string, unknown>;
    fieldKeys: readonly string[];
    title?: string;
    fieldLabels?: Record<string, string>;
    notedLabel?: string;
};

export function ReportingProgress({
    fields,
    fieldKeys,
    title = 'Report progress',
    fieldLabels = DEFAULT_FIELD_LABELS,
    notedLabel = ' (noted)',
}: ReportingProgressProps): ReactElement {
    const filled = fieldKeys.filter((k) => {
        const v = fields[k];
        return v != null && String(v).trim().length > 0;
    });
    const pct = Math.round((filled.length / fieldKeys.length) * 100);

    return (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{title}</span>
                <span className="text-muted-foreground">{pct}%</span>
            </div>
            <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <ul className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {fieldKeys.map((key) => (
                    <li
                        key={key}
                        className={
                            filled.includes(key) ? 'text-primary' : undefined
                        }
                    >
                        {fieldLabels[key] ?? key}
                        {filled.includes(key) ? notedLabel : ''}
                    </li>
                ))}
            </ul>
        </div>
    );
}
