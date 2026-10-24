// tests/e2e/search.spec.ts
//
// E2E smoke tests for the search / home page.
// These are intentionally light: they verify the search UI renders without
// needing live data in the database.

import { test, expect } from '@playwright/test'

test.describe('Home / Search page', () => {
  test('loads the home page', async ({ page }) => {
    await page.goto('/')
    // The page should respond with a 200
    await expect(page).toHaveURL('/')
  })

  test('search input is visible', async ({ page }) => {
    await page.goto('/')
    const searchInput = page.getByRole('searchbox').or(
      page.locator('[aria-label="Search past questions"]'),
    )
    await expect(searchInput).toBeVisible()
  })

  test('filter panel or select elements are present', async ({ page }) => {
    await page.goto('/')
    // Look for either a dedicated filter panel or at least one <select> element
    // that represents a filter (level, year, semester, etc.)
    const filterElements = page
      .locator('select, [role="listbox"], [data-testid="filter-panel"]')
      .first()
    // We just verify at least one filter-style element exists on the page
    await expect(filterElements).toBeAttached()
  })
})
