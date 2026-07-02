import type { MetadataRoute } from 'next';
import { getSiteUrl } from '../lib/site';

const LOCALES = ['en', 'ar'] as const;

const PATHS = ['', '/access', '/chat', '/documentation'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
    const base = getSiteUrl();
    const now = new Date();

    return LOCALES.flatMap((locale) =>
        PATHS.map((path) => ({
            url: `${base}/${locale}${path}`,
            lastModified: now,
            changeFrequency: path === '' ? 'weekly' : 'monthly',
            priority: path === '' ? 1 : 0.8,
            alternates: {
                languages: Object.fromEntries(
                    LOCALES.map((l) => [l, `${base}/${l}${path}`]),
                ),
            },
        })),
    );
}
