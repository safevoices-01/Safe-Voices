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
import { Link } from '../../i18n/navigation';
import type { ReactElement } from 'react';

export type SuccessPanelProps = {
    email: string;
};

export function SuccessPanel({ email }: SuccessPanelProps): ReactElement {
    return (
        <Card className="w-full min-w-0">
            <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-balance">You are verified</CardTitle>
                <CardDescription>
                    Signed in as{' '}
                    <span className="break-all font-medium text-foreground sm:break-normal">
                        {email}
                    </span>
                    .
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <Alert variant="success">
                    <AlertTitle>Welcome</AlertTitle>
                    <AlertDescription>
                        Your email is confirmed. Continue to the app when you
                        are ready.
                    </AlertDescription>
                </Alert>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 p-4 pt-4 sm:flex-row sm:p-6 sm:pt-4">
                <Button className="w-full" render={<Link href="/dashboard" />}>
                    Open dashboard
                </Button>
                <Button
                    variant="outline"
                    className="w-full"
                    render={<Link href="/" />}
                >
                    Home
                </Button>
            </CardFooter>
        </Card>
    );
}
