import { expect, test } from '@playwright/test';
import {
    createSubmittedCase,
    PARTNER_EMAIL,
    signInPartner,
} from './helpers/partner-auth';

test.describe('partner access', () => {
    test.describe.configure({ mode: 'serial' });

    test('partner signs in and opens the case queue', async ({ page }) => {
        await signInPartner(page, PARTNER_EMAIL);
        await expect(page.getByRole('heading', { name: 'Case queue' })).toBeVisible();
        await expect(
            page
                .getByRole('table')
                .or(page.getByText('No cases match your filters.')),
        ).toBeVisible({ timeout: 15_000 });
    });

    test('partner sees a submitted case in the queue', async ({ page }) => {
        const created = await createSubmittedCase(page);
        await signInPartner(page, PARTNER_EMAIL);
        await expect(page.getByText(created.caseId)).toBeVisible({
            timeout: 15_000,
        });
        await page
            .getByRole('row', { name: new RegExp(created.caseId) })
            .getByRole('link', { name: 'View' })
            .click();
        await expect(page).toHaveURL(
            new RegExp(
                `/en/dashboard/cases/${created.caseId.replace(/-/g, '\\-')}`,
            ),
        );
    });
});
