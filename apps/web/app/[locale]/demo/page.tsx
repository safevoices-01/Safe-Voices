'use client';

import type { ReactElement } from 'react';
import { ChatExperience } from '../../../components/chat/chat-experience';

export default function DemoChatPage(): ReactElement {
    return <ChatExperience mode="demo" />;
}
