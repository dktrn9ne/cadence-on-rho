import { test, expect } from '@playwright/test';
test('USD cycle accrues, reserves daily requests across tabs, and persists bank-result simulation', async ({page,context}) => {
  await page.goto('/?payroll=usd');
  await page.getByRole('button',{name:'Employer',exact:true}).click();
  await page.getByRole('button',{name:'Load two hours of sample work'}).click();
  await expect(page.getByText('$48.00',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Worker',exact:true}).click();
  const second = await context.newPage(); await second.goto('/?payroll=usd');
  for (const tab of [page,second,page]) {
    await tab.getByRole('textbox',{name:'Payout amount (USD)'}).fill('5');
    await tab.getByRole('button',{name:'Request simulated payout'}).click();
  }
  await expect(page.getByText('0 of 3',{exact:true})).toBeVisible();
  await expect(second.getByText('0 of 3',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Request simulated payout'})).toBeDisabled();
  await page.reload();
  await expect(page.getByText('$15.00',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Employer',exact:true}).click();
  await page.getByRole('button',{name:'Simulate uncertain'}).first().click();
  await expect(page.getByText('Uncertain · reserved',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Simulate failure'}).first().click();
  await expect(page.getByText('Confirmed failed · released',{exact:true})).toBeVisible();
  await expect(page.getByText('0 of 3',{exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
