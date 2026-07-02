import type { ReactElement } from 'react';

export type CrisisResource = {
    label: string;
    detail: string;
    url?: string;
};

export type CrisisEscalationPanelLabels = {
    title: string;
    intro: string;
    learnMore: string;
};

export type CrisisEscalationPanelProps = {
    resources: CrisisResource[];
    labels?: Partial<CrisisEscalationPanelLabels>;
};

const DEFAULT_LABELS: CrisisEscalationPanelLabels = {
    title: 'Your safety matters',
    intro: 'If you or someone else may be in immediate danger, consider these resources. You can pause this conversation at any time.',
    learnMore: 'Learn more',
};

export function CrisisEscalationPanel({
    resources,
    labels: labelOverrides,
}: CrisisEscalationPanelProps): ReactElement {
    const labels = { ...DEFAULT_LABELS, ...labelOverrides };

    return (
        <section
            role="alert"
            aria-labelledby="crisis-panel-title"
            className="rounded-2xl border border-amber-500/40 bg-amber-50 px-4 py-4 text-amber-950"
        >
            <h2 id="crisis-panel-title" className="text-base font-semibold">
                {labels.title}
            </h2>
            <p className="mt-2 text-sm">{labels.intro}</p>
            <ul className="mt-3 space-y-2 text-sm">
                {resources.map((r) => (
                    <li key={r.label}>
                        <span className="font-medium">{r.label}:</span> {r.detail}
                        {r.url ? (
                            <>
                                {' '}
                                <a
                                    href={r.url}
                                    className="underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {labels.learnMore}
                                </a>
                            </>
                        ) : null}
                    </li>
                ))}
            </ul>
        </section>
    );
}
