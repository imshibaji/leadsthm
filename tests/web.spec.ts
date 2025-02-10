import { test, expect } from '@playwright/test';

test('Website Page Tour', async ({ page }) => {
  await page.goto('http://ileadspro.local/');
  await expect(page).toHaveURL('http://ileadspro.local/');
  await expect(page).toHaveTitle('iLeadsPro Software – AI Based Leads Generations Experts');
});