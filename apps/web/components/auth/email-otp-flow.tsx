'use client';

import { useEmailOtpAuth } from '../../hooks/use-email-otp-auth';
import { createPartnerOtpApiClient } from '../../lib/auth-otp-api';
import { createMockOtpClient } from '../../lib/auth-otp-mock';
import type { OtpClient } from '../../lib/auth-otp-types';
import { useRef, type ReactElement } from 'react';
import { AuthLayout } from './auth-layout';
import { EmailForm } from './email-form';
import { OtpForm } from './otp-form';
import { SuccessPanel } from './success-panel';

export type EmailOtpFlowProps = {
    /** Override for tests or production API wiring. */
    client?: OtpClient;
};

export function EmailOtpFlow({
    client: clientProp,
}: EmailOtpFlowProps): ReactElement {
    const fallbackClient = useRef<OtpClient | null>(null);
    if (!fallbackClient.current) {
        fallbackClient.current =
            process.env.NEXT_PUBLIC_MOCK_OTP === 'true'
                ? createMockOtpClient()
                : createPartnerOtpApiClient();
    }
    const client = clientProp ?? fallbackClient.current;
    const auth = useEmailOtpAuth(client);

    const title =
        auth.step === 'email'
            ? 'Sign in with email'
            : auth.step === 'otp'
              ? 'Enter verification code'
              : 'Account verified';

    return (
        <AuthLayout title={title}>
            {auth.step === 'email' ? (
                <EmailForm
                    email={auth.email}
                    onEmailChange={auth.setEmail}
                    fieldError={auth.emailFieldError}
                    formAlert={auth.formAlert}
                    loading={auth.sendingOtp}
                    onSubmit={auth.submitEmail}
                />
            ) : null}
            {auth.step === 'otp' ? (
                <OtpForm
                    email={auth.email}
                    otp={auth.otp}
                    onOtpChange={auth.setOtp}
                    fieldError={auth.otpFieldError}
                    formAlert={auth.formAlert}
                    verifying={auth.verifyingOtp}
                    sending={auth.sendingOtp}
                    resendCooldownSec={auth.resendCooldownSec}
                    onVerify={auth.submitOtp}
                    onResend={auth.resendOtp}
                    onBack={auth.goBackToEmail}
                />
            ) : null}
            {auth.step === 'success' ? (
                <SuccessPanel email={auth.email.trim()} />
            ) : null}
        </AuthLayout>
    );
}
