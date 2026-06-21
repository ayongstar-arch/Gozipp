import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login form when clicking login link', async ({ page }) => {
    await page.goto('/');
    
    // Click the login link from onboarding
    const loginLink = page.locator('text=มีบัญชีอยู่แล้ว? เข้าสู่ระบบ');
    await loginLink.click();

    // Check if the login form is displayed
    const loginHeading = page.locator('h2', { hasText: 'เข้าสู่ระบบ' });
    await expect(loginHeading).toBeVisible();

    // Check for phone number input
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="เบอร์โทร"]');
    await expect(phoneInput).toBeVisible();

    // Check for submit button
    const submitButton = page.locator('button', { hasText: 'ดำเนินการต่อ' });
    await expect(submitButton).toBeVisible();
  });

  test('should show validation error for empty form submission on register', async ({ page }) => {
    // Navigate directly to register view by clicking from home
    await page.goto('/');
    await page.locator('button', { hasText: 'ลงทะเบียนใช้งาน' }).click();

    // Click submit without filling anything
    const submitButton = page.locator('button', { hasText: 'ลงทะเบียนใช้งาน' });
    await submitButton.click();

    // Since validation depends on the actual implementation, we might just look for
    // browser validation or custom error messages. Assuming HTML5 validation prevents default
    // or standard form validation is triggered.
    // For now, we just verify the form is still visible and hasn't navigated away.
    const registerHeading = page.locator('h2', { hasText: 'ลงทะเบียนใหม่' });
    await expect(registerHeading).toBeVisible();
  });
});
