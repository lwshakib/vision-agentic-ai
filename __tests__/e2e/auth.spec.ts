/**
 * End-to-End (E2E) Authentication Tests
 * Uses Playwright to simulate real user interactions in a browser.
 * Verifies critical production paths like login page loading and protected route redirects.
 */

import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  /**
   * Test: Basic UI Integrity
   * Ensures the sign-in page contains all necessary form elements.
   */
  test('should load the sign-in page', async ({ page }) => {
    // Navigate to the authentication route.
    await page.goto('/sign-in');

    // Heading validation.
    await expect(page.locator('h1')).toContainText(
      'Sign In to Vision Agentic AI',
    );

    // Form label visibility (accessibility check).
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="pwd"]')).toBeVisible();

    // Critical CTA presence.
    await expect(page.locator('button[type="submit"]')).toContainText(
      'Sign In',
    );
  });

  /**
   * Test: Middleware and Protection
   * Ensures the application correctly blocks public access to the root dashboard.
   */
  test('should redirect unauthenticated users from home to sign-in', async ({
    page,
  }) => {
    // Attempt to access the main app without a session.
    await page.goto('/');

    // Playwright automatically follows the server-side redirect (302/307).
    // Validate that the URL now contains 'sign-in'.
    await expect(page).toHaveURL(/.*sign-in.*/);

    // Confirm the user is actually seeing the sign-in screen.
    await expect(page.locator('h1')).toContainText(
      'Sign In to Vision Agentic AI',
    );
  });
});
