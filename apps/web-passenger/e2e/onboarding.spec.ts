import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('should display the onboarding view correctly', async ({ page }) => {
    // Start at the home page (which should show onboarding if not logged in)
    await page.goto('/');

    // Wait for the logo to be visible
    const logo = page.locator('img[alt="Gozipp"]');
    await expect(logo).toBeVisible();

    // Check for the main slogan text
    const heading1 = page.locator('h1', { hasText: 'เรียกวินใกล้คุณ' });
    const heading2 = page.locator('h1', { hasText: 'รวดเร็ว ปลอดภัย' });
    
    await expect(heading1).toBeVisible();
    await expect(heading2).toBeVisible();

    // Check for the call-to-action button
    const registerButton = page.locator('button', { hasText: 'ลงทะเบียนใช้งาน' });
    await expect(registerButton).toBeVisible();

    // Check for the login link
    const loginLink = page.locator('text=มีบัญชีอยู่แล้ว? เข้าสู่ระบบ');
    await expect(loginLink).toBeVisible();
  });

  test('should navigate to Register view when register button is clicked', async ({ page }) => {
    await page.goto('/');
    
    const registerButton = page.locator('button', { hasText: 'ลงทะเบียนใช้งาน' });
    await registerButton.click();

    // Wait for the register form to appear
    const registerHeading = page.locator('h2', { hasText: 'ลงทะเบียนใหม่' });
    await expect(registerHeading).toBeVisible();
  });
});
