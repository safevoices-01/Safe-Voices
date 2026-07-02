import type { ReactElement } from 'react';
import { CaseDetailView } from '../../../../../components/dashboard/case-detail-view';

type PageProps = {
    params: Promise<{ caseId: string }>;
};

export default async function CaseDetailPage({
    params,
}: PageProps): Promise<ReactElement> {
    const { caseId } = await params;
    return (
        <div className="mx-auto max-w-4xl px-6 py-12">
            <CaseDetailView caseId={caseId} />
        </div>
    );
}
