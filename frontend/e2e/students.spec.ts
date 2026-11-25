import { test, expect } from '@playwright/test';
import { mockApi } from './mock-api';

test('office searches for a student and the list narrows to the match', async ({ page }) => {
  await mockApi(page);
  await page.goto('/students');

  await expect(page.getByText('3 students')).toBeVisible();
  await expect(page.getByLabel('Hana Tesfaye Haile')).toBeVisible();

  await page.getByRole('searchbox').fill('Abel Girma');

  await expect(page.getByText('1 students')).toBeVisible();
  await expect(page.getByLabel('Abel Girma Haile')).toBeVisible();
  await expect(page.getByLabel('Hana Tesfaye Haile')).toBeHidden();
});
