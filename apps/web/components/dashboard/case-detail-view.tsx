'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ALLOWED_STATUS_TRANSITIONS } from '@safevoices/prisma/case-lifecycle';
import type { CaseStatusValue } from '@safevoices/prisma/case-store-types';
import { Button } from '@safevoices/ui/components/button';
import { Link } from '../../i18n/navigation';
import {
    extractionLabelKey,
    formatExtractionValue,
    getExtractionEntries,
} from '../../lib/format-extraction';
import { translateApiError } from '../../lib/translate-api-error';
import { toastApiError, toastApiSuccess } from '../../lib/api-toast';

type CaseDetail = {
    caseId: string;
    caseStatus: CaseStatusValue;
    submittedAt: string | null;
    messages: Array<{ id: string; role: string; content: string }>;
    extraction: { fields: Record<string, unknown> } | null;
    attachments: Array<{ id: string; name: string; mimeType: string; url: string }>;
};

export function CaseDetailView({ caseId }: { caseId: string }): ReactElement {
    const t = useTranslations('dashboard');
    const tErrors = useTranslations('errors');
    const tProgress = useTranslations('progress');
    const [detail, setDetail] = useState<CaseDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const loadDetail = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `/api/partner/cases/${encodeURIComponent(caseId)}`,
                { credentials: 'include' },
            );
            if (!res.ok) {
                const json = await res.json();
                toastApiError(t('loadFailed'), translateApiError(tErrors, json));
                return;
            }
            const json = (await res.json()) as { case: CaseDetail };
            setDetail(json.case);
        } catch {
            toastApiError(t('loadFailed'), t('networkError'));
        } finally {
            setLoading(false);
        }
    }, [caseId, t, tErrors]);

    useEffect(() => {
        void loadDetail();
    }, [loadDetail]);

    const transitionTo = async (status: CaseStatusValue): Promise<void> => {
        if (busy) return;
        setBusy(true);
        try {
            const res = await fetch(
                `/api/partner/cases/${encodeURIComponent(caseId)}/status`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ status }),
                },
            );
            if (!res.ok) {
                const json = await res.json();
                toastApiError(
                    t('statusUpdateFailed'),
                    translateApiError(tErrors, json),
                );
                return;
            }
            toastApiSuccess(t('statusUpdated'), status);
            await loadDetail();
        } catch {
            toastApiError(t('statusUpdateFailed'), t('networkError'));
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
    }
    if (!detail) {
        return (
            <p className="text-sm text-muted-foreground">
                {t('caseNotFound')}
            </p>
        );
    }

    const nextStatuses = ALLOWED_STATUS_TRANSITIONS[detail.caseStatus] ?? [];
    const extractionEntries = detail.extraction?.fields
        ? getExtractionEntries(detail.extraction.fields)
        : [];

    const progressFieldLabels = {
        incidentDescription: tProgress('incidentDescription'),
        location: tProgress('location'),
        occurredAt: tProgress('occurredAt'),
        attachments: tProgress('attachments'),
        riskLevel: tProgress('riskLevel'),
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <Button variant="outline" size="sm" render={<Link href="/dashboard" />}>
                        {t('backToQueue')}
                    </Button>
                    <h1 className="mt-3 font-mono text-xl font-semibold">
                        {detail.caseId}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('status')}: {detail.caseStatus}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {nextStatuses.map((status) => (
                        <Button
                            key={status}
                            type="button"
                            disabled={busy}
                            onClick={() => void transitionTo(status)}
                        >
                            {t('moveTo', { status })}
                        </Button>
                    ))}
                </div>
            </div>

            {extractionEntries.length > 0 ? (
                <section className="rounded-xl border border-border bg-white p-4">
                    <h2 className="font-medium">{t('extraction')}</h2>
                    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                        {extractionEntries.map(({ key, value }) => {
                            const labelKey = extractionLabelKey(key);
                            const label = labelKey
                                ? progressFieldLabels[labelKey]
                                : key;
                            return (
                                <div key={key}>
                                    <dt className="text-muted-foreground">
                                        {label}
                                    </dt>
                                    <dd className="mt-0.5 whitespace-pre-wrap">
                                        {formatExtractionValue(value)}
                                    </dd>
                                </div>
                            );
                        })}
                    </dl>
                </section>
            ) : null}

            <section className="rounded-xl border border-border bg-white p-4">
                <h2 className="font-medium">{t('transcript')}</h2>
                <div className="mt-4 space-y-4">
                    {detail.messages.map((m) => (
                        <div
                            key={m.id}
                            className={
                                m.role === 'user'
                                    ? 'rounded-lg bg-muted/50 px-3 py-2'
                                    : 'px-3 py-2'
                            }
                        >
                            <p className="text-xs font-medium uppercase text-muted-foreground">
                                {m.role}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm">{m.content}</p>
                        </div>
                    ))}
                </div>
            </section>

            {detail.attachments.length > 0 ? (
                <section className="rounded-xl border border-border bg-white p-4">
                    <h2 className="font-medium">{t('attachments')}</h2>
                    <ul className="mt-3 space-y-2 text-sm">
                        {detail.attachments.map((a) => (
                            <li key={a.id}>
                                <a
                                    href={`/api/partner/cases/${encodeURIComponent(caseId)}/attachments/${encodeURIComponent(a.id)}/url`}
                                    className="text-[#067a6f] underline"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {a.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
        </div>
    );
}
