import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Sign in',
    description:
        'Sign in or create a Safe Voices account with a one-time email code.',
};

export default function AuthLayout({
    children,
}: {
    children: ReactNode;
}): ReactNode {
    return children;
}
