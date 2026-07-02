'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '../i18n/navigation';
import { routing, type AppLocale } from '../i18n/routing';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@safevoices/ui/components/select';

export function LanguageSwitcher() {
    const locale = useLocale() as AppLocale;
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations('common');

    return (
        <Select
            value={locale}
            onValueChange={(next) => {
                if (!next) return;
                router.replace(pathname, { locale: next as AppLocale });
            }}
        >
            <SelectTrigger
                className="h-8 w-[7.5rem] border-border/60 text-xs"
                aria-label={t('language')}
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {routing.locales.map((code) => (
                    <SelectItem key={code} value={code}>
                        {code === 'en' ? t('english') : t('arabic')}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
