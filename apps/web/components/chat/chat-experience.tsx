'use client';

import { useChat } from '@ai-sdk/react';
import {
    DefaultChatTransport,
    isFileUIPart,
    isTextUIPart,
    type UIMessage,
} from 'ai';
import type { ReactElement } from 'react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { detectCrisisLanguage, type ReportingLocale } from '@safevoices/ai/reporting';
import { LanguageSwitcher } from '../language-switcher';
import { Link } from '../../i18n/navigation';
import { translateApiError } from '../../lib/translate-api-error';
import { resolveChatErrorCopyKey } from '../../lib/format-chat-error';
import { decodeExtractionHeader } from '../../lib/decode-extraction-header';
import { uploadEvidence, type UploadEvidenceResult } from '../../lib/evidence-upload';
import {
    buildUserMessageParts,
    historyMessageToUiMessage,
    uploadsToAttachmentRefs,
    type MessageAttachmentRef,
} from '../../lib/message-attachments';
import { ReportingChatExtras } from './reporting-chat-extras';
import { AssistantAvatar } from './assistant-avatar';
import { toastApiError, toastApiSuccess } from '../../lib/api-toast';
import { Avatar, AvatarFallback } from '@safevoices/ui/components/avatar';
import { Button } from '@safevoices/ui/components/button';
import {
    ChatContainerContent,
    ChatContainerRoot,
    ChatContainerScrollAnchor,
} from '@safevoices/ui/components/chat-container';
import { Loader } from '@safevoices/ui/components/loader';
import { Message, MessageContent } from '@safevoices/ui/components/message';
import {
    PromptInput,
    PromptInputAction,
    PromptInputActions,
    PromptInputTextarea,
} from '@safevoices/ui/components/prompt-input';
import {
    AlertCircle,
    ArrowUp,
    FileText,
    Home,
    ImagePlus,
    Plus,
    Shield,
    Square,
    User,
    X,
} from 'lucide-react';

export type ChatExperienceMode = 'demo' | 'reporting';

export type ChatExperienceProps = {
    mode: ChatExperienceMode;
    caseId?: string;
};

function partsToPlainText(parts: UIMessage['parts']): string {
    return parts
        .filter(isTextUIPart)
        .map((p) => p.text)
        .join('');
}

function UserMessageBody({
    parts,
}: {
    parts: UIMessage['parts'];
}): ReactElement {
    const text = partsToPlainText(parts);
    const files = parts.filter(isFileUIPart);

    return (
        <div className="space-y-2">
            {files.map((f, i) =>
                f.mediaType.startsWith('image/') ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- user attachment data URLs */
                    <img
                        key={`${f.url}-${i}`}
                        src={f.url}
                        alt={f.filename ?? 'Uploaded image'}
                        className="max-h-48 max-w-full rounded-2xl border border-black/10 object-contain"
                    />
                ) : (
                    <p key={`${f.url}-${i}`} className="text-sm text-black/70">
                        Attachment: {f.filename ?? f.mediaType}
                    </p>
                ),
            )}
            {text ? <p className="whitespace-pre-wrap">{text}</p> : null}
        </div>
    );
}

const WELCOME_MESSAGE_ID = 'seed-sv-welcome';

