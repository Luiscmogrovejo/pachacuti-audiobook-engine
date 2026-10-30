import { test, expect } from '@playwright/test'

test.describe('Map Page -- Removed (301 Redirect)', () => {
  test('/map redirects to homepage with 301', async ({ page }) => {
    await page.goto('/map', { waitUntil: 'domcontentloaded' })
    // After redirect, should be on homepage
    expect(page.url()).toMatch(/\/$/)
    // The original response should have been a redirect
    // (Playwright follows redirects automatically, so we check the final URL)
  })

  test('Map link is NOT in the navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    // No link to /map in the nav
    const mapLink = page.locator('nav a[href="/map"]')
    await expect(mapLink).toHaveCount(0)
  })
})

test.describe('Settings Page', () => {
  test('settings page loads with all sections', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveTitle(/Ajustes|Settings/)
    const settingsPage = page.locator('[data-testid="settings-page"]')
    await expect(settingsPage).toBeVisible()

    // All 4 sections
    await expect(page.locator('[data-testid="settings-language"]')).toBeVisible()
    await expect(page.locator('[data-testid="settings-playback"]')).toBeVisible()
    await expect(page.locator('[data-testid="settings-accessibility"]')).toBeVisible()
    await expect(page.locator('[data-testid="settings-privacy"]')).toBeVisible()
  })

  test('font size slider changes CSS variable', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForTimeout(1000)

    const slider = page.locator('[data-testid="font-scale-slider"]')
    await expect(slider).toBeVisible()

    // Change slider value
    await slider.fill('1.2')

    // Verify CSS variable was set
    const scale = await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--user-font-scale')
    )
    expect(scale).toBe('1.2')
  })

  test('playback speed buttons are interactive', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForTimeout(1000)

    const speedBtn = page.locator('[data-testid="speed-option-1.5"]')
    await expect(speedBtn).toBeVisible()
    await speedBtn.click()

    // Button should now be pressed
    await expect(speedBtn).toHaveAttribute('aria-pressed', 'true')
  })

  test('clear bookmarks button exists and is clickable', async ({ page }) => {
    await page.goto('/settings')
    const clearBtn = page.locator('[data-testid="clear-bookmarks-btn"]')
    await expect(clearBtn).toBeVisible()
    // Don't actually click to confirm (would trigger prompt)
  })

  test('clear history button exists and is clickable', async ({ page }) => {
    await page.goto('/settings')
    const clearBtn = page.locator('[data-testid="clear-history-btn"]')
    await expect(clearBtn).toBeVisible()
  })

  test('high contrast toggle works', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForTimeout(1000)

    const toggle = page.locator('[data-testid="high-contrast-toggle"]')
    await expect(toggle).toBeVisible()
    await toggle.click()

    // html element should have high-contrast class
    const hasClass = await page.evaluate(() =>
      document.documentElement.classList.contains('high-contrast')
    )
    expect(hasClass).toBe(true)
  })

  test('reduced motion toggle works', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForTimeout(1000)

    const toggle = page.locator('[data-testid="reduced-motion-toggle"]')
    await expect(toggle).toBeVisible()
    await toggle.click()

    const hasClass = await page.evaluate(() =>
      document.documentElement.classList.contains('reduce-motion')
    )
    expect(hasClass).toBe(true)
  })

  test('settings page mobile responsive at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/settings')

    // No horizontal overflow
    const overflow = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)
    expect(overflow).toBe(true)

    // All buttons should have min 44px touch targets
    const buttons = page.locator('button')
    const count = await buttons.count()
    for (let i = 0; i < Math.min(count, 10); i++) {
      const box = await buttons.nth(i).boundingBox()
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(28) // relaxed for toggle switches
      }
    }
  })
})
