'use client';

import { brandLogoSrc } from '../../lib/branding';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';
import { Link } from '../../i18n/navigation';

type AuthLayoutProps = {
    children: ReactNode;
    /** Visually hidden page title for the step (announced to assistive tech). */
    title: string;
};

export function AuthLayout({
    children,
    title,
}: AuthLayoutProps): ReactElement {
    const t = useTranslations('common');

    return (
        <div className="flex min-h-dvh flex-col bg-muted">
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-6 sm:py-10">
                <h1 className="sr-only">{title}</h1>
                <div className="flex w-full min-w-0 max-w-md flex-col items-center gap-6 sm:gap-8">
                    <Link
                        href="/"
                        className="flex shrink-0 items-center justify-center rounded-[length:var(--radius-lg)] py-1 outline-offset-4 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                        aria-label={t('homeAria')}
                    >
                        <Image
                            src={brandLogoSrc}
                            alt={t('brandName')}
                            width={200}
                            height={48}
                            className="h-9 w-auto max-h-9 max-w-[min(100%,11rem)] object-contain object-center sm:max-w-[13rem]"
                            priority
                        />
                    </Link>
                    <div className="w-full min-w-0">{children}</div>
                </div>
            </div>
        </div>
    );
}
