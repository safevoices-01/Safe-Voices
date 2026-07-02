import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const description =
    'Enterprise-style whistleblowing and ethics intake: how reporters, investigators, and administrators work together while keeping data scoped and auditable.';

export const metadata: Metadata = {
    title: 'Documentation',
    description,
    openGraph: {
        title: 'Documentation | Safe Voices',
        description,
        url: '/documentation',
    },
    twitter: {
        title: 'Documentation | Safe Voices',
        description,
    },
};

export default function DocumentationLayout({
    children,
}: {
    children: ReactNode;
}) {
    return children;
}
