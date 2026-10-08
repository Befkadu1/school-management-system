import { test, expect } from '@playwright/test';
import { mockApi } from './mock-api';

test('assistant shows its steps and only publishes after approval', async ({ page }) => {
  const api = await mockApi(page);
  await page.goto('/assistant');

  await page.getByRole('button', { name: 'Draft a reminder to parents about unpaid fees' }).click();
  await expect(page.getByText('I drafted a fee reminder')).toBeVisible();

  await page.getByText('How I got this: 2 lookups').click();
  await expect(page.getByText('list_unpaid_fees({})')).toBeVisible();

  expect(api.published).toHaveLength(0); // nothing sent yet
  await page.getByRole('button', { name: 'Publish announcement' }).click();
  await expect(page.getByText('Published', { exact: true })).toBeVisible();
  expect(api.published).toHaveLength(1);
});
