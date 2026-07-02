import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
    reactStrictMode: true,
    typescript: {
        tsconfigPath: 'tsconfig.next.json',
    },
    transpilePackages: ['@safevoices/ui'],
    eslint: {
        ignoreDuringBuilds: true,
    },
    serverExternalPackages: [
        '@node-rs/argon2',
        '@prisma/client',
        'prisma',
        '@safevoices/prisma',
    ],
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals = [
                ...(Array.isArray(config.externals)
                    ? config.externals
                    : config.externals
                      ? [config.externals]
                      : []),
                '@node-rs/argon2',
                /^@node-rs\/argon2-/,
            ];
        }
        return config;
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' data: blob: https:",
                            "font-src 'self' data: https://fonts.gstatic.com",
                            "connect-src 'self' https: wss:",
                            "frame-ancestors 'none'",
                            "base-uri 'self'",
                            "form-action 'self'",
                        ].join('; '),
                    },
                ],
            },
        ];
    },
};

export default withNextIntl(nextConfig);
