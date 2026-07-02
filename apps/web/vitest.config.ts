import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    esbuild: {
        jsx: 'automatic',
    },
    test: {
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
        include: ['**/*.test.{ts,tsx}'],
        exclude: ['e2e/**', 'node_modules/**'],
        passWithNoTests: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '../../packages/ui/src'),
            'next/navigation': path.resolve(
                __dirname,
                'test/mocks/next-navigation.ts',
            ),
            [path.resolve(__dirname, 'i18n/navigation')]: path.resolve(
                __dirname,
                'test/mocks/i18n-navigation.tsx',
            ),
        },
    },
});
