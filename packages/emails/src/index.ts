export function getEmailProvider(): 'resend' {
    return 'resend';
}

export type SendEmailInput = {
    to: string;
    subject: string;
    html: string;
};

export async function sendTransactionalEmail(
    input: SendEmailInput,
): Promise<{ ok: boolean; id?: string; error?: string }> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
        return { ok: false, error: 'RESEND_API_KEY not configured' };
    }

    const from = process.env.EMAIL_FROM?.trim() ?? 'noreply@thesafevoices.org';
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from,
            to: input.to,
            subject: input.subject,
            html: input.html,
        }),
    });

    if (!res.ok) {
        return { ok: false, error: `Resend error ${res.status}` };
    }
    const json = (await res.json()) as { id?: string };
    return { ok: true, id: json.id };
}

export async function sendCaseReceivedEmail(input: {
    to: string;
    caseId: string;
}): Promise<{ ok: boolean }> {
    const result = await sendTransactionalEmail({
        to: input.to,
        subject: 'Safe Voices: report received',
        html: `<p>Your report <strong>${input.caseId}</strong> has been received and will be reviewed.</p>`,
    });
    return { ok: result.ok };
}

export async function sendPartnerOtpEmail(input: {
    to: string;
    code: string;
}): Promise<{ ok: boolean }> {
    const result = await sendTransactionalEmail({
        to: input.to,
        subject: 'Safe Voices partner sign-in code',
        html: `<p>Your sign-in code is <strong>${input.code}</strong>. It expires in 10 minutes.</p>`,
    });
    return { ok: result.ok };
}
