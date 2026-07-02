'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@safevoices/ui/components/toast';

export function WebProviders({ children }: { children: ReactNode }): ReactNode {
    return <ToastProvider position="bottom-right">{children}</ToastProvider>;
}
