import type { ReactElement } from 'react';
import { CaseQueue } from '../../../components/dashboard/case-queue';

export default function DashboardPage(): ReactElement {
    return (
        <div className="mx-auto max-w-6xl px-6 py-12">
            <CaseQueue />
        </div>
    );
}
