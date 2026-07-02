import type { Metadata } from 'next';
import { Noto_Sans_Arabic } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

const notoSansArabic = Noto_Sans_Arabic({
    subsets: ['arabic'],
    variable: '--font-arabic',
    display: 'swap',
});
import { WebProviders } from '../../components/web-providers';
import { routing, type AppLocale } from '../../i18n/routing';
import { brandIconSrc } from '../../lib/branding';
import { getSiteUrl } from '../../lib/site';
import '../globals.css';

type Props = {
    children: ReactNode;
    params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'metadata' });
    const ogLocale = locale === 'ar' ? 'ar_SA' : 'en_US';

    return {
        metadataBase: new URL(getSiteUrl()),
        icons: {
            icon: [{ url: brandIconSrc, type: 'image/png' }],
            shortcut: brandIconSrc,
            apple: [{ url: brandIconSrc, type: 'image/png' }],
        },
        appleWebApp: {
            capable: true,
            title: 'Safe Voices',
            statusBarStyle: 'default',
        },
        title: {
            default: t('siteTitle'),
            template: `%s | Safe Voices`,
        },
        description: t('siteDescription'),
        openGraph: {
            type: 'website',
            locale: ogLocale,
            siteName: 'Safe Voices',
            title: t('siteTitle'),
            description: t('siteDescription'),
            url: `/${locale}`,
            images: [
                {
                    url: '/og.png',
                    width: 1200,
                    height: 630,
                    alt: t('siteTitle'),
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: t('siteTitle'),
            description: t('siteDescription'),
            images: ['/og.png'],
        },
        alternates: {
            languages: {
                en: '/en',
                ar: '/ar',
            },
        },
    };
}

export default async function LocaleLayout({ children, params }: Props) {
    const { locale } = await params;
    if (!routing.locales.includes(locale as AppLocale)) {
        notFound();
    }

    setRequestLocale(locale);
    const messages = await getMessages();
    const dir = locale === 'ar' ? 'rtl' : 'ltr';

    return (
        <html lang={locale} dir={dir} suppressHydrationWarning>
            <body
                className={`min-h-screen antialiased ${locale === 'ar' ? `font-arabic ${notoSansArabic.variable}` : ''}`}
            >
                <NextIntlClientProvider messages={messages}>
                    <WebProviders>{children}</WebProviders>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
