import type { ReactElement } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { brandLogoSrc } from '../lib/branding';

const productLinks = [
    { href: '/chat', label: 'AI chat' },
    { href: '/documentation', label: 'Documentation' },
] as const;

export function SiteFooter(): ReactElement {
    return (
        <footer className="border-t border-border bg-muted/40">
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
                    <div className="lg:col-span-6">
                        <Image
                            src={brandLogoSrc}
                            alt="Safe Voices"
                            width={200}
                            height={48}
                            className="h-8 w-auto max-h-8 max-w-[11rem] object-contain object-left"
                        />
                        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                            Confidential reporting for teams that take ethics,
                            safety, and compliance seriously.
                        </p>
                    </div>
                    <div className="lg:col-span-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Product
                        </p>
                        <ul className="mt-4 space-y-2.5 text-sm">
                            {productLinks.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className="text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="lg:col-span-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Trust
                        </p>
                        <ul className="mt-4 space-y-2.5 text-sm">
                            <li>
                                <Link
                                    href="/documentation#security-privacy"
                                    className="text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    Security and privacy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
                Built for secure and ethical reporting.
            </div>
        </footer>
    );
}
