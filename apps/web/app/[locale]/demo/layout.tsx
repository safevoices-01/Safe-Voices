import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

const description =
    'Try the Safe Voices AI assistant: learn how anonymous reporting works, what to include in a report, and how tracking codes are used. Demo only — not a secure intake session.';

export const metadata: Metadata = {
    title: 'Demo AI assistant',
    description,
    openGraph: {
        title: 'Demo AI assistant | Safe Voices',
        description,
        url: '/demo',
    },
    twitter: {
        title: 'Demo AI assistant | Safe Voices',
        description,
    },
};

export default function DemoLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background">
            <Suspense fallback={null}>{children}</Suspense>
        </div>
    );
}
