import { test, expect } from '@playwright/test';

test('temporary onboarding mode creates the account before PIN setup', async ({ page }) => {
  let registrationPayload: Record<string, string> | undefined;

  await page.route('**/api/v1/passenger/me', route => route.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
  await page.route('**/api/v1/passenger/register', async route => {
    registrationPayload = route.request().postDataJSON();
    await route.fulfill({
      json: {
        success: true,
        passengerId: 'a0000000-0000-0000-0000-000000000099',
        name: 'สมชาย ใจดี',
        pointsBalance: 0,
        freeRidesRemaining: 3,
      },
    });
  });
  await page.route('**/api/v1/auth/check-status', route => route.fulfill({ json: { exists: true, hasPin: false } }));

  await page.goto('/passenger');
  await page.getByRole('button', { name: 'ลงทะเบียนใช้งาน' }).click();
  await page.getByPlaceholder('เช่น สมชาย ใจดี').fill('สมชาย ใจดี');
  await page.getByPlaceholder('081-234-5678').fill('0812345678');
  await page.getByRole('button', { name: 'ลงทะเบียนเลย' }).click();

  await expect(page.getByRole('heading', { name: 'ตั้งรหัส PIN' })).toBeVisible();
  expect(registrationPayload).toEqual({
    phoneNumber: '0812345678',
    otp: '',
    name: 'สมชาย ใจดี',
  });
});
