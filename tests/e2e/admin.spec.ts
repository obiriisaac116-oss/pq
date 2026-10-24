// tests/e2e/admin.spec.ts
//
// E2E smoke tests for the admin area.
// Verifies that unauthenticated access to /admin/papers redirects to /login
// and that the login form renders correctly.

import { test, expect } from '@playwright/test'

test.describe('Admin auth guard', () => {
  test('navigating to /admin/papers redirects to /login', async ({ page }) => {
    await page.goto('/admin/papers')
    // Middleware should redirect unauthenticated users to /login
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page renders email input', async ({ page }) => {
    await page.goto('/login')
    const emailInput = page
      .locator('[type="email"], [name="email"], [id="email"], [aria-label*="email" i]')
      .first()
    await expect(emailInput).toBeVisible()
  })

  test('login page renders password input', async ({ page }) => {
    await page.goto('/login')
    const passwordInput = page
      .locator('[type="password"], [name="password"], [id="password"], [aria-label*="password" i]')
      .first()
    await expect(passwordInput).toBeVisible()
  })

  test('login page renders a submit button', async ({ page }) => {
    await page.goto('/login')
    const submitButton = page
      .locator('[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Log in")')
      .first()
    await expect(submitButton).toBeVisible()
  })
})
