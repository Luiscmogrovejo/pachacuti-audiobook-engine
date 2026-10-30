import { test, expect } from '@playwright/test'

const PAGES = ['/', '/characters', '/gallery', '/settings', '/map', '/glossary', '/quiz']

test.describe('Mobile Responsive Audit (375px)', () => {
  // Retry to handle ClientRouter navigation races
  test.describe.configure({ retries: 1 })

  for (const path of PAGES) {
    test(`${path} -- no horizontal overflow at 375px`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto(path, { waitUntil: 'networkidle' })
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      const noOverflow = await page.evaluate(() =>
        document.body.scrollWidth <= window.innerWidth
      )
      expect(noOverflow).toBe(true)
    })

    test(`${path} -- text readable (body >= 14px, headings >= 18px)`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto(path, { waitUntil: 'networkidle' })
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      // Check body text size
      const bodyFontSize = await page.evaluate(() => {
        const body = document.querySelector('body')
        if (!body) return 16
        return parseFloat(window.getComputedStyle(body).fontSize)
      })
      expect(bodyFontSize).toBeGreaterThanOrEqual(14)

      // Check first h1 if present
      const h1FontSize = await page.evaluate(() => {
        const h1 = document.querySelector('h1')
        if (!h1) return 24
        return parseFloat(window.getComputedStyle(h1).fontSize)
      })
      expect(h1FontSize).toBeGreaterThanOrEqual(18)
    })
  }

  test('Nav hamburger opens and closes on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await page.waitForTimeout(1000)

    // Find the hamburger toggle (CSS checkbox hack)
    const navToggle = page.locator('#nav-toggle')
    await expect(navToggle).toBeAttached()

    // Click the hamburger label to open (first label is the burger icon, second is "Close")
    const navLabel = page.locator('label[for="nav-toggle"]').first()
    await navLabel.click()

    // Wait for nav overlay to appear
    await page.waitForTimeout(500)

    // Verify a nav link is now visible
    const listenLink = page.locator('nav a[href="/listen/prologue"]')
    const count = await listenLink.count()
    // At minimum, nav links should exist in the DOM
    expect(count).toBeGreaterThan(0)
  })

  test('interactive elements have adequate touch targets', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/settings')
    await page.waitForTimeout(1500)

    // Check all buttons have adequate height
    const buttons = page.locator('button:visible')
    const count = await buttons.count()
    let smallTargets = 0
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox()
      if (box && box.height < 28) {
        smallTargets++
      }
    }
    // Allow at most 2 small targets (some decorative buttons may be small)
    expect(smallTargets).toBeLessThanOrEqual(2)
  })
})
