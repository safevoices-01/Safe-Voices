import { expect, test } from '@playwright/test';

test.describe('demo chat routing', () => {
    test('loads demo chat at /demo', async ({ page }) => {
        await page.goto('/en/demo');
        await expect(page.getByText(/demo chat only/i)).toBeVisible();
        await expect(
            page.getByText(/welcome to the safe voices demo assistant/i),
        ).toBeVisible();
    });

    test('redirects bare /chat to access', async ({ page }) => {
        await page.goto('/en/chat');
        await expect(page).toHaveURL(/\/en\/access$/);
    });
});
