import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const description =
    'Collections dashboard mock based on the Figma design node.';

export const metadata: Metadata = {
    title: 'Dashboard',
    description,
    openGraph: {
        title: 'Dashboard | Safe Voices',
        description,
        url: '/dashboard',
    },
    twitter: {
        title: 'Dashboard | Safe Voices',
        description,
    },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-dvh bg-[#f5f5f7] text-[#111111]">{children}</div>
    );
}
