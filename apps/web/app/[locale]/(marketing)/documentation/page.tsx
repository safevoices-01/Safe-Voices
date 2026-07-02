import type { ReactElement, ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '../../../../i18n/navigation';
import { Button } from '@safevoices/ui/components/button';
import { Separator } from '@safevoices/ui/components/separator';

const tocIds = [
    { id: 'getting-started', key: 'gettingStarted' },
    { id: 'anonymous-reporting', key: 'anonymousReporting' },
    { id: 'tracking-your-case', key: 'trackingYourCase' },
    { id: 'for-administrators', key: 'forAdministrators' },
    { id: 'platform-features', key: 'platformFeatures' },
    { id: 'security-privacy', key: 'securityPrivacy' },
    { id: 'testing-workflows', key: 'testingWorkflows' },
    { id: 'faq', key: 'faq' },
] as const;

function TocLink({ id, label }: { id: string; label: string }): ReactElement {
    return (
        <a
            href={`#${id}`}
            className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
            {label}
        </a>
    );
}

function Section({
    id,
    title,
    children,
}: {
    id: string;
    title: string;
    children: ReactNode;
}): ReactElement {
    return (
        <section id={id} className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {title}
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
                {children}
            </div>
        </section>
    );
}

export default async function DocumentationPage(): Promise<ReactElement> {
    const t = await getTranslations('documentation');

    return (
        <div className=" bg-background">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {t('contentsLabel')}
                        </p>
                        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                            {t('title')}
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                            {t('subtitle')}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" render={<Link href="/" />}>
                            {t('backHome')}
                        </Button>
                        <Button render={<Link href="/demo" />}>
                            {t('openChat')}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-20 pt-4 sm:px-6 lg:flex-row lg:gap-12">
                <aside className="lg:w-56 lg:shrink-0">
                    <nav
                        aria-label={t('tocAria')}
                        className="sticky top-20 rounded-xl border border-border bg-card p-3 shadow-xs/30"
                    >
                        <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {t('onThisPage')}
                        </p>
                        <div className="flex flex-col gap-0.5">
                            {tocIds.map((item) => (
                                <TocLink
                                    key={item.id}
                                    id={item.id}
                                    label={t(`toc.${item.key}`)}
                                />
                            ))}
                        </div>
                    </nav>
                </aside>

                <article className="min-w-0 flex-1 space-y-14 lg:max-w-3xl">
                    <Section
                        id="getting-started"
                        title={t('toc.gettingStarted')}
                    >
                        <h3 className="text-base font-semibold text-foreground">
                            For new users
                        </h3>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                Prefer a guided conversation first? Open the{' '}
                                <Link
                                    href="/demo"
                                    className="font-medium text-foreground underline-offset-4 hover:underline"
                                >
                                    AI assistant
                                </Link>{' '}
                                from the landing page, then continue with
                                official intake when you are ready.
                            </li>
                            <li>
                                Open the reporting experience your organization
                                publishes for intake.
                            </li>
                            <li>
                                Describe the concern with enough detail for
                                reviewers to act without guessing.
                            </li>
                            <li>
                                Save the unique tracking code you receive after
                                submission.
                            </li>
                            <li>
                                Return to the tracking page any time to read
                                updates or reply securely.
                            </li>
                        </ul>
                        <Separator className="my-6" />
                        <h3 className="text-base font-semibold text-foreground">
                            What happens next
                        </h3>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>
                                The submission reaches your compliance or triage
                                queue immediately.
                            </li>
                            <li>
                                An owner typically performs first review within
                                24 to 48 hours.
                            </li>
                            <li>
                                Investigators may request more detail through
                                the secure channel.
                            </li>
                            <li>
                                Status changes appear on the timeline as the
                                case advances.
                            </li>
                        </ol>
                    </Section>

                    <Section
                        id="anonymous-reporting"
                        title={t('toc.anonymousReporting')}
                    >
                        <h3 className="text-base font-semibold text-foreground">
                            Submitting a report
                        </h3>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                Pick the category that best matches the concern.
                            </li>
                            <li>
                                Include dates, locations, and names only if that
                                helps clarify the facts.
                            </li>
                            <li>
                                Attach documents or media when they strengthen
                                the record.
                            </li>
                            <li>
                                Submit, then store the tracking code outside of
                                corporate email if needed.
                            </li>
                        </ul>
                        <Separator className="my-6" />
                        <h3 className="text-base font-semibold text-foreground">
                            Your privacy
                        </h3>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                Personal identifiers are optional unless your
                                program requires them.
                            </li>
                            <li>
                                Transport is encrypted end to end to the
                                application boundary.
                            </li>
                            <li>
                                Authorized case members see the matter; everyone
                                else is blocked by policy.
                            </li>
                            <li>
                                The tracking code is how you follow up while
                                staying anonymous.
                            </li>
                        </ul>
                    </Section>

                    <Section
                        id="tracking-your-case"
                        title={t('toc.trackingYourCase')}
                    >
                        <h3 className="text-base font-semibold text-foreground">
                            Using your tracking code
                        </h3>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                Enter the code on the tracking page supplied by
                                your organization.
                            </li>
                            <li>
                                Read the current status and any investigator
                                messages.
                            </li>
                            <li>
                                Review the timeline of actions for transparency.
                            </li>
                            <li>
                                Respond through the secure thread instead of ad
                                hoc channels.
                            </li>
                        </ul>
                        <Separator className="my-6" />
                        <h3 className="text-base font-semibold text-foreground">
                            Typical statuses
                        </h3>
                        <dl className="grid gap-3 sm:grid-cols-2">
                            {[
                                [
                                    'Submitted',
                                    'Received and waiting for triage.',
                                ],
                                [
                                    'Under review',
                                    'A compliance owner is evaluating scope and severity.',
                                ],
                                [
                                    'Investigating',
                                    'Assigned staff are actively working the matter.',
                                ],
                                [
                                    'Resolved',
                                    'Corrective or policy actions are documented.',
                                ],
                                [
                                    'Closed',
                                    'The record is complete and archived per retention rules.',
                                ],
                            ].map(([term, def]) => (
                                <div
                                    key={term}
                                    className="rounded-lg border border-border bg-background p-4"
                                >
                                    <dt className="font-medium text-foreground">
                                        {term}
                                    </dt>
                                    <dd className="mt-1 text-sm">{def}</dd>
                                </div>
                            ))}
                        </dl>
                    </Section>

                    <Section
                        id="for-administrators"
                        title={t('toc.forAdministrators')}
                    >
                        <h3 className="text-base font-semibold text-foreground">
                            Dashboard overview
                        </h3>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                Monitor intake volume, aging cases, and SLA risk
                                in one view.
                            </li>
                            <li>
                                Slice by category, priority, and business unit
                                where metadata exists.
                            </li>
                            <li>
                                Jump into recent activity to coach new
                                investigators.
                            </li>
                        </ul>
                        <Separator className="my-6" />
                        <h3 className="text-base font-semibold text-foreground">
                            Case management
                        </h3>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                Assign owners, set priority, and capture
                                internal notes with timestamps.
                            </li>
                            <li>
                                Message reporters without exposing private
                                contact details.
                            </li>
                            <li>
                                Export structured summaries for regulators or
                                internal committees.
                            </li>
                        </ul>
                        <Separator className="my-6" />
                        <h3 className="text-base font-semibold text-foreground">
                            Team collaboration
                        </h3>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                Invite members with least-privilege roles such
                                as admin, manager, investigator.
                            </li>
                            <li>
                                Coordinate through internal comments separate
                                from reporter-visible messages.
                            </li>
                            <li>
                                Rely on audit logs for every privileged action.
                            </li>
                        </ul>
                    </Section>

                    <Section
                        id="platform-features"
                        title={t('toc.platformFeatures')}
                    >
                        <h3 className="text-base font-semibold text-foreground">
                            Example categories
                        </h3>
                        <p>
                            Ethics and code of conduct, fraud or financial
                            misconduct, harassment or discrimination, health and
                            safety, data misuse, environmental issues, conflicts
                            of interest, and other compliance topics your
                            program enables.
                        </p>
                        <Separator className="my-6" />
                        <h3 className="text-base font-semibold text-foreground">
                            Key capabilities
                        </h3>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                Anonymous and confidential modes per policy.
                            </li>
                            <li>
                                Secure uploads with virus scanning hooks where
                                required.
                            </li>
                            <li>
                                Status timelines and immutable audit events.
                            </li>
                            <li>
                                Configurable workflows and assignment rules.
                            </li>
                            <li>
                                Analytics tuned for compliance reporting cycles.
                            </li>
                        </ul>
                    </Section>

                    <Section
                        id="security-privacy"
                        title={t('toc.securityPrivacy')}
                    >
                        <h3 className="text-base font-semibold text-foreground">
                            Data protection
                        </h3>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                Encryption in transit and at rest for
                                application data and attachments.
                            </li>
                            <li>
                                Network controls and private storage buckets for
                                sensitive files.
                            </li>
                            <li>
                                Periodic penetration tests aligned to your
                                vendor assurance calendar.
                            </li>
                        </ul>
                        <Separator className="my-6" />
                        <h3 className="text-base font-semibold text-foreground">
                            Access controls
                        </h3>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                Role-based permissions with session timeouts for
                                staff accounts.
                            </li>
                            <li>
                                Multi-factor authentication for administrative
                                surfaces.
                            </li>
                            <li>
                                Row-level security patterns when backed by
                                Postgres providers such as Supabase.
                            </li>
                        </ul>
                        <Separator className="my-6" />
                        <h3 className="text-base font-semibold text-foreground">
                            Compliance alignment
                        </h3>
                        <p>
                            Design your retention, portability, and deletion
                            flows with counsel to meet GDPR, CCPA, SOX, and
                            whistleblower-protection expectations in your
                            jurisdictions.
                        </p>
                    </Section>

                    <Section
                        id="testing-workflows"
                        title={t('toc.testingWorkflows')}
                    >
                        <h3 className="text-base font-semibold text-foreground">
                            Anonymous reporter
                        </h3>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>
                                Submit a synthetic report through the public
                                intake page.
                            </li>
                            <li>
                                Copy the tracking code and store it for later
                                steps.
                            </li>
                            <li>
                                Open the tracking page, confirm timeline
                                entries, and send a test message.
                            </li>
                        </ol>
                        <Separator className="my-6" />
                        <h3 className="text-base font-semibold text-foreground">
                            Organization staff
                        </h3>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>
                                Sign in to the admin experience with a
                                non-production account.
                            </li>
                            <li>
                                Locate the synthetic case, change priority, and
                                add an internal note.
                            </li>
                            <li>
                                Assign the matter, reply to the reporter thread,
                                and advance statuses.
                            </li>
                        </ol>
                        <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">
                            Tip: use separate browser profiles when validating
                            multiple roles so sessions never leak context.
                        </p>
                    </Section>

                    <Section id="faq" title={t('toc.faq')}>
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-semibold text-foreground">
                                    Is my report anonymous?
                                </h3>
                                <p className="mt-2">
                                    When your program allows it, you can submit
                                    without identifiers. Anything you
                                    voluntarily provide is stored according to
                                    your organization&apos;s policy.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-foreground">
                                    How long do reviews take?
                                </h3>
                                <p className="mt-2">
                                    Timelines depend on severity and backlog.
                                    Most programs target first contact in a few
                                    business days and full resolution in a few
                                    weeks for standard matters.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-foreground">
                                    What if I lose my code?
                                </h3>
                                <p className="mt-2">
                                    Many programs cannot recover lost tracking
                                    codes by design, because recovery flows
                                    could weaken anonymity. Treat the code like
                                    a password.
                                </p>
                            </div>
                        </div>
                    </Section>
                </article>
            </div>
        </div>
    );
}
