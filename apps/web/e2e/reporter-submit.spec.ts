import { expect, test } from '@playwright/test';

test.describe('reporter submit lifecycle', () => {
    test('submitted case becomes read-only in chat', async ({ page }) => {
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

        await page.goto(
            `/en/chat?caseId=${encodeURIComponent(created.caseId)}`,
        );
        await expect(
            page.getByRole('button', { name: /submit report/i }),
        ).toBeVisible({ timeout: 15_000 });

        const submitRes = await page.request.post(
            `/api/cases/${encodeURIComponent(created.caseId)}/submit`,
        );
        expect(submitRes.ok()).toBeTruthy();

        await page.reload();
        await expect(
            page.getByText(/report submitted/i),
        ).toBeVisible({ timeout: 15_000 });

        const chatRes = await page.request.post(
            `/api/cases/${encodeURIComponent(created.caseId)}/chat`,
            {
                data: {
                    messages: [
                        {
                            id: 'e2e-user',
                            role: 'user',
                            parts: [{ type: 'text', text: 'follow up' }],
                        },
                    ],
                    clientRequestId: 'e2e-req-1',
                    locale: 'en',
                },
            },
        );
        expect(chatRes.status()).toBe(409);
    });
});
