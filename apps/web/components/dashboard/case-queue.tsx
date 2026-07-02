'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@safevoices/ui/components/button';
import { Link } from '../../i18n/navigation';
import { translateApiError } from '../../lib/translate-api-error';
import { toastApiError } from '../../lib/api-toast';

type CaseRow = {
    caseId: string;
    caseStatus: string;
    submittedAt: string | null;
    riskLevel: string | null;
    incidentCategory: string | null;
    createdAt: string;
};

export function CaseQueue(): ReactElement {
    const t = useTranslations('dashboard');
    const tErrors = useTranslations('errors');
    const [cases, setCases] = useState<CaseRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');

    const loadCases = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.set('status', statusFilter);
            if (search.trim()) params.set('search', search.trim());
            const qs = params.toString();
            const res = await fetch(`/api/partner/cases${qs ? `?${qs}` : ''}`, {
                credentials: 'include',
            });
            if (!res.ok) {
                const json = await res.json();
                toastApiError(
                    t('loadFailed'),
                    translateApiError(tErrors, json),
                );
                return;
            }
            const json = (await res.json()) as { cases: CaseRow[] };
            setCases(json.cases);
        } catch {
            toastApiError(t('loadFailed'), t('networkError'));
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, t, tErrors]);

    useEffect(() => {
        void loadCases();
    }, [loadCases]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">{t('title')}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('subtitle')}
                    </p>
                </div>
                <Button
                    variant="outline"
                    type="button"
                    onClick={() => void loadCases()}
                >
                    {t('refresh')}
                </Button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">{t('filterStatus')}</span>
                    <select
                        className="rounded-lg border border-border bg-white px-3 py-2"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">{t('allStatuses')}</option>
                        <option value="SUBMITTED">SUBMITTED</option>
                        <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                    </select>
                </label>
                <label className="flex flex-1 flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">{t('search')}</span>
                    <input
                        className="rounded-lg border border-border bg-white px-3 py-2 font-mono text-sm"
                        placeholder="SV-XXXXX-XXXX"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </label>
                <Button type="button" className="sm:self-end" onClick={() => void loadCases()}>
                    {t('applyFilters')}
                </Button>
            </div>

            {loading ? (
                <p className="text-sm text-muted-foreground">{t('loading')}</p>
            ) : cases.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    {t('empty')}
                </p>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-white">
                    <table className="min-w-full text-sm">
                        <thead className="border-b border-border bg-muted/40 text-start">
                            <tr>
                                <th className="px-4 py-3 font-medium">{t('caseId')}</th>
                                <th className="px-4 py-3 font-medium">{t('status')}</th>
                                <th className="px-4 py-3 font-medium">{t('submitted')}</th>
                                <th className="px-4 py-3 font-medium">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cases.map((row) => (
                                <tr key={row.caseId} className="border-b border-border last:border-0">
                                    <td className="px-4 py-3 font-mono text-xs">
                                        {row.caseId}
                                    </td>
                                    <td className="px-4 py-3">{row.caseStatus}</td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {row.submittedAt
                                            ? new Date(row.submittedAt).toLocaleString()
                                            : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            render={
                                                <Link
                                                    href={`/dashboard/cases/${encodeURIComponent(row.caseId)}`}
                                                />
                                            }
                                        >
                                            {t('view')}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
