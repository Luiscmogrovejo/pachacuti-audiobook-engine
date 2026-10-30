import { test, expect } from '@playwright/test'

test.describe('Art Gallery -- Tiered Access Control', () => {
  test('gallery page loads with title', async ({ page }) => {
    await page.goto('/gallery')
    await expect(page).toHaveTitle(/Galeria.*Arte|Art.*Gallery|Pachacuti/)
    // H1 should show gallery title (bilingual)
    await expect(
      page.locator('h1').filter({ hasText: /Galeria de Arte|Art Gallery/ })
    ).toBeVisible()
  })

  test('at least 10 chapter sections rendered', async ({ page }) => {
    await page.goto('/gallery')
    const sections = page.locator('[data-testid="gallery-chapter-section"]')
    // ch00-ch14 have scenes (minus any empties) = at least 10 sections
    await expect(sections).toHaveCount(15, { timeout: 10_000 }).catch(async () => {
      // Flexible: at least 10 chapters should have scenes
      const count = await sections.count()
      expect(count).toBeGreaterThanOrEqual(10)
    })
  })

  test('non-authenticated: shows limited images with locked thumbnails', async ({ page }) => {
    await page.goto('/gallery')
    // Wait for React island hydration + session check to complete
    await page.waitForTimeout(3000)

    // Should have unlocked (gallery-image) thumbnails -- 1 per chapter
    const unlockedImages = page.locator('[data-testid="gallery-image"]')
    await expect(unlockedImages.first()).toBeVisible({ timeout: 8000 })
    const unlockedCount = await unlockedImages.count()
    expect(unlockedCount).toBeGreaterThan(0)

    // Should also have locked thumbnails
    const lockedImages = page.locator('[data-testid="gallery-image-locked"]')
    const lockedCount = await lockedImages.count()
    expect(lockedCount).toBeGreaterThan(0)

    // Locked count should be much larger than unlocked (most images are locked)
    expect(lockedCount).toBeGreaterThan(unlockedCount)
  })

  test('non-authenticated: sign up CTA visible', async ({ page }) => {
    await page.goto('/gallery')
    await page.waitForTimeout(2000)

    // Look for the unlock CTA
    const ctaText = page.locator('text=/Unlock the Full Gallery|Desbloquea la Galeria/')
    await expect(ctaText).toBeVisible({ timeout: 5000 })

    // Sign up button should be visible
    const signUpBtn = page.locator('a[href="/auth/signin"]').filter({ hasText: /Sign Up|Registrate/ })
    await expect(signUpBtn).toBeVisible()
  })

  test('non-authenticated: 3 main trio portraits visible', async ({ page }) => {
    await page.goto('/gallery')
    await page.waitForTimeout(2000)

    // Character portraits section should exist
    const portraitSection = page.locator('text=/Character Portraits|Retratos de Personajes/')
    await expect(portraitSection).toBeVisible({ timeout: 5000 })

    // Main trio portraits (Cusi, Rumi, Naymlap) should be visible as links
    const trioLinks = page.locator('a[href*="/characters/cusi"], a[href*="/characters/rumi"], a[href*="/characters/naymlap"]')
    const trioCount = await trioLinks.count()
    expect(trioCount).toBeGreaterThanOrEqual(3)
  })

  test('thumbnails have loaded images', async ({ page }) => {
    await page.goto('/gallery')
    await page.waitForTimeout(2000)
    const images = page.locator('[data-testid="gallery-image"] img')
    const count = await images.count()
    expect(count).toBeGreaterThan(0)

    // Verify first 5 images have loaded (naturalWidth > 0)
    const checkCount = Math.min(5, count)
    for (let i = 0; i < checkCount; i++) {
      const img = images.nth(i)
      await img.scrollIntoViewIfNeeded()
      // Wait for lazy load
      await expect(img).toHaveJSProperty('complete', true, { timeout: 10_000 })
      const width = await img.evaluate((el: HTMLImageElement) => el.naturalWidth)
      expect(width).toBeGreaterThan(0)
    }
  })

  test('click unlocked thumbnail opens lightbox', async ({ page }) => {
    await page.goto('/gallery')
    // Wait for React island hydration + session check
    await page.waitForTimeout(3000)

    // Click the first unlocked thumbnail (GalleryIsland dispatches gallery:open)
    const firstThumb = page.locator('[data-testid="gallery-image"]').first()
    await firstThumb.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500) // Ensure scroll completes
    await firstThumb.click()

    // Lightbox should appear
    const lightbox = page.locator('[data-testid="gallery-lightbox"]')
    await expect(lightbox).toBeVisible({ timeout: 8000 })

    // Lightbox image should be visible
    const lightboxImg = page.locator('[data-testid="gallery-lightbox-image"]')
    await expect(lightboxImg).toBeVisible()
  })

  test('Escape closes lightbox', async ({ page }) => {
    await page.goto('/gallery')
    await page.waitForTimeout(2000)

    // Open lightbox
    const firstThumb = page.locator('[data-testid="gallery-image"]').first()
    await firstThumb.scrollIntoViewIfNeeded()
    await firstThumb.click({ force: true })
    const lightbox = page.locator('[data-testid="gallery-lightbox"]')
    await expect(lightbox).toBeVisible({ timeout: 5000 })

    // Press Escape
    await page.keyboard.press('Escape')

    // Lightbox should close
    await expect(lightbox).not.toBeVisible({ timeout: 3000 })
  })

  test('mobile 2-col grid verification', async ({ page }) => {
    // Use mobile viewport (375px from Pixel 5 config)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/gallery')
    await page.waitForTimeout(2000)

    // First grid in the first chapter section
    const grid = page.locator('[data-testid="gallery-chapter-section"]').first().locator('.grid')
    await expect(grid).toBeVisible()

    // Verify grid has grid-cols-2 class (mobile default)
    const hasGridCols2 = await grid.evaluate((el) => {
      return el.classList.contains('grid-cols-2')
    })
    expect(hasGridCols2).toBe(true)
  })

  test('copyright watermark visible', async ({ page }) => {
    await page.goto('/gallery')
    await page.waitForTimeout(2000)
    // Check that the gallery-watermark CSS class is applied and produces ::after content
    const watermarkElement = page.locator('.gallery-watermark').first()
    await expect(watermarkElement).toBeVisible()

    // Verify the ::after pseudo-element has PACHACUTI text
    const afterContent = await watermarkElement.evaluate((el) => {
      return window.getComputedStyle(el, '::after').content
    })
    expect(afterContent).toContain('PACHACUTI')
  })

  test('gallery link in navigation', async ({ page }) => {
    // Set desktop viewport before navigating so links render visible
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/gallery')
    // Gallery link should exist in the nav (visible on desktop, hidden on mobile)
    const galleryLink = page.locator('nav a[href="/gallery"]')
    // On desktop it should be visible; on mobile it exists but is hidden
    const count = await galleryLink.count()
    expect(count).toBeGreaterThan(0)
  })
})
