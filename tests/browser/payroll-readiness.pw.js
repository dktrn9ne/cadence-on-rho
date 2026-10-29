import { test, expect } from '@playwright/test';

test('readiness demo distinguishes wallet funds, Rho sandbox cash, and failure states', async ({ page }) => {
  await page.route('**/api/rho-readiness', route => route.fulfill({ json: {
    mode: 'sandbox', fetchedAt: new Date().toISOString(),
    accounts: [{ id: 'a', name: 'Demo Checking', type: 'checking', last4: '1234', balance: { amount: 1000000, currency: 'USD' } }],
    transactions: [{ id: 't', accountId: 'a', counterparty: 'Sandbox funding', status: 'pending', amount: { amount: 10000, currency: 'USD' }, date: new Date().toISOString() }],
  } }));
  await page.goto('/?readiness=demo');
  await expect(page.getByRole('heading', { name: 'Ready for the next payday.' })).toBeVisible();
  await expect(page.getByText('Funding needed', { exact: true })).toBeVisible();
  await expect(page.getByText('2,657.142857 RLUSD', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load Rho snapshot' }).click();
  await expect(page.getByText('Rho sandbox · fictional', { exact: true })).toBeVisible();
  await expect(page.getByText('$10,000.00', { exact: true })).toBeVisible();
  await expect(page.getByText('Funding needed', { exact: true })).toBeVisible();
  await expect(page.getByText('No bank transaction has been automatically matched', { exact: false })).toBeVisible();
  await page.route('**/api/rho-readiness', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await page.getByRole('button', { name: 'Refresh Rho snapshot' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not load Rho');
  await expect(page.getByText('$10,000.00', { exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
