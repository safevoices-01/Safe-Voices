'use client';

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import React, {
    createContext,
    useContext,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

type PromptInputContextType = {
    isLoading: boolean;
    value: string;
    setValue: (value: string) => void;
    maxHeight: number | string;
    onSubmit?: () => void;
    disabled?: boolean;
    /** When true with isLoading, the textarea is disabled while a response streams. */
    lockInputWhileLoading: boolean;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

const PromptInputContext = createContext<PromptInputContextType>({
    isLoading: false,
    value: '',
    setValue: () => {},
    maxHeight: 240,
    onSubmit: undefined,
    disabled: false,
    lockInputWhileLoading: false,
    textareaRef: React.createRef<HTMLTextAreaElement>(),
});

function usePromptInput() {
    return useContext(PromptInputContext);
}

export type PromptInputProps = {
    isLoading?: boolean;
    value?: string;
    onValueChange?: (value: string) => void;
    maxHeight?: number | string;
    onSubmit?: () => void;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
    lockInputWhileLoading?: boolean;
} & React.ComponentProps<'div'>;

function PromptInput({
    className,
    isLoading = false,
    maxHeight = 240,
    value,
    onValueChange,
    onSubmit,
    children,
    disabled = false,
    lockInputWhileLoading = false,
    onClick,
    ...props
}: PromptInputProps) {
    const [internalValue, setInternalValue] = useState(() => value ?? '');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleChange = (newValue: string) => {
        setInternalValue(newValue);
        onValueChange?.(newValue);
    };

    const handleClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
        if (!disabled) textareaRef.current?.focus();
        onClick?.(e);
    };

    return (
        <TooltipProvider>
            <PromptInputContext.Provider
                value={{
                    isLoading,
                    value: value ?? internalValue,
                    setValue: onValueChange ?? handleChange,
                    maxHeight,
                    onSubmit,
                    disabled,
                    lockInputWhileLoading,
                    textareaRef,
                }}
            >
                <div
                    onClick={handleClick}
                    className={cn(
                        'cursor-text rounded-[length:var(--radius-2xl)] border border-border/80 bg-card p-2 shadow-sm transition-[box-shadow,border-color] hover:border-border',
                        disabled && 'cursor-not-allowed opacity-60',
                        className,
                    )}
                    {...props}
                >
                    {children}
                </div>
            </PromptInputContext.Provider>
        </TooltipProvider>
    );
}

export type PromptInputTextareaProps = {
    disableAutosize?: boolean;
} & React.ComponentProps<'textarea'>;

function PromptInputTextarea({
    className,
    onKeyDown,
    disableAutosize = false,
    ref: forwardedRef,
    ...props
}: PromptInputTextareaProps) {
    const {
        value,
        setValue,
        maxHeight,
        onSubmit,
        disabled,
        lockInputWhileLoading,
        isLoading,
        textareaRef,
    } = usePromptInput();

    const textareaDisabled = disabled || (lockInputWhileLoading && isLoading);

    const adjustHeight = (el: HTMLTextAreaElement | null) => {
        if (!el || disableAutosize) return;

        el.style.height = 'auto';

        if (typeof maxHeight === 'number') {
            el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
        } else {
            el.style.height = `min(${el.scrollHeight}px, ${maxHeight})`;
        }
    };

    const handleRef = (el: HTMLTextAreaElement | null) => {
        textareaRef.current = el;
        if (typeof forwardedRef === 'function') {
            forwardedRef(el);
        } else if (forwardedRef) {
            forwardedRef.current = el;
        }
        adjustHeight(el);
    };

    useLayoutEffect(() => {
        if (!textareaRef.current || disableAutosize) return;

        const el = textareaRef.current;
        el.style.height = 'auto';

        if (typeof maxHeight === 'number') {
            el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
        } else {
            el.style.height = `min(${el.scrollHeight}px, ${maxHeight})`;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, maxHeight, disableAutosize]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        adjustHeight(e.target);
        setValue(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (textareaDisabled) {
                onKeyDown?.(e);
                return;
            }
            if (isLoading) {
                onKeyDown?.(e);
                return;
            }
            const canSubmit = Boolean(onSubmit) && value.trim().length > 0;
            if (!canSubmit) {
                onKeyDown?.(e);
                return;
            }
            e.preventDefault();
            onSubmit?.();
        }
        onKeyDown?.(e);
    };

    return (
        <textarea
            ref={handleRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={cn(
                'min-h-[44px] w-full resize-none border-none bg-transparent text-foreground shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground',
                className,
            )}
            rows={1}
            disabled={textareaDisabled}
            {...props}
        />
    );
}

export type PromptInputActionsProps = React.HTMLAttributes<HTMLDivElement>;

function PromptInputActions({
    children,
    className,
    ...props
}: PromptInputActionsProps) {
    return (
        <div className={cn('flex items-center gap-2', className)} {...props}>
            {children}
        </div>
    );
}

export type PromptInputActionProps = {
    className?: string;
    tooltip: React.ReactNode;
    children: React.ReactNode;
    side?: 'top' | 'bottom' | 'left' | 'right';
} & React.ComponentProps<typeof Tooltip>;

function PromptInputAction({
    tooltip,
    children,
    className,
    side = 'top',
    ...props
}: PromptInputActionProps) {
    const { disabled: inputDisabled } = usePromptInput();

    const trigger = React.isValidElement(children)
        ? (children as React.ReactElement<{
              disabled?: boolean;
              onClick?: (event: React.MouseEvent) => void;
          }>)
        : null;

    if (!trigger) {
        return (
            <Tooltip {...props}>
                <TooltipTrigger>{children}</TooltipTrigger>
                <TooltipContent side={side} className={className}>
                    {tooltip}
                </TooltipContent>
            </Tooltip>
        );
    }

    const isDisabled = inputDisabled || Boolean(trigger.props.disabled);

    return (
        <Tooltip {...props}>
            <TooltipTrigger
                render={React.cloneElement(trigger, {
                    disabled: isDisabled,
                    onClick: (event: React.MouseEvent) => {
                        event.stopPropagation();
                        if (isDisabled) return;
                        trigger.props.onClick?.(event);
                    },
                })}
            />
            <TooltipContent side={side} className={className}>
                {tooltip}
            </TooltipContent>
        </Tooltip>
    );
}

export {
    PromptInput,
    PromptInputTextarea,
    PromptInputActions,
    PromptInputAction,
};
