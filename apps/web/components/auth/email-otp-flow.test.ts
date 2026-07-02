import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement as h } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./auth-layout', () => ({
    AuthLayout: ({
        children,
        title,
    }: {
        children: React.ReactNode;
        title: string;
    }) => h('div', null, h('h1', { className: 'sr-only' }, title), children),
}));
vi.mock('./success-panel', () => ({
    SuccessPanel: ({ email }: { email: string }) =>
        h('div', null, h('span', null, 'You are verified'), email),
}));
import {
    MOCK_OTP_EXPIRED_CODE,
    MOCK_OTP_SUCCESS_CODE,
    createMockOtpClient,
} from '../../lib/auth-otp-mock';
import type { OtpClient } from '../../lib/auth-otp-types';
import { EmailOtpFlow } from './email-otp-flow';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

function emailInput(): HTMLElement {
    return screen.getByRole('textbox', { name: /^email$/i });
}

function otpInput(): HTMLElement {
    return screen.getByRole('textbox', { name: /one-time code/i });
}

describe('EmailOtpFlow', () => {
    it('renders the email form', () => {
        const client = createMockOtpClient({
            sendDelayMs: 0,
            verifyDelayMs: 0,
        });
        render(h(EmailOtpFlow, { client }));
        expect(
            screen.getByText(/sign in or create an account/i),
        ).toBeInTheDocument();
        expect(emailInput()).toBeInTheDocument();
    });

    it('validates email before sending', async () => {
        const user = userEvent.setup();
        const client = createMockOtpClient({
            sendDelayMs: 0,
            verifyDelayMs: 0,
        });
        render(h(EmailOtpFlow, { client }));
        await user.type(emailInput(), 'not-an-email');
        await user.click(screen.getByRole('button', { name: /continue/i }));
        expect(
            await screen.findByText(/enter a valid email address/i),
        ).toBeInTheDocument();
    });

    it('advances to OTP after a valid email', async () => {
        const user = userEvent.setup();
        const client = createMockOtpClient({
            sendDelayMs: 0,
            verifyDelayMs: 0,
        });
        render(h(EmailOtpFlow, { client }));
        await user.type(emailInput(), 'test@example.com');
        await user.click(screen.getByRole('button', { name: /continue/i }));
        expect(
            await screen.findByText(/check your email/i),
        ).toBeInTheDocument();
        expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    });

    it('completes verification with a valid OTP', async () => {
        const user = userEvent.setup();
        const client = createMockOtpClient({
            sendDelayMs: 0,
            verifyDelayMs: 0,
        });
        render(h(EmailOtpFlow, { client }));
        await user.type(emailInput(), 'ok@example.com');
        await user.click(screen.getByRole('button', { name: /continue/i }));
        expect(
            await screen.findByText(/check your email/i),
        ).toBeInTheDocument();
        await user.click(otpInput());
        await user.keyboard(MOCK_OTP_SUCCESS_CODE);
        await waitFor(() => {
            expect(screen.getByText(/you are verified/i)).toBeInTheDocument();
        });
    });

    it('shows an error for an invalid OTP', async () => {
        const user = userEvent.setup();
        const client = createMockOtpClient({
            sendDelayMs: 0,
            verifyDelayMs: 0,
        });
        render(h(EmailOtpFlow, { client }));
        await user.type(emailInput(), 'ok@example.com');
        await user.click(screen.getByRole('button', { name: /continue/i }));
        expect(
            await screen.findByText(/check your email/i),
        ).toBeInTheDocument();
        await user.click(otpInput());
        await user.keyboard('999999');
        await waitFor(() => {
            expect(
                screen.getByText(/that code does not match/i),
            ).toBeInTheDocument();
        });
    });

    it('handles expired OTP from the mock client', async () => {
        const user = userEvent.setup();
        const client = createMockOtpClient({
            sendDelayMs: 0,
            verifyDelayMs: 0,
        });
        render(h(EmailOtpFlow, { client }));
        await user.type(emailInput(), 'ok@example.com');
        await user.click(screen.getByRole('button', { name: /continue/i }));
        expect(
            await screen.findByText(/check your email/i),
        ).toBeInTheDocument();
        await user.click(otpInput());
        await user.keyboard(MOCK_OTP_EXPIRED_CODE);
        await waitFor(() => {
            expect(
                screen.getByText(/this code has expired/i),
            ).toBeInTheDocument();
        });
    });

    it('disables resend during cooldown and re-enables after timer', async () => {
        const user = userEvent.setup();
        const client = createMockOtpClient({
            sendDelayMs: 0,
            verifyDelayMs: 0,
        });
        render(h(EmailOtpFlow, { client }));
        await user.type(emailInput(), 'cool@example.com');
        await user.click(screen.getByRole('button', { name: /continue/i }));
        const resend = await screen.findByRole('button', { name: /resend/i });
        expect(resend).toBeDisabled();
        expect(
            screen.getByRole('button', { name: /resend code in 2s/i }),
        ).toBeInTheDocument();
        await waitFor(
            () => {
                expect(
                    screen.getByRole('button', { name: /^resend code$/i }),
                ).toBeEnabled();
            },
            { timeout: 6_000 },
        );
    }, 10_000);

    it('surfaces verify failures when the client rejects the code', async () => {
        const user = userEvent.setup();
        const client: OtpClient = {
            sendOtp: async () => ({ ok: true }),
            verifyOtp: async () => ({ ok: false, error: 'invalid' }),
        };
        render(h(EmailOtpFlow, { client }));
        await user.type(emailInput(), 'api@example.com');
        await user.click(screen.getByRole('button', { name: /continue/i }));
        expect(
            await screen.findByText(/check your email/i),
        ).toBeInTheDocument();
        await user.click(otpInput());
        await user.keyboard('123456');
        await waitFor(() => {
            expect(
                screen.getByText(/that code does not match/i),
            ).toBeInTheDocument();
        });
    });

    it('pastes a full OTP into the grouped input', async () => {
        const user = userEvent.setup();
        const client = createMockOtpClient({
            sendDelayMs: 0,
            verifyDelayMs: 0,
        });
        render(h(EmailOtpFlow, { client }));
        await user.type(emailInput(), 'paste@example.com');
        await user.click(screen.getByRole('button', { name: /continue/i }));
        expect(
            await screen.findByText(/check your email/i),
        ).toBeInTheDocument();
        await user.click(otpInput());
        await user.paste(MOCK_OTP_SUCCESS_CODE);
        await waitFor(() => {
            expect(screen.getByText(/you are verified/i)).toBeInTheDocument();
        });
    });
});

describe('validate-email (via UI)', () => {
    it('accepts a normal address', async () => {
        const user = userEvent.setup();
        const client = createMockOtpClient({
            sendDelayMs: 0,
            verifyDelayMs: 0,
        });
        render(h(EmailOtpFlow, { client }));
        await user.type(emailInput(), 'person@company.co.uk');
        await user.click(screen.getByRole('button', { name: /continue/i }));
        expect(
            await screen.findByText(/check your email/i),
        ).toBeInTheDocument();
    });
});
