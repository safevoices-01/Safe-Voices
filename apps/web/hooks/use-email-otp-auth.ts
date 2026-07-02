'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { OtpClient, VerifyOtpError } from '../lib/auth-otp-types';
import { isValidEmailFormat } from '../lib/validate-email';

export type AuthStep = 'email' | 'otp' | 'success';

const RESEND_COOLDOWN_SEC = process.env.NODE_ENV === 'test' ? 2 : 30;

function verifyErrorMessage(error: VerifyOtpError): string {
    switch (error) {
        case 'expired':
            return 'This code has expired. Request a new one.';
        case 'network':
            return 'Something went wrong. Check your connection and try again.';
        default:
            return 'That code does not match. Try again.';
    }
}

function sendErrorMessage(
    error: 'invalid_email' | 'network' | 'rate_limited',
): string {
    switch (error) {
        case 'invalid_email':
            return 'Enter a valid email address.';
        case 'rate_limited':
            return 'Too many attempts. Wait a few minutes and try again.';
        default:
            return 'Could not send the code. Try again.';
    }
}

export type UseEmailOtpAuthResult = {
    step: AuthStep;
    email: string;
    setEmail: (v: string) => void;
    otp: string;
    setOtp: (v: string) => void;
    emailFieldError: string | null;
    otpFieldError: string | null;
    formAlert: string | null;
    sendingOtp: boolean;
    verifyingOtp: boolean;
    resendCooldownSec: number;
    submitEmail: () => Promise<void>;
    submitOtp: () => Promise<void>;
    resendOtp: () => Promise<void>;
    goBackToEmail: () => void;
};

export function useEmailOtpAuth(client: OtpClient): UseEmailOtpAuthResult {
    const [step, setStep] = useState<AuthStep>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [emailFieldError, setEmailFieldError] = useState<string | null>(null);
    const [otpFieldError, setOtpFieldError] = useState<string | null>(null);
    const [formAlert, setFormAlert] = useState<string | null>(null);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [resendCooldownSec, setResendCooldownSec] = useState(0);
    const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(
        null,
    );

    const clearCooldownTimer = useCallback(() => {
        if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
        }
    }, []);

    const startResendCooldown = useCallback(() => {
        clearCooldownTimer();
        setResendCooldownSec(RESEND_COOLDOWN_SEC);
        cooldownTimerRef.current = setInterval(() => {
            setResendCooldownSec((s) => {
                if (s <= 1) {
                    clearCooldownTimer();
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
    }, [clearCooldownTimer]);

    useEffect(() => {
        return () => clearCooldownTimer();
    }, [clearCooldownTimer]);

    const runSendOtp = useCallback(
        async (address: string): Promise<boolean> => {
            setSendingOtp(true);
            setFormAlert(null);
            setEmailFieldError(null);
            try {
                const result = await client.sendOtp(address.trim());
                if (!result.ok) {
                    if (result.error === 'invalid_email') {
                        setEmailFieldError(sendErrorMessage(result.error));
                    } else {
                        setFormAlert(sendErrorMessage(result.error));
                    }
                    return false;
                }
                return true;
            } catch {
                setFormAlert(sendErrorMessage('network'));
                return false;
            } finally {
                setSendingOtp(false);
            }
        },
        [client],
    );

    const submitEmail = useCallback(async () => {
        setFormAlert(null);
        setEmailFieldError(null);
        const trimmed = email.trim();
        if (!isValidEmailFormat(trimmed)) {
            setEmailFieldError(sendErrorMessage('invalid_email'));
            return;
        }
        const ok = await runSendOtp(trimmed);
        if (ok) {
            setStep('otp');
            setOtp('');
            setOtpFieldError(null);
            startResendCooldown();
        }
    }, [email, runSendOtp, startResendCooldown]);

    const submitOtp = useCallback(async () => {
        setOtpFieldError(null);
        setFormAlert(null);
        const code = otp.trim();
        if (code.length !== 6 || !/^\d{6}$/.test(code)) {
            setOtpFieldError('Enter the 6-digit code from your email.');
            return;
        }
        setVerifyingOtp(true);
        try {
            const result = await client.verifyOtp(email.trim(), code);
            if (!result.ok) {
                setOtpFieldError(verifyErrorMessage(result.error));
                return;
            }
            setStep('success');
        } catch {
            setFormAlert(verifyErrorMessage('network'));
        } finally {
            setVerifyingOtp(false);
        }
    }, [client, email, otp]);

    const resendOtp = useCallback(async () => {
        if (resendCooldownSec > 0 || sendingOtp) return;
        setOtp('');
        setOtpFieldError(null);
        const ok = await runSendOtp(email);
        if (ok) startResendCooldown();
    }, [email, resendCooldownSec, runSendOtp, sendingOtp, startResendCooldown]);

    const goBackToEmail = useCallback(() => {
        setStep('email');
        setOtp('');
        setOtpFieldError(null);
        setFormAlert(null);
        clearCooldownTimer();
        setResendCooldownSec(0);
    }, [clearCooldownTimer]);

    return {
        step,
        email,
        setEmail,
        otp,
        setOtp,
        emailFieldError,
        otpFieldError,
        formAlert,
        sendingOtp,
        verifyingOtp,
        resendCooldownSec,
        submitEmail,
        submitOtp,
        resendOtp,
        goBackToEmail,
    };
}
