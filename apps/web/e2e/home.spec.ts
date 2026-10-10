import { expect, test } from '@playwright/test';

test('home shell renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Recess' })).toBeVisible();
  await expect(page.getByText('Play. Connect. Compete.')).toBeVisible();
});
