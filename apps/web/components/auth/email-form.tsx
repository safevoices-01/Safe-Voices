'use client';

import { Button } from '@safevoices/ui/components/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@safevoices/ui/components/card';
import { Field, FieldLabel } from '@safevoices/ui/components/field';
import { Input } from '@safevoices/ui/components/input';
import type { ReactElement } from 'react';

export type EmailFormProps = {
    email: string;
    onEmailChange: (value: string) => void;
    fieldError: string | null;
    formAlert: string | null;
    loading: boolean;
    onSubmit: () => void;
};

export function EmailForm({
    email,
    onEmailChange,
    fieldError,
    formAlert,
    loading,
    onSubmit,
}: EmailFormProps): ReactElement {
    return (
        <Card className="w-full min-w-0">
            <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-balance">
                    Sign in or create an account
                </CardTitle>
                <CardDescription>
                    We will email you a one-time code to verify your address.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <form
                    className="flex w-full flex-col gap-4"
                    noValidate
                    onSubmit={(e) => {
                        e.preventDefault();
                        void onSubmit();
                    }}
                >
                    {formAlert ? (
                        <p
                            className="text-destructive-foreground text-sm"
                            role="alert"
                        >
                            {formAlert}
                        </p>
                    ) : null}
                    <Field>
                        <FieldLabel htmlFor="auth-email">Email</FieldLabel>
                        <Input
                            id="auth-email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => onEmailChange(e.target.value)}
                            aria-invalid={fieldError ? true : undefined}
                            aria-describedby={
                                fieldError ? 'auth-email-error' : undefined
                            }
                            disabled={loading}
                            placeholder="you@organization.org"
                            required
                        />
                        {fieldError ? (
                            <p
                                id="auth-email-error"
                                className="text-destructive-foreground text-xs"
                                role="alert"
                            >
                                {fieldError}
                            </p>
                        ) : null}
                    </Field>
                    <Button
                        type="submit"
                        className="w-full"
                        loading={loading}
                        disabled={loading}
                    >
                        Continue
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
