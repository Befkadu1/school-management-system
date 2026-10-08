import { test, expect } from '@playwright/test';
import { mockApi } from './mock-api';

test('teacher marks attendance, undoes a mistake and saves', async ({ page }) => {
  const api = await mockApi(page);
  await page.goto('/attendance');

  await page.getByRole('button', { name: 'Mark everyone present' }).click();
  await expect(page.getByText('3 unsaved')).toBeVisible();

  const abel = page.getByRole('group', { name: 'Attendance for Abel Girma Haile' });
  await abel.getByRole('button', { name: 'absent' }).click();
  await expect(abel.getByRole('button', { name: 'absent' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(abel.getByRole('button', { name: 'present' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Save attendance' }).click();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  expect(api.saved).toHaveLength(1);
});

test('students search narrows the list', async ({ page }) => {
  await mockApi(page);
  await page.goto('/students');
  await page.getByRole('searchbox', { name: 'Search' }).fill('Mer');
  await expect(page.getByText('1 students')).toBeVisible();
  await expect(page.getByText('Meron Bekele Haile')).toBeVisible();
});
