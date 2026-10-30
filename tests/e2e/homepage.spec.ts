import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Pachacuti/)
  })

  test('hero section shows PACHACUTI heading and Start Listening CTA', async ({ page }) => {
    await page.goto('/')
    // Hero h1 text
    await expect(page.locator('h1').filter({ hasText: 'PACHACUTI' })).toBeVisible()
    // Start Listening CTA link inside the hero section
    // Use the hero section (min-h-screen) that contains the h1
    const heroSection = page.locator('section').filter({ has: page.locator('h1') }).first()
    await expect(heroSection.locator('a[href="/listen/prologue"]')).toBeVisible()
  })

  test('navigation bar has wordmark and key links', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
    // Wordmark
    await expect(nav.locator('a[href="/"]').filter({ hasText: 'PACHACUTI' })).toBeVisible()
    // Nav links exist (desktop visible + mobile overlay copies)
    await expect(nav.locator('a[href="/characters"]').first()).toBeAttached()
    await expect(nav.locator('a[href="/glossary"]').first()).toBeAttached()
    await expect(nav.locator('a[href="/quiz"]').first()).toBeAttached()
    await expect(nav.locator('a[href="/gallery"]').first()).toBeAttached()
    // Map link removed (07.8-01); Sign In is now a gold CTA button
    await expect(nav.locator('a[href="/auth/signin"]').first()).toBeAttached()
  })

  test('dark mode background is active', async ({ page }) => {
    await page.goto('/')
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor
    })
    // bg-volcanic (#1a0800) = rgb(26, 8, 0) -- all values should be < 50
    const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) {
      expect(parseInt(match[1])).toBeLessThan(50)
      expect(parseInt(match[2])).toBeLessThan(50)
      expect(parseInt(match[3])).toBeLessThan(50)
    }
  })

  test('chapter teaser section is present', async ({ page }) => {
    await page.goto('/')
    // "El Viaje" / "The Journey" heading (bilingual, exact match to avoid matching footer CTA)
    const journeyHeading = page.getByRole('heading', { name: /El Viaje|The Journey/, exact: true })
    await expect(journeyHeading).toBeAttached()
  })

  test('chapter teasers link to listen pages', async ({ page }) => {
    await page.goto('/')
    // Multiple links to prologue exist (hero CTA, chapter teaser, footer CTA)
    const prologueLinks = page.locator('a[href="/listen/prologue"]')
    const count = await prologueLinks.count()
    expect(count).toBeGreaterThanOrEqual(2) // At least hero CTA + chapter teaser
  })

  test('footer CTA section shows journey heading', async ({ page }) => {
    await page.goto('/')
    // Bilingual: "Comienza el Viaje" (es) or "Begin the Journey" (en)
    const ctaHeading = page.getByRole('heading', { name: /Comienza el Viaje|Begin the Journey/ })
    await expect(ctaHeading).toBeAttached()
  })

  test('copyright footer is present', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
    await expect(footer).toContainText('2026')
  })

  test('no horizontal overflow on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // 1px tolerance
  })
})
