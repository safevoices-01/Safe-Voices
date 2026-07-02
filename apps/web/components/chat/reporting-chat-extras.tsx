'use client';

import type { ReactElement } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@safevoices/ui/components/button';
import { CrisisEscalationPanel } from '@safevoices/ui/components/crisis-escalation-panel';
import { ReportingProgress } from '@safevoices/ui/components/reporting-progress';
import { REPORTING_EXTRACTION_FIELDS } from '@safevoices/ai/chat';
import { getCrisisResources, type ReportingLocale } from '@safevoices/ai/reporting';
import { Link } from '../../i18n/navigation';

export type ReportingChatExtrasProps = {
    caseId: string;
    submitted: boolean;
    sessionOk: boolean;
    extractionFields: Record<string, unknown>;
    showCrisis: boolean;
    onSubmitReport: () => void;
    submitBusy: boolean;
    submitDone: boolean;
};

export function ReportingChatExtras({
    caseId,
    submitted,
    sessionOk,
    extractionFields,
    showCrisis,
    onSubmitReport,
    submitBusy,
    submitDone,
}: ReportingChatExtrasProps): ReactElement {
    const t = useTranslations('chat');
    const tCommon = useTranslations('common');
    const tCrisis = useTranslations('crisis');
    const tProgress = useTranslations('progress');
    const locale = useLocale() as ReportingLocale;

    const progressFieldLabels = {
        incidentDescription: tProgress('incidentDescription'),
        location: tProgress('location'),
        occurredAt: tProgress('occurredAt'),
        attachments: tProgress('attachments'),
        riskLevel: tProgress('riskLevel'),
    };

    if (!caseId) {
        return (
            <div className="mt-4 rounded-2xl border border-amber-400/50 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {t('needsSession')}{' '}
                <Button
                    variant="link"
                    className="ms-1 h-auto p-0 text-amber-900 underline"
                    render={<Link href="/access" />}
                >
                    {t('startSecure')}
                </Button>
            </div>
        );
    }

    if (!sessionOk) {
        return (
            <div className="mt-4 rounded-2xl border border-amber-400/50 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {t('sessionExpired')}{' '}
                <Button
                    variant="link"
                    className="ms-1 h-auto p-0 text-amber-900 underline"
                    render={<Link href="/access" />}
                >
                    {t('verifyCredentials')}
                </Button>
            </div>
        );
    }

    return (
        <div className="mt-4 space-y-3">
            {showCrisis ? (
                <CrisisEscalationPanel
                    resources={getCrisisResources(locale)}
                    labels={{
                        title: tCrisis('title'),
                        intro: tCrisis('intro'),
                        learnMore: tCommon('learnMore'),
                    }}
                />
            ) : null}
            <ReportingProgress
                fields={extractionFields}
                fieldKeys={REPORTING_EXTRACTION_FIELDS}
                title={tProgress('title')}
                fieldLabels={progressFieldLabels}
                notedLabel={tProgress('noted')}
            />
            {submitDone ? (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
                    <p className="font-medium">{t('reportSubmitted')}</p>
                    <p className="mt-1 text-muted-foreground">
                        {t('submitReminder', { caseId })}
                    </p>
                </div>
            ) : submitted ? null : (
                <Button
                    type="button"
                    className="w-full"
                    disabled={submitBusy}
                    onClick={onSubmitReport}
                >
                    {submitBusy ? t('submitting') : t('submitReport')}
                </Button>
            )}
        </div>
    );
}
