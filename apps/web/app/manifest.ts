import type { MetadataRoute } from 'next';
import { brandIconSrc } from '../lib/branding';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Safe Voices',
        short_name: 'Safe Voices',
        description:
            'Secure anonymous reporting for organizations that need confidential ethics and compliance intake.',
        start_url: '/',
        display: 'standalone',
        background_color: '#fdf8f3',
        theme_color: '#ea580c',
        icons: [
            {
                src: brandIconSrc,
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: brandIconSrc,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
        ],
    };
}
