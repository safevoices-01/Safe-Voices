import type { ReactElement } from 'react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Button } from '@safevoices/ui/components/button';
import { LanguageSwitcher } from './language-switcher';
import { Link } from '../i18n/navigation';
import { brandLogoSrc } from '../lib/branding';

export async function SiteHeader(): Promise<ReactElement> {
    const t = await getTranslations('common');

    return (
        <header className="sticky top-0 z-50  bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                <Link
                    href="/"
                    className="flex min-w-0 items-center rounded-[length:var(--radius-lg)] py-1 pe-2 outline-offset-4 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                    aria-label={t('homeAria')}
                >
                    <Image
                        src={brandLogoSrc}
                        alt={t('brandName')}
                        width={200}
                        height={48}
                        className="h-9 w-auto max-h-9 max-w-[min(100%,11rem)] object-contain object-left sm:max-w-[13rem]"
                        priority
                    />
                </Link>
                <nav
                    className="flex flex-1 flex-wrap items-center justify-end gap-2"
                    aria-label="Primary"
                >
                    <LanguageSwitcher />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        render={<Link href="/documentation" />}
                    >
                        {t('documentation')}
                    </Button>
                    <Button size="sm" render={<Link href="/chat" />}>
                        {t('openChat')}
                    </Button>
                </nav>
            </div>
        </header>
    );
}
