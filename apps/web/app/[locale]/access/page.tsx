import type { ReactElement } from 'react';
import { Suspense } from 'react';
import { CaseAccessFlow } from '../../../components/auth/case-access-flow';

export default function AccessPage(): ReactElement {
    return (
        <Suspense fallback={null}>
            <CaseAccessFlow />
        </Suspense>
    );
}
