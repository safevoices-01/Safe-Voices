import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

const description =
    'Ask how reporting works, what to include in a report, or how tracking codes are typically used. General guidance, not legal advice.';

export const metadata: Metadata = {
    title: 'AI assistant',
    description,
    openGraph: {
        title: 'AI assistant | Safe Voices',
        description,
        url: '/chat',
    },
    twitter: {
        title: 'AI assistant | Safe Voices',
        description,
    },
};

/**
 * Chat uses its own shell (no marketing header/footer). Root layout only
 * wraps the document.
 */
export default function ChatLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background">
            <Suspense fallback={null}>{children}</Suspense>
        </div>
    );
}
