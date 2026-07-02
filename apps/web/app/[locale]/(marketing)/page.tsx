import type { ReactElement } from 'react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '../../../i18n/navigation';
import { ErrorSection } from '../../../components/error-section';
import { Button } from '@safevoices/ui/components/button';
import {
    ArrowRight,
    BarChart3,
    ChevronRight,
    FileKey2,
    HeartHandshake,
    Lock,
    MessageSquareText,
    ShieldCheck,
    Users,
} from 'lucide-react';

const features = [
    {
        title: 'Anonymous by design',
        description:
            'Submit concerns without an account. Optional contact fields stay under your control.',
        icon: Lock,
    },
    {
        title: 'Secure messaging',
        description:
            'Two-way updates with investigators through an encrypted channel tied to your case code.',
        icon: MessageSquareText,
    },
    {
        title: 'Case tracking',
        description:
            'Follow status, timeline events, and requests for more detail with a single tracking code.',
        icon: FileKey2,
    },
    {
        title: 'Role-based access',
        description:
            'Admins, managers, and investigators see only what their role requires, with a full audit trail.',
        icon: Users,
    },
    {
        title: 'Operational analytics',
        description:
            'Volume, SLA risk, and category trends help compliance leaders prioritize and report upstream.',
        icon: BarChart3,
    },
    {
        title: 'Enterprise-ready controls',
        description:
            'Multi-tenant isolation, retention policies, and export tooling aligned to your governance model.',
        icon: ShieldCheck,
    },
] as const;

const steps = [
    {
        step: '1',
        title: 'Submit',
        body: 'Choose a category, describe what happened, and attach evidence if it helps reviewers.',
    },
    {
        step: '2',
        title: 'Track',
        body: 'Store your tracking code somewhere safe. It is the only link between you and the case.',
    },
    {
        step: '3',
        title: 'Get guidance',
        body: "Use the AI assistant for plain-language questions, then follow your organization's official intake when you are ready.",
    },
] as const;

const stats = [
    {
        label: 'Response window',
        value: '24 to 48 hours',
        detail: 'Typical first review target for new submissions.',
    },
    {
        label: 'Encryption',
        value: 'In transit and at rest',
        detail: 'TLS to the edge, encrypted storage, and least-privilege access paths.',
    },
    {
        label: 'Visibility',
        value: 'Role-aware dashboards',
        detail: 'Metrics and queues tuned for compliance, HR, and security leaders.',
    },
] as const;

