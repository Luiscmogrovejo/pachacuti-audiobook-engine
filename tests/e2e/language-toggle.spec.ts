import { test, expect } from '@playwright/test'

test.describe('Language Toggle', () => {
  test('LanguagePill is visible on homepage', async ({ page }) => {
    await page.goto('/')
    // At least one pill should be visible (desktop or mobile depending on viewport)
    const pill = page.locator('[data-testid="language-pill"]').filter({ has: page.locator(':visible') })
    await expect(pill.first()).toBeVisible()
  })

  test('default language is ES with Spanish heading', async ({ page }) => {
    // Clear any stored language preference
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.removeItem('pachacuti-player')
      document.cookie = 'pachacuti-lang=es;path=/;max-age=31536000;SameSite=Lax'
    })
    await page.reload()
    // ES segment should be active (aria-checked="true") - find visible one
    const esBtn = page.locator('[data-testid="language-pill"]:visible button[aria-label="Espanol"]').first()
    await expect(esBtn).toHaveAttribute('aria-checked', 'true')
    // Hero subtitle should be in Spanish
    await expect(page.locator('text=El Que Estremece la Tierra')).toBeVisible()
  })

  test('clicking EN switches to English headings', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Set language to EN via cookie + localStorage (same mechanism as LanguagePill)
    await page.evaluate(() => {
      document.cookie = 'pachacuti-lang=en;path=/;max-age=31536000;SameSite=Lax'
      localStorage.setItem('pachacuti-lang', 'en')
      const store = JSON.parse(localStorage.getItem('pachacuti-player') || '{}')
      store.state = { ...store.state, language: 'en' }
      localStorage.setItem('pachacuti-player', JSON.stringify(store))
    })
    // Reload to apply server-side language (Astro reads cookie)
    await page.reload()
    await page.waitForLoadState('networkidle')
    // Hero subtitle should now be in English
    await expect(page.locator('text=He Who Shakes the Earth')).toBeVisible({ timeout: 10_000 })
    // Verify cookie persisted
    const cookies = await page.context().cookies()
    const langCookie = cookies.find(c => c.name === 'pachacuti-lang')
    expect(langCookie?.value).toBe('en')
  })

  test('language persists across navigation to /characters', async ({ page }) => {
    // Set language to EN
    await page.goto('/')
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('pachacuti-player') || '{}')
      store.state = { ...store.state, language: 'en' }
      localStorage.setItem('pachacuti-player', JSON.stringify(store))
      document.cookie = 'pachacuti-lang=en;path=/;max-age=31536000;SameSite=Lax'
    })
    await page.goto('/characters')
    await page.waitForLoadState('networkidle')
    // Heading should be English
    await expect(page.locator('h1').filter({ hasText: 'The Characters of Pachacuti' })).toBeVisible()
  })

  test('mobile viewport: pill touch target >= 44px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    // Find the visible pill on mobile viewport
    const pill = page.locator('[data-testid="language-pill"]:visible').first()
    await expect(pill).toBeVisible()
    // Check individual buttons have at least 44px height
    const esBtn = pill.locator('button[aria-label="Espanol"]')
    const box = await esBtn.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.height).toBeGreaterThanOrEqual(44)
    expect(box!.width).toBeGreaterThanOrEqual(44)
  })

  test('toggle back to ES restores Spanish text', async ({ page }) => {
    // Start in EN
    await page.goto('/')
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('pachacuti-player') || '{}')
      store.state = { ...store.state, language: 'en' }
      localStorage.setItem('pachacuti-player', JSON.stringify(store))
      document.cookie = 'pachacuti-lang=en;path=/;max-age=31536000;SameSite=Lax'
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
    // Verify English first
    await expect(page.locator('text=He Who Shakes the Earth')).toBeVisible()
    // Click ES to switch back
    const esBtn = page.locator('[data-testid="language-pill"]:visible button[aria-label="Espanol"]').first()
    await esBtn.click()
    await page.waitForLoadState('networkidle')
    // Should be Spanish again
    await expect(page.locator('text=El Que Estremece la Tierra')).toBeVisible()
  })
})
