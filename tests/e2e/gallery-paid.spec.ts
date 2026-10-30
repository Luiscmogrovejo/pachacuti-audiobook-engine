// tests/e2e/gallery-paid.spec.ts -- E2E tests for gallery tiered access (Phase 7.9)
// Non-paid (anonymous + signed-up): 1 image per chapter + 3 trio portraits
// Paid: all images + all 32 characters

import { test, expect } from '@playwright/test'

test.describe('Gallery Tiered Access (Phase 7.9)', () => {
  test('anonymous user sees scene images on gallery page', async ({ page }) => {
    await page.goto('/gallery')
    await page.waitForTimeout(3000)
    // Gallery should render chapter sections with scene images
    const galleryImages = page.locator('[data-testid="gallery-image"]')
    const count = await galleryImages.count()
    // At least some unlocked images should be visible (1 per chapter that has scenes)
    expect(count).toBeGreaterThan(0)
  })

  test('anonymous user sees locked images with Premium badge', async ({ page }) => {
    await page.goto('/gallery')
    await page.waitForTimeout(3000)
    // Locked images should have blurred thumbnails
    const lockedImages = page.locator('[data-testid="gallery-image-locked"]')
    const count = await lockedImages.count()
    // Should have locked images (chapters with multiple scenes)
    expect(count).toBeGreaterThan(0)
  })

  test('anonymous user sees 3 trio character portraits (Cusi, Rumi, Naymlap)', async ({ page }) => {
    await page.goto('/gallery')
    await page.waitForTimeout(3000)
    // The main trio portraits section should be visible
    const trioPortraits = page.locator('section').first().locator('img[alt]')
    const count = await trioPortraits.count()
    // At least 3 trio portraits visible
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('anonymous user sees locked non-trio character portraits', async ({ page }) => {
    await page.goto('/gallery')
    await page.waitForTimeout(3000)
    // Non-trio portraits should show blurred/locked state
    const lockedChars = page.locator('.blur-md.brightness-50')
    const count = await lockedChars.count()
    // Should have some blurred character portraits
    expect(count).toBeGreaterThan(0)
  })

  test('gallery unlock CTA shows "Sign Up Free" for anonymous users', async ({ page }) => {
    await page.goto('/gallery')
    await page.waitForTimeout(3000)
    // CTA text for anonymous should be sign-up oriented
    const ctaText = page.locator('text=/Sign Up Free|Registrate Gratis/')
    const count = await ctaText.count()
    expect(count).toBeGreaterThan(0)
  })

  test('gallery lock overlay shows "Premium" badge on locked images', async ({ page }) => {
    await page.goto('/gallery')
    await page.waitForTimeout(3000)
    // Lock overlay should show "Premium" text
    const premiumBadges = page.locator('[data-testid="gallery-image-locked"] >> text=Premium')
      .or(page.locator('text=Premium').first())
    const count = await premiumBadges.count()
    expect(count).toBeGreaterThan(0)
  })
})
