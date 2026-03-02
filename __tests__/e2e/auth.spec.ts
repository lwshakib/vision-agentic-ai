import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test('should load the sign-in page', async ({ page }) => {
    await page.goto('/sign-in')

    // Check for the heading "Sign In to Vision Agentic AI"
    await expect(page.locator('h1')).toContainText('Sign In to Vision Agentic AI')
    
    // Check for Email and Password labels
    await expect(page.locator('label[for="email"]')).toBeVisible()
    await expect(page.locator('label[for="pwd"]')).toBeVisible()
    
    // Check for the Sign In button
    await expect(page.locator('button[type="submit"]')).toContainText('Sign In')
  })

  test('should redirect unauthenticated users from home to sign-in', async ({ page }) => {
    await page.goto('/')
    // Playwright should follow the redirect
    await expect(page).toHaveURL(/.*sign-in.*/)
    await expect(page.locator('h1')).toContainText('Sign In to Vision Agentic AI')
  })
})
