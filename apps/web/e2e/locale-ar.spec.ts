import { expect, test } from '@playwright/test';

test.describe('Arabic locale', () => {
    test('access page uses RTL document direction', async ({ page }) => {
        await page.goto('/ar/access');
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    });

    test('marketing home renders in Arabic', async ({ page }) => {
        await page.goto('/ar');
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        await expect(
            page.getByRole('link', { name: /بدء محادثة آمنة/i }),
        ).toBeVisible({ timeout: 15_000 });
    });

    test('documentation shell renders in Arabic', async ({ page }) => {
        await page.goto('/ar/documentation');
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        await expect(
            page.getByRole('heading', { name: /توثيق Safe Voices/i }),
        ).toBeVisible({ timeout: 15_000 });
    });
});
