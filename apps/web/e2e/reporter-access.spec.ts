import { expect, test } from '@playwright/test';

test.describe('reporter access', () => {
    test('creates an anonymous case and shows credentials once', async ({ page }) => {
        await page.goto('/en/access');
        await page
            .getByRole('button', { name: /continue anonymously/i })
            .click();
        await expect(
            page.getByText(/save these credentials now/i),
        ).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText(/^SV-/)).toBeVisible();
    });

    test('dashboard redirects unauthenticated partners to email sign-in', async ({
        page,
    }) => {
        await page.goto('/en/dashboard');
        await expect(page).toHaveURL(/\/en\/auth\/email/);
    });
});