export default async function HomePage(): Promise<ReactElement> {
    const t = await getTranslations('marketing');
    return (
        <>
            <section className="relative overflow-hidden  bg-background">
                <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 md:pt-24 lg:pt-28">
                    <div className="mx-auto text-center">
                        <Link
                            href="/documentation#platform-features"
                            className="hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-3 rounded-full border p-1 pl-4 shadow-md shadow-zinc-950/5 transition-colors duration-300 dark:border-t-white/5 dark:shadow-zinc-950"
                        >
                            <span className="text-foreground text-sm">
                                Introducing support for AI-assisted reporting
                                guidance
                            </span>
                            <span className="dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700" />
                            <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                                <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                                    <span className="flex size-6">
                                        <ArrowRight className="m-auto size-3" />
                                    </span>
                                    <span className="flex size-6">
                                        <ArrowRight className="m-auto size-3" />
                                    </span>
                                </div>
                            </div>
                        </Link>

                        <h1 className="mx-auto mt-8 max-w-4xl text-balance text-5xl max-md:font-semibold md:text-7xl lg:mt-14 xl:text-[5.1rem]">
                            Modern intake and response workflows for sensitive
                            reports
                        </h1>
                        <p className="mx-auto mt-7 max-w-2xl text-balance text-lg text-muted-foreground">
                            Build trust with secure anonymous reporting,
                            structured case management, and clear communication
                            for reporters, investigators, and compliance teams.
                        </p>

                        <div className="mt-10 flex flex-col items-center justify-center gap-2 md:flex-row">
                            <div className="bg-foreground/10 rounded-[calc(var(--radius-xl)+0.125rem)] border p-0.5">
                                <Button
                                    size="lg"
                                    className="rounded-xl px-5 text-base"
                                    render={<Link href="/access" />}
                                >
                                    {t('heroCta')}
                                </Button>
                            </div>
                            <Button
                                size="lg"
                                variant="outline"
                                className="h-10.5 rounded-xl px-5"
                                render={<Link href="/documentation" />}
                            >
                                {t('heroSecondary')}
                            </Button>
                        </div>
                    </div>

                    <div className="relative -mr-10 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-16">
                        <div className="inset-shadow-2xs ring-background dark:inset-shadow-white/20 bg-background relative mx-auto max-w-6xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1">
                            <Image
                                className="z-2 border-border/25 aspect-15/8 relative rounded-2xl border"
                                src="/hero.png"
                                alt="Safe Voices chat and guidance interface"
                                width={2700}
                                height={1440}
                                priority
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="relative overflow-hidden">
                <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-16 lg:grid-cols-12 lg:items-center lg:gap-10 lg:pt-20">
                    <div className="lg:col-span-7">
                        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs/30 backdrop-blur-sm">
                            <HeartHandshake
                                className="size-3.5 text-primary"
                                aria-hidden
                            />
                            Secure anonymous reporting platform
                        </p>
                        <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                            Give people a safe line to speak up, without
                            compromising control.
                        </h1>
                        <p className="mt-5 max-w-xl text-lg text-muted-foreground sm:text-xl">
                            Safe Voices helps organizations collect sensitive
                            reports, route them to the right owners, and prove
                            every step for auditors. Start from the landing
                            page, then continue in an AI assistant that explains
                            reporting, tracking, and safety in plain language.
                        </p>
                        <div className="mt-9 flex flex-wrap gap-3">
                            <Button size="lg" render={<Link href="/access" />}>
                                {t('openAiChat')}
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                render={<Link href="/documentation" />}
                            >
                                {t('readDocumentation')}
                            </Button>
                        </div>
                    </div>
                    <div className="lg:col-span-5">
                        <div className="rounded-[length:var(--radius-2xl)] border border-border bg-card p-6 shadow-md/20 sm:p-8">
                            <p className="text-sm font-medium text-foreground">
                                Built for trust at scale
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                Reporters stay in control. Teams get structured
                                intake, secure messaging, and audit-ready
                                history—without ad hoc inboxes or shadow tools.
                            </p>
                            <dl className="mt-8 space-y-5 border-t border-border pt-8">
                                {stats.map((row) => (
                                    <div key={row.label}>
                                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                            {row.label}
                                        </dt>
                                        <dd className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                                            {row.value}
                                        </dd>
                                        <dd className="mt-1 text-sm text-muted-foreground">
                                            {row.detail}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </div>
                </div>
            </section>

            <section className=" bg-muted/35">
                <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
                    <div className="mx-auto max-w-3xl text-center">
                        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                            Everything investigators need, nothing reporters do
                            not.
                        </h2>
                        <p className="mt-4 text-muted-foreground sm:text-lg">
                            The same product surface supports reporters, case
                            owners, and executives, with guardrails that stay on
                            by default.
                        </p>
                    </div>
                    <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((item) => (
                            <li
                                key={item.title}
                                className="group flex flex-col rounded-[length:var(--radius-2xl)] border border-border bg-card p-6 shadow-xs/40 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md/20"
                            >
                                <div className="flex size-11 items-center justify-center rounded-[length:var(--radius-lg)] bg-accent text-primary">
                                    <item.icon className="size-5" aria-hidden />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-foreground">
                                    {item.title}
                                </h3>
                                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                                    {item.description}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
                <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-14">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-primary">
                            How it works
                        </p>
                        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                            A calm path from intake to resolution
                        </h2>
                        <p className="mt-4 text-muted-foreground">
                            Clear steps reduce anxiety for reporters and keep
                            operations predictable for the teams reviewing each
                            case.
                        </p>
                    </div>
                    <ol className="space-y-8">
                        {steps.map((s) => (
                            <li
                                key={s.step}
                                className="flex gap-4  pb-8 last:border-b-0 last:pb-0"
                            >
                                <span
                                    className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-sm font-semibold text-primary"
                                    aria-hidden
                                >
                                    {s.step}
                                </span>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">
                                        {s.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                        {s.body}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section className="border-y border-border bg-primary text-primary-foreground">
                <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:px-6 sm:py-16">
                    <div className="max-w-xl">
                        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            Ready when your people need a voice they can trust.
                        </h2>
                        <p className="mt-3 text-primary-foreground/90">
                            The assistant answers questions in conversation. The
                            documentation hub holds structured onboarding, admin
                            workflows, and security notes when you need depth.
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-3">
                        <Button
                            size="lg"
                            className="border-0 bg-primary-foreground text-primary shadow-md hover:bg-primary-foreground/92 data-pressed:bg-primary-foreground/88 not-disabled:inset-shadow-[0_1px_--theme(--color-primary/12%)]"
                            render={<Link href="/access" />}
                        >
                            Open AI chat
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="border-primary-foreground/45 bg-transparent text-primary-foreground shadow-none hover:bg-primary-foreground/12 data-pressed:bg-primary-foreground/18 before:shadow-none dark:border-primary-foreground/45 dark:bg-transparent dark:hover:bg-primary-foreground/12"
                            render={<Link href="/documentation" />}
                        >
                            Open documentation
                        </Button>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
                <div className="rounded-[length:var(--radius-3xl)] border border-border bg-card p-8 shadow-xs/50 sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-12">
                    <div className="max-w-xl">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                            Ship a credible reporting experience your teams will
                            trust.
                        </h2>
                        <p className="mt-3 text-muted-foreground">
                            Pair empathetic intake with controls your security
                            and legal partners can defend—without slowing
                            good-faith reporters down.
                        </p>
                    </div>
                    <div className="mt-8 flex shrink-0 flex-wrap gap-3 lg:mt-0">
                        <Button size="lg" render={<Link href="/access" />}>
                            Open AI chat
                        </Button>
                        <Button
                            variant="secondary"
                            size="lg"
                            render={<Link href="/documentation" />}
                        >
                            Browse documentation
                        </Button>
                    </div>
                </div>
            </section>
        </>
    );
}
