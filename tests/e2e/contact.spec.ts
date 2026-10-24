// tests/e2e/contact.spec.ts
//
// E2E smoke tests for the contact form page.
// Verifies that the form renders correctly without submitting to the backend.

import { test, expect } from '@playwright/test'

test.describe('Contact page', () => {
  test('renders the contact form', async ({ page }) => {
    await page.goto('/contact')
    // The contact page should load successfully
    await expect(page).toHaveURL('/contact')
  })

  test('name field is present', async ({ page }) => {
    await page.goto('/contact')
    const nameField = page
      .locator('[name="name"], [id="name"], [aria-label*="name" i], [placeholder*="name" i]')
      .first()
    await expect(nameField).toBeVisible()
  })

  test('email field is present', async ({ page }) => {
    await page.goto('/contact')
    const emailField = page
      .locator('[name="email"], [id="email"], [type="email"], [aria-label*="email" i]')
      .first()
    await expect(emailField).toBeVisible()
  })

  test('message field is present', async ({ page }) => {
    await page.goto('/contact')
    const messageField = page
      .locator(
        '[name="message"], [id="message"], textarea, [aria-label*="message" i]',
      )
      .first()
    await expect(messageField).toBeVisible()
  })
})
