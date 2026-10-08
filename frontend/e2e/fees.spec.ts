import { test, expect } from '@playwright/test';
import { mockApi } from './mock-api';

test('office records a payment and the balance updates', async ({ page }) => {
  const api = await mockApi(page);
  await page.goto('/fees');

  const row = page.getByLabel('Invoice for Hana Tesfaye Haile');
  await expect(row.getByText('3,000.00 birr')).toBeVisible();
  await row.getByRole('button', { name: 'Record payment' }).click();

  const dialog = page.getByRole('dialog', { name: 'Record payment' });
  await expect(dialog.getByText('Payment from Hana Tesfaye Haile')).toBeVisible();
  await dialog.getByLabel('Amount (birr)').fill('3000');
  await dialog.getByRole('button', { name: 'Record payment' }).click();

  await expect(dialog).toBeHidden();
  expect(api.payments).toEqual([{ invoiceId: 10, amountSantim: 300_000, method: 'telebirr', reference: null }]);
  // The invoice is fully paid, so it drops out of the default "not fully paid" filter
  await expect(row).toBeHidden();
  await expect(page.locator('.figure', { hasText: 'still to collect' }).getByText('0.00 birr', { exact: true })).toBeVisible();
});
