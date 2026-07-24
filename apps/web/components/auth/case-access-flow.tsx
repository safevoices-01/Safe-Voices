'use client';

import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@safevoices/ui/components/button';
import { Input } from '@safevoices/ui/components/input';
import { LockoutNotice } from '@safevoices/ui/components/lockout-notice';
import { SafetyNotice } from '@safevoices/ui/components/safety-notice';
import { ShowOnceSecretCard } from '@safevoices/ui/components/show-once-secret-card';
import { Link, useRouter } from '../../i18n/navigation';
import { translateApiError } from '../../lib/translate-api-error';
import { isSafeReturnPath } from '../../lib/safe-return-path';
import { AuthLayout } from './auth-layout';

type CreateCaseResponse = {
    caseId: string;
    secret: string;
};

export function CaseAccessFlow(): ReactElement {
    const t = useTranslations('access');
    const tCommon = useTranslations('common');
    const tErrors = useTranslations('errors');
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnPath = searchParams.get('return')?.trim() ?? '';
    const [mode, setMode] = useState<'menu' | 'existing' | 'show-secret'>('menu');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLockout, setIsLockout] = useState(false);
    const [caseId, setCaseId] = useState('');
    const [secret, setSecret] = useState('');
    const [createdCase, setCreatedCase] = useState<CreateCaseResponse | null>(null);
    const [acknowledged, setAcknowledged] = useState(false);

    const secretLabels = {
        intro: t('secretIntro'),
        caseIdLabel: t('caseIdLabel'),
        secretLabel: t('secretLabel'),
        copyLabel: t('copyCredentials'),
        copiedLabel: t('copied'),
        ackLabel: t('ackSecret'),
        verifyingLabel: t('verifying'),
    };

    useEffect(() => {
        if (mode !== 'show-secret' || acknowledged) return;
        const handler = (event: BeforeUnloadEvent): void => {
            event.preventDefault();
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [mode, acknowledged]);

    const navigateToChat = async (
        targetCaseId: string,
        targetSecret: string,
    ): Promise<void> => {
        setBusy(true);
        setError(null);
        setIsLockout(false);
        try {
            const res = await fetch('/api/cases/verify', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ caseId: targetCaseId, secret: targetSecret }),
            });
            const json = (await res.json()) as { code?: string; error?: string; caseId?: string };
            if (!res.ok || !json.caseId) {
                setIsLockout(res.status === 429);
                setError(translateApiError(tErrors, json, t('verifyFailed')));
                return;
            }
            if (isSafeReturnPath(returnPath)) {
                router.push(returnPath);
            } else {
                router.push(`/chat?caseId=${encodeURIComponent(json.caseId)}`);
            }
        } catch {
            setError(t('verifyFailed'));
        } finally {
            setBusy(false);
        }
    };

    const createAnonymousCase = async (): Promise<void> => {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch('/api/cases', { method: 'POST' });
            const json = (await res.json()) as
                | CreateCaseResponse
                | { code?: string; error?: string };
            if (!res.ok || !('caseId' in json)) {
                setError(translateApiError(tErrors, json, t('createFailed')));
                return;
            }
            setCreatedCase(json);
            setCaseId(json.caseId);
            setSecret(json.secret);
            setAcknowledged(false);
            setMode('show-secret');
        } catch {
            setError(t('createFailed'));
        } finally {
            setBusy(false);
        }
    };

    const verifyExistingCase = async (): Promise<void> => {
        await navigateToChat(caseId.trim().toUpperCase(), secret.trim());
    };

    if (mode === 'show-secret' && createdCase) {
        return (
            <AuthLayout title={t('saveCredentialsTitle')}>
                <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
                    <p className="text-lg font-semibold">{t('saveCredentialsNow')}</p>
                    <ShowOnceSecretCard
                        caseId={createdCase.caseId}
                        secret={createdCase.secret}
                        acknowledged={acknowledged}
                        onAcknowledgedChange={setAcknowledged}
                        busy={busy}
                        labels={secretLabels}
                        continueLabel={t('continueToChat')}
                        onContinue={() =>
                            void navigateToChat(createdCase.caseId, createdCase.secret)
                        }
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        render={<Link href="/" />}
                    >
                        {tCommon('returnHome')}
                    </Button>
                </div>
            </AuthLayout>
        );
    }

    if (mode === 'existing') {
        return (
            <AuthLayout title={t('existingTitle')}>
                <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
                    <p className="text-lg font-semibold">{t('existingTitle')}</p>
                    <p className="text-sm text-muted-foreground">{t('existingIntro')}</p>
                    <Input
                        value={caseId}
                        onChange={(event) => setCaseId(event.target.value)}
                        placeholder={t('caseIdPlaceholder')}
                        autoCapitalize="characters"
                        className="ltr-embed"
                        dir="ltr"
                    />
                    <Input
                        value={secret}
                        onChange={(event) => setSecret(event.target.value)}
                        placeholder={t('secretPlaceholder')}
                        type="password"
                        autoComplete="off"
                        className="ltr-embed"
                        dir="ltr"
                    />
                    {isLockout ? (
                        <LockoutNotice>{error ?? tErrors('VERIFY_LOCKED')}</LockoutNotice>
                    ) : error ? (
                        <p className="text-sm text-destructive">{error}</p>
                    ) : null}
                    <Button
                        type="button"
                        className="w-full"
                        disabled={busy || !caseId.trim() || !secret.trim()}
                        onClick={() => void verifyExistingCase()}
                    >
                        {busy ? t('verifying') : t('verifyContinue')}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={() => {
                            setError(null);
                            setIsLockout(false);
                            setMode('menu');
                        }}
                    >
                        {tCommon('back')}
                    </Button>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title={t('startTitle')}>
            <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
                <p className="text-lg font-semibold">{t('stayAnonymous')}</p>
                <SafetyNotice>{t('safetyNotice')}</SafetyNotice>
                <Button
                    type="button"
                    className="w-full"
                    disabled={busy}
                    onClick={() => void createAnonymousCase()}
                >
                    {busy ? t('creating') : t('continueAnonymously')}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setMode('existing')}
                >
                    {t('accessExisting')}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                    {t('partnerSignIn')}{' '}
                    <Link href="/auth/email" className="underline">
                        {t('signInEmail')}
                    </Link>
                </p>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
        </AuthLayout>
    );
}
