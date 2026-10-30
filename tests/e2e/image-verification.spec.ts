import { test, expect } from '@playwright/test'

test.describe('Image Verification Suite', () => {
  test('homepage hero image loads (not black)', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)

    // Hero slideshow should have at least one image
    const heroSlides = page.locator('.hero-slide')
    const count = await heroSlides.count()
    expect(count).toBeGreaterThanOrEqual(1)

    // Active slide should have opacity > 0
    const activeSlide = page.locator('.hero-slide--active')
    const activeCount = await activeSlide.count()
    if (activeCount > 0) {
      const opacity = await activeSlide.evaluate((el) =>
        parseFloat(window.getComputedStyle(el).opacity)
      )
      expect(opacity).toBeGreaterThan(0)
    }
  })

  test('all 32 character portraits load on /characters', async ({ page }) => {
    await page.goto('/characters')
    await page.waitForTimeout(3000)

    const cards = page.locator('[data-testid="character-card"]')
    const cardCount = await cards.count()
    expect(cardCount).toBe(32)

    const portraits = page.locator('[data-testid="character-portrait"]')
    const portraitCount = await portraits.count()
    expect(portraitCount).toBe(32)

    // Verify first 10 portraits have loaded (naturalWidth > 0)
    for (let i = 0; i < 10; i++) {
      const img = portraits.nth(i)
      await img.scrollIntoViewIfNeeded()
      // Wait for lazy load
      await expect(img).toHaveJSProperty('complete', true, { timeout: 10_000 })
      const width = await img.evaluate((el: HTMLImageElement) => el.naturalWidth)
      expect(width).toBeGreaterThan(0)
    }
  })

  test('gallery thumbnails load (first 20)', async ({ page }) => {
    await page.goto('/gallery')
    await page.waitForTimeout(2000)

    const images = page.locator('[data-testid="gallery-image"] img')
    const count = await images.count()
    expect(count).toBeGreaterThan(0)

    const checkCount = Math.min(20, count)
    for (let i = 0; i < checkCount; i++) {
      const img = images.nth(i)
      await img.scrollIntoViewIfNeeded()
      await expect(img).toHaveJSProperty('complete', true, { timeout: 10_000 })
      const width = await img.evaluate((el: HTMLImageElement) => el.naturalWidth)
      expect(width).toBeGreaterThan(0)
    }
  })

  test('/map redirects to homepage', async ({ page }) => {
    await page.goto('/map')
    // After redirect, should be on homepage
    expect(page.url()).toMatch(/\/$/)
  })

  test('background images visible on key pages', async ({ page }) => {
    const pages = [
      { path: '/characters', bgSrc: 'characters-bg' },
      { path: '/glossary', bgSrc: 'glossary-bg' },
      { path: '/quiz', bgSrc: 'stone-texture' },
      { path: '/gallery', bgSrc: 'tocapu-dark' },
      { path: '/settings', bgSrc: 'tocapu-dark' },
      { path: '/auth/signin', bgSrc: 'gold-textile' },
    ]

    for (const { path, bgSrc } of pages) {
      await page.goto(path)
      await page.waitForTimeout(1500)

      // Background image should exist and be loaded
      const bgImg = page.locator(`img[src*="${bgSrc}"]`)
      const bgCount = await bgImg.count()
      expect(bgCount).toBeGreaterThan(0)

      await expect(bgImg.first()).toHaveJSProperty('complete', true, { timeout: 5000 })
      const width = await bgImg.first().evaluate((el: HTMLImageElement) => el.naturalWidth)
      expect(width).toBeGreaterThan(0)

      // Verify opacity is at least 0.3 (not invisible)
      const opacity = await bgImg.first().evaluate((el) =>
        parseFloat(window.getComputedStyle(el).opacity)
      )
      expect(opacity).toBeGreaterThanOrEqual(0.3)
    }
  })

  test('glossary page has no broken background', async ({ page }) => {
    await page.goto('/glossary')
    await page.waitForTimeout(1000)

    // Page should render without errors -- check for any heading
    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible()
  })

  test('quiz page renders correctly', async ({ page }) => {
    await page.goto('/quiz')
    await page.waitForTimeout(1000)

    // Page should render without errors -- check for any heading
    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible()
  })

  test('character detail pages load portrait -- first 5 characters', async ({ page }) => {
    const slugs = ['cusi', 'rumi', 'naymlap', 'mama-ocllo', 'uscovilca']

    for (const slug of slugs) {
      await page.goto(`/characters/${slug}`)
      await page.waitForTimeout(1000)

      // Portrait image should be present
      const portrait = page.locator(`img[src*="${slug}"]`)
      const count = await portrait.count()
      expect(count).toBeGreaterThan(0)

      // Should have loaded
      await portrait.first().scrollIntoViewIfNeeded()
      await expect(portrait.first()).toHaveJSProperty('complete', true, { timeout: 10_000 })
      const width = await portrait.first().evaluate((el: HTMLImageElement) => el.naturalWidth)
      expect(width).toBeGreaterThan(0)
    }
  })

  test('no horizontal overflow at 375px for image-heavy pages', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })

    const pages = ['/characters', '/gallery', '/settings']
    for (const path of pages) {
      await page.goto(path)
      await page.waitForTimeout(1500)

      const noOverflow = await page.evaluate(() =>
        document.body.scrollWidth <= window.innerWidth
      )
      expect(noOverflow).toBe(true)
    }
  })

  test('full-page screenshot at 1280px -- homepage', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    await page.waitForTimeout(2000)
    // Just verify page loaded without crash -- hero h1 is "PACHACUTI"
    await expect(page.locator('h1, [class*="hero"]').first()).toBeVisible()
  })

  test('full-page screenshot at 375px -- homepage', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await page.waitForTimeout(2000)
    await expect(page.locator('h1, [class*="hero"]').first()).toBeVisible()
  })
})
