import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const PARTNER_EMAIL = 'partner@example.com';

export async function signInPartner(
    page: Page,
    email = PARTNER_EMAIL,
): Promise<void> {
    await page.goto('/en/auth/email');
    await page.getByLabel('Email').fill(email);

    const otpResponse = page.waitForResponse(
        (response) =>
            response.url().includes('/api/auth/partner/otp') && response.ok(),
    );
    await page.getByRole('button', { name: 'Continue' }).click();
    const otpRes = await otpResponse;
    const payload = (await otpRes.json()) as { code?: string };
    expect(payload.code).toMatch(/^\d{6}$/);

    await expect(page.getByText('Check your email')).toBeVisible();

    const verifyRes = await page.request.post('/api/auth/partner/verify', {
        data: { email, code: payload.code },
    });
    expect(verifyRes.ok()).toBeTruthy();

    await page.goto('/en/dashboard');
    await expect(page.getByText('Case queue')).toBeVisible({
        timeout: 15_000,
    });
}

export async function createSubmittedCase(
    page: Page,
): Promise<{ caseId: string; secret: string }> {
    const createRes = await page.request.post('/api/cases');
    expect(createRes.ok()).toBeTruthy();
    const created = (await createRes.json()) as {
        caseId: string;
        secret: string;
    };

    const verifyRes = await page.request.post('/api/cases/verify', {
        data: {
            caseId: created.caseId,
            secret: created.secret,
        },
    });
    expect(verifyRes.ok()).toBeTruthy();

    const submitRes = await page.request.post(
        `/api/cases/${encodeURIComponent(created.caseId)}/submit`,
    );
    expect(submitRes.ok()).toBeTruthy();

    return created;
}
