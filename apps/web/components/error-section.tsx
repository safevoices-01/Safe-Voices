import type { ReactElement } from 'react';
import Link from 'next/link';
import { ArrowRight, CircleAlert } from 'lucide-react';
import { Button } from '@safevoices/ui/components/button';

/**
 * First homepage band: guidance when intake, tracking, or delivery does not go as expected.
 * Anchor: #error
 */
export function ErrorSection(): ReactElement {
    return (
        <section
            id="error"
            aria-labelledby="error-section-title"
            className="relative overflow-hidden  bg-muted/25"
        >
            <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
                <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:max-w-2xl lg:text-left">
                    <Link
                        href="/documentation#faq"
                        className="group border-border bg-card/90 text-foreground hover:bg-card mx-auto inline-flex w-fit max-w-full items-center gap-3 rounded-full border px-3 py-1.5 text-sm shadow-xs/40 backdrop-blur-sm transition-colors lg:mx-0"
                    >
                        <CircleAlert
                            className="size-4 shrink-0 text-destructive"
                            aria-hidden
                        />
                        <span className="min-w-0 text-balance">
                            Trouble submitting, tracking, or getting a response?
                        </span>
                        <span className="bg-border hidden h-4 w-px sm:block" />
                        <span className="text-muted-foreground group-hover:text-foreground hidden items-center gap-1 sm:inline-flex">
                            Read FAQ
                            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                    </Link>

                    <h2
                        id="error-section-title"
                        className="mt-8 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
                    >
                        If something went wrong, you still have options
                    </h2>
                    <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg lg:mx-0">
                        Retry on a stable connection, double-check your
                        organization&apos;s official intake URL, and keep your
                        tracking code somewhere only you can access. For general
                        questions about how reporting usually works—not legal
                        advice—use the assistant or the documentation below.
                    </p>

                    <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                        <Button
                            size="lg"
                            render={<Link href="/documentation#faq" />}
                        >
                            View troubleshooting
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            render={<Link href="/chat" />}
                        >
                            Ask the assistant
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