export function ChatExperience({
    mode,
    caseId = '',
}: ChatExperienceProps): ReactElement {
    const t = useTranslations('chat');
    const tDemo = useTranslations('demo');
    const tErrors = useTranslations('errors');
    const locale = useLocale() as ReportingLocale;
    const isDemo = mode === 'demo';
    const reportingMode = mode === 'reporting';

    const copy = isDemo ? tDemo : t;

    const suggestionPrompts = useMemo(
        () => [
            copy('suggestion1'),
            copy('suggestion2'),
            copy('suggestion3'),
            copy('suggestion4'),
        ],
        [copy],
    );

    const chatSeedMessages = useMemo<UIMessage[]>(
        () => [
            {
                id: WELCOME_MESSAGE_ID,
                role: 'assistant',
                parts: [{ type: 'text', text: copy('welcome') }],
            },
        ],
        [copy],
    );
    const [sessionOk, setSessionOk] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitBusy, setSubmitBusy] = useState(false);
    const [submitDone, setSubmitDone] = useState(false);
    const [extractionFields, setExtractionFields] = useState<Record<string, unknown>>(
        {},
    );
    const [showCrisis, setShowCrisis] = useState(false);
    const inputDisabled =
        reportingMode && (!sessionOk || submitted || submitDone);
    const [input, setInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const composerRef = useRef<HTMLTextAreaElement>(null);
    const pendingMessageAttachmentsRef = useRef<MessageAttachmentRef[]>([]);

    const applyExtractionHeader = useCallback((header: string | null): void => {
        if (!header) return;
        const extraction = decodeExtractionHeader(header);
        if (extraction?.fields) {
            setExtractionFields(extraction.fields);
        }
    }, []);

    const chatTransport = useMemo(
        () =>
            new DefaultChatTransport({
                api: reportingMode
                    ? `/api/cases/${encodeURIComponent(caseId)}/chat`
                    : '/api/chat',
                prepareSendMessagesRequest: ({ messages: msgs, body }) => {
                    const requestBody: Record<string, unknown> = {
                        ...body,
                        messages: msgs,
                        clientRequestId: crypto.randomUUID(),
                        locale,
                    };
                    if (
                        reportingMode &&
                        pendingMessageAttachmentsRef.current.length > 0
                    ) {
                        requestBody.messageAttachments =
                            pendingMessageAttachmentsRef.current;
                    }
                    pendingMessageAttachmentsRef.current = [];
                    return { body: requestBody };
                },
                fetch: async (input, init) => {
                    const res = await globalThis.fetch(input, init);
                    applyExtractionHeader(res.headers.get('x-sv-extraction'));
                    return res;
                },
            }),
        [reportingMode, caseId, locale, applyExtractionHeader],
    );

    const { messages, sendMessage, setMessages, status, stop, error, clearError } =
        useChat({
            messages: chatSeedMessages,
            transport: chatTransport,
        });

    useEffect(() => {
        if (!reportingMode || !caseId) return;
        void (async () => {
            const sessionRes = await fetch('/api/cases/session');
            if (sessionRes.ok) {
                const sessionJson = (await sessionRes.json()) as {
                    submitted?: boolean;
                };
                setSessionOk(true);
                setSubmitted(Boolean(sessionJson.submitted));
                setSubmitDone(Boolean(sessionJson.submitted));
            } else {
                setSessionOk(false);
            }
            const historyRes = await fetch(
                `/api/cases/${encodeURIComponent(caseId)}/messages`,
            );
            if (historyRes.ok) {
                const historyJson = (await historyRes.json()) as {
                    messages: Array<{
                        id: string;
                        role: string;
                        content: string;
                        attachments?: unknown;
                    }>;
                    extraction?: { fields: Record<string, unknown> };
                };
                if (historyJson.extraction?.fields) {
                    setExtractionFields(historyJson.extraction.fields);
                }
                if (historyJson.messages.length > 0) {
                    const restored: UIMessage[] = [
                        ...chatSeedMessages,
                        ...historyJson.messages.map((m) =>
                            historyMessageToUiMessage(m),
                        ),
                    ];
                    setMessages(restored);
                }
            }
        })();
    }, [reportingMode, caseId, chatSeedMessages, setMessages]);

    useEffect(() => {
        if (!reportingMode) return;
        const lastUser = [...messages].reverse().find((m) => m.role === 'user');
        if (!lastUser) return;
        const text = partsToPlainText(lastUser.parts);
        setShowCrisis(detectCrisisLanguage(text, locale).triggered);
    }, [messages, locale, reportingMode]);

    const busy = status === 'submitted' || status === 'streaming';
    const lastMessage = messages.at(-1);
    const showThinkingLoader =
        status === 'submitted' ||
        (status === 'streaming' &&
            lastMessage?.role === 'assistant' &&
            partsToPlainText(lastMessage.parts).trim() === '');

    const isWelcomeState =
        messages.length === 1 && messages[0]?.id === WELCOME_MESSAGE_ID;

    const handleSubmit = (): void => {
        const text = input.trim();
        if (!text || busy || inputDisabled) return;
        void sendMessage({ text });
        setInput('');
    };

    const sendSuggestion = (text: string): void => {
        if (busy || inputDisabled) return;
        void sendMessage({ text });
    };

    const handleSubmitReport = async (): Promise<void> => {
        if (!caseId || submitBusy) return;
        setSubmitBusy(true);
        try {
            const res = await fetch(
                `/api/cases/${encodeURIComponent(caseId)}/submit`,
                { method: 'POST' },
            );
            if (!res.ok) {
                const json = (await res.json()) as { code?: string; error?: string };
                toastApiError(
                    t('submitFailed'),
                    translateApiError(tErrors, json),
                );
                return;
            }
            setSubmitted(true);
            setSubmitDone(true);
            toastApiSuccess(t('submitSuccessTitle'), t('submitSuccessDesc', { caseId }));
        } catch {
            toastApiError(t('submitFailed'), t('networkError'));
        } finally {
            setSubmitBusy(false);
        }
    };

    const onImageFilesChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ): void => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (!files.length || busy || inputDisabled) return;

        const text = input.trim();

        void (async () => {
            if (reportingMode && sessionOk && caseId) {
                const uploads: UploadEvidenceResult[] = [];
                const uploadedFiles: File[] = [];
                let useInlineFallback = false;

                for (const file of files) {
                    try {
                        const result = await uploadEvidence(caseId, file);
                        uploads.push(result);
                        uploadedFiles.push(file);
                        setExtractionFields((prev) => ({
                            ...prev,
                            attachments: prev.attachments
                                ? `${String(prev.attachments)}; ${file.name}`
                                : file.name,
                        }));
                    } catch (err) {
                        const code = (err as { code?: string })?.code;
                        if (code === 'UPLOAD_NOT_CONFIGURED') {
                            useInlineFallback = true;
                            break;
                        }
                        toastApiError(
                            t('uploadFailedTitle'),
                            translateApiError(tErrors, err),
                        );
                        return;
                    }
                }

                if (!useInlineFallback && uploads.length > 0) {
                    const refs = uploadsToAttachmentRefs(uploadedFiles, uploads);
                    pendingMessageAttachmentsRef.current = refs;
                    void sendMessage({
                        role: 'user',
                        parts: buildUserMessageParts(text, refs),
                    });
                    setInput('');
                    composerRef.current?.focus();
                    return;
                }
            }

            const transfer = new DataTransfer();
            for (const file of files) {
                transfer.items.add(file);
            }
            if (text) {
                void sendMessage({ text, files: transfer.files });
            } else {
                void sendMessage({ files: transfer.files });
            }
            setInput('');
            composerRef.current?.focus();
        })();
    };

    const focusComposer = (): void => {
        composerRef.current?.focus();
    };

    const sidebarNavLabel = isDemo ? tDemo('navLabel') : t('currentReport');
    const messagePlaceholder = isDemo
        ? tDemo('messagePlaceholder')
        : t('messagePlaceholder');

    return (
        <div className="flex min-h-dvh bg-background text-foreground">
            <aside className="hidden w-[272px] shrink-0 border-r border-border bg-card md:flex md:flex-col">
                <div className="px-8 pt-8">
                    <Button
                        className="h-10 w-[208px] rounded-full"
                        render={<Link href="/access" />}
                    >
                        <Plus className="size-4" />
                        {t('startSecure')}
                    </Button>
                </div>

                <nav className="mt-6 px-6" aria-label="Chat navigation">
                    <button
                        type="button"
                        className="flex h-10 w-full items-center gap-3 rounded-lg bg-primary/10 px-3 text-start text-sm font-medium text-primary"
                        onClick={focusComposer}
                    >
                        <FileText className="size-4" />
                        {sidebarNavLabel}
                    </button>
                </nav>

                <div className="mt-auto border-t border-border p-6">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Shield className="size-4 shrink-0" />
                        {reportingMode && caseId ? (
                            <span className="ltr-embed truncate font-mono text-xs">
                                {caseId}
                            </span>
                        ) : (
                            <span>
                                {isDemo ? tDemo('sessionLabel') : t('anonymousSession')}
                            </span>
                        )}
                    </div>
                </div>
            </aside>

            <main className="flex min-h-dvh min-w-0 flex-1 flex-col bg-muted">
                <header className="h-16 border-b border-border bg-card">
                    <div className="flex h-full items-center justify-between px-8">
                        <div className="flex items-center gap-3">
                            <AssistantAvatar className="size-8" />
                            <div className="flex flex-col">
                                <span className="text-[16px] font-medium leading-tight">
                                    {t('assistantName')}
                                </span>
                                <span className="text-[11px] leading-tight text-muted-foreground">
                                    {isDemo
                                        ? tDemo('assistantSubtitle')
                                        : t('assistantSubtitle')}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <LanguageSwitcher />
                            <Button
                                variant="outline"
                                size="sm"
                                render={<Link href="/" />}
                            >
                                <Home className="size-4" />
                                {t('home')}
                            </Button>
                        </div>
                    </div>
                </header>

                <div className="mx-auto flex min-h-0 w-full max-w-[858px] flex-1 flex-col px-4 pb-4">
                    {isDemo ? (
                        <div className="mt-4 rounded-2xl border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                            {tDemo.rich('demoBanner', {
                                link: (chunks) => (
                                    <Link href="/access" className="underline">
                                        {chunks}
                                    </Link>
                                ),
                            })}
                        </div>
                    ) : (
                        <ReportingChatExtras
                            caseId={caseId}
                            submitted={submitted}
                            sessionOk={sessionOk}
                            extractionFields={extractionFields}
                            showCrisis={showCrisis}
                            onSubmitReport={() => void handleSubmitReport()}
                            submitBusy={submitBusy}
                            submitDone={submitDone}
                        />
                    )}
                    <ChatContainerRoot
                        className="min-h-0 flex-1 overscroll-contain pt-6"
                        aria-label={t('conversation')}
                    >
                        <ChatContainerContent className="gap-6 pb-6">
                            {messages.map((message) => {
                                const isUser = message.role === 'user';
                                const body = isUser
                                    ? ''
                                    : partsToPlainText(message.parts);
                                const isSeedMessage =
                                    message.id === WELCOME_MESSAGE_ID;

                                return (
                                    <Fragment key={message.id}>
                                        <Message
                                            className={
                                                isUser
                                                    ? 'ms-auto max-w-[704px] flex-row-reverse gap-3'
                                                    : 'me-auto max-w-[704px] flex-row gap-3'
                                            }
                                            aria-labelledby={`msg-label-${message.id}`}
                                        >
                                            {isUser ? (
                                                <Avatar className="size-10 shrink-0">
                                                    <AvatarFallback>
                                                        <User
                                                            className="size-4"
                                                            aria-hidden
                                                        />
                                                    </AvatarFallback>
                                                </Avatar>
                                            ) : (
                                                <AssistantAvatar className="size-10 shrink-0" />
                                            )}
                                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                                <span
                                                    id={`msg-label-${message.id}`}
                                                    className={
                                                        isSeedMessage
                                                            ? 'sr-only'
                                                            : 'text-[10px] text-muted-foreground'
                                                    }
                                                >
                                                    {isUser ? t('you') : t('assistantName')}
                                                </span>
                                                {isUser ? (
                                                    <div className="rounded-3xl bg-primary/10 px-4 py-3 text-[16px] leading-[24.4px] text-foreground">
                                                        <UserMessageBody
                                                            parts={
                                                                message.parts
                                                            }
                                                        />
                                                    </div>
                                                ) : (
                                                    <MessageContent
                                                        markdown
                                                        className="rounded-3xl border border-border bg-card px-4 py-3 text-[16px] leading-[24.4px] shadow-xs/30"
                                                    >
                                                        {body.length > 0
                                                            ? body
                                                            : '\u00a0'}
                                                    </MessageContent>
                                                )}
                                            </div>
                                        </Message>
                                    </Fragment>
                                );
                            })}

                            {isWelcomeState && !busy ? (
                                <div
                                    className="ms-[52px] flex flex-wrap gap-2"
                                    role="group"
                                    aria-label={t('suggestedQuestions')}
                                >
                                    {suggestionPrompts.map((prompt) => (
                                        <Button
                                            key={prompt}
                                            type="button"
                                            variant="outline"
                                            className="h-auto rounded-full border-primary/30 px-4 py-2 text-sm text-primary hover:bg-primary/10"
                                            disabled={inputDisabled}
                                            onClick={() =>
                                                sendSuggestion(prompt)
                                            }
                                        >
                                            {prompt}
                                        </Button>
                                    ))}
                                </div>
                            ) : null}

                            {showThinkingLoader ? (
                                <Message className="max-w-[704px] gap-3">
                                    <AssistantAvatar className="size-10 shrink-0" />
                                    <div className="flex items-center gap-2 rounded-3xl border border-border bg-card px-4 py-3 text-muted-foreground shadow-xs/30">
                                        <Loader variant="typing" size="sm" />
                                        <span className="text-sm">{t('thinking')}</span>
                                    </div>
                                </Message>
                            ) : null}

                            <ChatContainerScrollAnchor />
                        </ChatContainerContent>
                    </ChatContainerRoot>

                    {error ? (
                        <div
                            role="alert"
                            className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
                        >
                            <AlertCircle
                                className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400"
                                aria-hidden
                            />
                            <div className="min-w-0 flex-1 space-y-1">
                                <p className="font-medium leading-snug">
                                    {t('errorTitle')}
                                </p>
                                <p className="text-muted-foreground leading-snug">
                                    {t(resolveChatErrorCopyKey(error))}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="shrink-0"
                                onClick={() => clearError()}
                                aria-label={t('dismiss')}
                            >
                                <X className="size-4" aria-hidden />
                                <span className="sr-only sm:not-sr-only sm:ms-1">
                                    {t('dismiss')}
                                </span>
                            </Button>
                        </div>
                    ) : null}

                    <div className="shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="sr-only"
                            aria-hidden
                            tabIndex={-1}
                            onChange={onImageFilesChange}
                        />
                        <PromptInput
                            isLoading={busy}
                            value={input}
                            onValueChange={setInput}
                            onSubmit={handleSubmit}
                            disabled={inputDisabled}
                            lockInputWhileLoading
                            className="flex min-h-12 flex-row items-end gap-2 overflow-hidden rounded-full border border-border bg-card px-1 py-1 ps-3 shadow-sm sm:ps-4"
                        >
                            <PromptInputTextarea
                                ref={composerRef}
                                aria-label={t('messageLabel')}
                                placeholder={messagePlaceholder}
                                disableAutosize={false}
                                className="min-h-[40px] flex-1 py-2 text-[16px] leading-[24.4px]"
                            />
                            <PromptInputActions className="shrink-0 pe-1">
                                <PromptInputAction
                                    tooltip={t('attachEvidence')}
                                    side="top"
                                >
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-full text-muted-foreground"
                                        aria-label={t('attachAria')}
                                        disabled={busy || inputDisabled}
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                    >
                                        <ImagePlus className="size-4" />
                                    </Button>
                                </PromptInputAction>
                                {busy ? (
                                    <PromptInputAction
                                        tooltip={t('stopGeneration')}
                                        side="top"
                                    >
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="rounded-full"
                                            aria-label={t('stopGeneration')}
                                            onClick={() => stop()}
                                        >
                                            <Square
                                                className="size-4"
                                                aria-hidden
                                            />
                                        </Button>
                                    </PromptInputAction>
                                ) : (
                                    <PromptInputAction
                                        tooltip={t('sendMessage')}
                                        side="top"
                                    >
                                        <Button
                                            type="button"
                                            size="icon"
                                            className="rounded-full"
                                            aria-label={t('sendMessage')}
                                            disabled={
                                                busy ||
                                                !input.trim() ||
                                                inputDisabled
                                            }
                                            onClick={handleSubmit}
                                        >
                                            <ArrowUp
                                                className="size-4"
                                                aria-hidden
                                            />
                                        </Button>
                                    </PromptInputAction>
                                )}
                            </PromptInputActions>
                        </PromptInput>
                    </div>
                </div>
            </main>
        </div>
    );
}
