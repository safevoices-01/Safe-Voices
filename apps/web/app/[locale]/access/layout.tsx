import type { ReactElement, ReactNode } from 'react';

export default function AccessLayout({
    children,
}: {
    children: ReactNode;
}): ReactElement {
    return <>{children}</>;
}
