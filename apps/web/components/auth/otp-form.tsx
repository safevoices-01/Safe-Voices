'use client';

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@safevoices/ui/components/alert';
import { Button } from '@safevoices/ui/components/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@safevoices/ui/components/card';
import { Field, FieldLabel } from '@safevoices/ui/components/field';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from '@safevoices/ui/components/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import type { ReactElement } from 'react';

export type OtpFormProps = {
    email: string;
    otp: string;
    onOtpChange: (value: string) => void;
    fieldError: string | null;
    formAlert: string | null;
    verifying: boolean;
    sending: boolean;
    resendCooldownSec: number;
    onVerify: () => void;
    onResend: () => void;
    onBack: () => void;
};

export function OtpForm({
    email,
    otp,
    onOtpChange,
    fieldError,
    formAlert,
    verifying,
    sending,
    resendCooldownSec,
    onVerify,
    onResend,
    onBack,
}: OtpFormProps): ReactElement {
    const otpInvalid = Boolean(fieldError);

    return (
        <Card className="w-full min-w-0">
            <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-balance">Check your email</CardTitle>
                <CardDescription>
                    Enter the 6-digit code we sent to{' '}
                    <span className="break-all font-medium text-foreground sm:break-normal">
                        {email}
                    </span>
                    .
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-4 pt-0 sm:p-6 sm:pt-0">
                {formAlert ? (
                    <Alert variant="error">
                        <AlertTitle>Could not verify</AlertTitle>
                        <AlertDescription>{formAlert}</AlertDescription>
                    </Alert>
                ) : null}
                <form
                    className="flex w-full flex-col gap-4"
                    noValidate
                    onSubmit={(e) => {
                        e.preventDefault();
                        void onVerify();
                    }}
                >
                    <Field className="min-w-0">
                        <FieldLabel htmlFor="auth-otp">
                            One-time code
                        </FieldLabel>
                        <div className="-mx-1 w-full min-w-0 overflow-x-auto overscroll-x-contain pb-1 sm:mx-0 sm:overflow-visible sm:pb-0">
                            <InputOTP
                                id="auth-otp"
                                name="otp"
                                maxLength={6}
                                pattern={REGEXP_ONLY_DIGITS}
                                value={otp}
                                onChange={onOtpChange}
                                disabled={verifying}
                                autoFocus
                                autoComplete="one-time-code"
                                inputMode="numeric"
                                aria-invalid={otpInvalid || undefined}
                                aria-describedby={
                                    fieldError ? 'auth-otp-error' : undefined
                                }
                                onComplete={() => {
                                    void onVerify();
                                }}
                                containerClassName="min-w-min justify-center sm:justify-start"
                            >
                                <InputOTPGroup size="lg">
                                    <InputOTPSlot
                                        index={0}
                                        aria-invalid={
                                            otpInvalid || undefined
                                        }
                                    />
                                    <InputOTPSlot
                                        index={1}
                                        aria-invalid={
                                            otpInvalid || undefined
                                        }
                                    />
                                    <InputOTPSlot
                                        index={2}
                                        aria-invalid={
                                            otpInvalid || undefined
                                        }
                                    />
                                </InputOTPGroup>
                                <InputOTPSeparator />
                                <InputOTPGroup size="lg">
                                    <InputOTPSlot
                                        index={3}
                                        aria-invalid={
                                            otpInvalid || undefined
                                        }
                                    />
                                    <InputOTPSlot
                                        index={4}
                                        aria-invalid={
                                            otpInvalid || undefined
                                        }
                                    />
                                    <InputOTPSlot
                                        index={5}
                                        aria-invalid={
                                            otpInvalid || undefined
                                        }
                                    />
                                </InputOTPGroup>
                            </InputOTP>
                        </div>
                        {fieldError ? (
                            <p
                                id="auth-otp-error"
                                className="text-destructive-foreground text-xs"
                                role="alert"
                            >
                                {fieldError}
                            </p>
                        ) : null}
                    </Field>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="self-start px-0 sm:self-auto"
                            onClick={onBack}
                            disabled={verifying || sending}
                        >
                            Use a different email
                        </Button>
                        <Button
                            type="submit"
                            className="w-full sm:w-auto"
                            loading={verifying}
                            disabled={verifying || otp.length !== 6}
                        >
                            Verify
                        </Button>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-2 border-t p-4 pt-4 sm:p-6 sm:pt-4">
                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    loading={sending}
                    disabled={sending || verifying || resendCooldownSec > 0}
                    onClick={() => void onResend()}
                >
                    {resendCooldownSec > 0
                        ? `Resend code in ${resendCooldownSec}s`
                        : 'Resend code'}
                </Button>
            </CardFooter>
        </Card>
    );
}
