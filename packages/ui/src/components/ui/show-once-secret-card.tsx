'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import { Button } from './button';

export type ShowOnceSecretCardLabels = {
    intro: string;
    caseIdLabel: string;
    secretLabel: string;
    copyLabel: string;
    copiedLabel: string;
    ackLabel: string;
    verifyingLabel: string;
};

export type ShowOnceSecretCardProps = {
    caseId: string;
    secret: string;
    acknowledged: boolean;
    onAcknowledgedChange: (value: boolean) => void;
    onContinue: () => void;
    continueLabel?: string;
    busy?: boolean;
    labels?: Partial<ShowOnceSecretCardLabels>;
};

const DEFAULT_LABELS: ShowOnceSecretCardLabels = {
    intro: 'This secret is shown once. Store it safely to access your report later.',
    caseIdLabel: 'Case ID',
    secretLabel: 'Secret',
    copyLabel: 'Copy credentials',
    copiedLabel: 'Copied',
    ackLabel: 'I saved my secret and understand it cannot be recovered.',
    verifyingLabel: 'Verifying...',
};

export function ShowOnceSecretCard({
    caseId,
    secret,
    acknowledged,
    onAcknowledgedChange,
    onContinue,
    continueLabel = 'Continue to secure chat',
    busy = false,
    labels: labelOverrides,
}: ShowOnceSecretCardProps): ReactElement {
    const labels = { ...DEFAULT_LABELS, ...labelOverrides };
    const [copied, setCopied] = useState(false);

    const copyBoth = async (): Promise<void> => {
        const text = `${labels.caseIdLabel}: ${caseId}\n${labels.secretLabel}: ${secret}`;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{labels.intro}</p>
            <div className="space-y-2 rounded-xl bg-muted p-4">
                <p className="text-xs uppercase text-muted-foreground">
                    {labels.caseIdLabel}
                </p>
                <p className="ltr-embed font-mono text-sm">{caseId}</p>
                <p className="text-xs uppercase text-muted-foreground">
                    {labels.secretLabel}
                </p>
                <p className="ltr-embed break-all font-mono text-sm">{secret}</p>
            </div>
            <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void copyBoth()}
            >
                {copied ? labels.copiedLabel : labels.copyLabel}
            </Button>
            <label className="flex items-start gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => onAcknowledgedChange(e.target.checked)}
                    className="mt-0.5"
                />
                <span>{labels.ackLabel}</span>
            </label>
            <Button
                type="button"
                className="w-full"
                disabled={!acknowledged || busy}
                onClick={onContinue}
            >
                {busy ? labels.verifyingLabel : continueLabel}
            </Button>
        </div>
    );
}
