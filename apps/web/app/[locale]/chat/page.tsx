'use client';

import type { ReactElement } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatExperience } from '../../../components/chat/chat-experience';

export default function ReportingChatPage(): ReactElement {
    const searchParams = useSearchParams();
    const caseId = searchParams.get('caseId')?.trim() ?? '';

    return <ChatExperience mode="reporting" caseId={caseId} />;
}
