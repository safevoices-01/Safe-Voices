import { expect, test } from '@playwright/test';

test.describe('reporter image upload', () => {
    test('attaches an image in reporting chat', async ({ page }) => {
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
            page.getByRole('button', { name: /attach evidence images/i }),
        ).toBeEnabled({ timeout: 15_000 });

        const png = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            'base64',
        );

        await page
            .locator('input[type="file"][accept="image/*"]')
            .setInputFiles({
                name: 'evidence.png',
                mimeType: 'image/png',
                buffer: png,
            });

        await expect(page.getByRole('img', { name: 'evidence.png' })).toBeVisible({
            timeout: 15_000,
        });
    });
});
