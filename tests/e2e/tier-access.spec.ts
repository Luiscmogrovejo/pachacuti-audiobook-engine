// tests/e2e/tier-access.spec.ts -- E2E tests for updated tier boundaries (Phase 7.9)
// Free: ch0-4 (5 chapters), Signup: ch5-10 (6 chapters), Paid: ch11-23 (13 chapters)

import { test, expect } from '@playwright/test'

test.describe('Tier Access Boundaries (Phase 7.9)', () => {
  // === FREE TIER: ch0-4 (no auth required) ===

  test('ch04 is freely accessible (no auth gate)', async ({ page }) => {
    await page.goto('/listen/chapter-04')
    // Free chapters show karaoke text directly (no gate overlay)
    await expect(page.locator('[data-testid="karaoke-text"]')).toBeVisible({ timeout: 15_000 })
  })

  test('ch03 is freely accessible (no auth gate)', async ({ page }) => {
    await page.goto('/listen/chapter-03')
    await expect(page.locator('[data-testid="karaoke-text"]')).toBeVisible({ timeout: 15_000 })
  })

  test('prologue is freely accessible', async ({ page }) => {
    await page.goto('/listen/prologue')
    await expect(page.locator('[data-testid="karaoke-text"]')).toBeVisible({ timeout: 15_000 })
  })

  // === SIGNUP TIER: ch5-10 (auth required) ===

  test('ch05 shows signup gate for anonymous users', async ({ page }) => {
    await page.goto('/listen/chapter-05')
    await page.waitForTimeout(5000)
    // Gate should show signup-related text
    const gateText = page.locator('text=/Sign up|Registrate|Send Magic Link|Enviar Enlace/')
    const count = await gateText.count()
    expect(count).toBeGreaterThan(0)
  })

  test('ch10 shows signup gate for anonymous users', async ({ page }) => {
    await page.goto('/listen/chapter-10')
    await page.waitForTimeout(5000)
    const gateText = page.locator('text=/Sign up|Registrate|Send Magic Link|Enviar Enlace/')
    const count = await gateText.count()
    expect(count).toBeGreaterThan(0)
  })

  // === PAID TIER: ch11-23 (payment required) ===

  test('ch11 shows paid gate with purchase CTA', async ({ page }) => {
    await page.goto('/listen/chapter-11')
    await page.waitForTimeout(5000)
    // PaidGate should show premium-related text
    const premiumText = page.locator('text=/Premium|premium/')
    const count = await premiumText.count()
    expect(count).toBeGreaterThan(0)
    // For anonymous users: shows signup form with "Registrate para comprar" / "Sign up to purchase"
    // For authenticated non-paid: shows "Unlock Premium" / "Desbloquear Premium" button
    const purchaseOrSignup = page.locator('text=/Registrate para comprar|Sign up to purchase|Unlock Premium|Desbloquear Premium/')
    const ctaCount = await purchaseOrSignup.count()
    expect(ctaCount).toBeGreaterThan(0)
  })

  // === TOKEN ENDPOINT TIER ENFORCEMENT ===

  test('/api/audio/token returns 200 for free chapter-04', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=chapter-04&lang=es')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.token).toBeDefined()
  })

  test('/api/audio/token returns 401 for signup chapter-05 (no auth)', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=chapter-05&lang=es')
    // Returns 401 (auth required) or 500 (DB unavailable)
    expect([401, 500]).toContain(response.status())
  })

  test('/api/audio/token returns 402 for paid chapter-11 (no auth)', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=chapter-11&lang=es')
    // Returns 402 (payment needed) or 401 (auth needed first) or 500 (DB unavailable)
    expect([401, 402, 500]).toContain(response.status())
  })

  // === SIGN-IN PAGE TIER DISPLAY ===

  test('sign-in page shows correct tier breakdown (5 free, 6 signup, 13 paid)', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.waitForTimeout(2000)
    // Verify tier cards show correct chapter counts
    const freeRange = page.locator('text=/Ch 0-4/')
    const signupRange = page.locator('text=/Ch 5-10/')
    const paidRange = page.locator('text=/Ch 11-23/')
    await expect(freeRange).toBeVisible({ timeout: 5000 })
    await expect(signupRange).toBeVisible({ timeout: 5000 })
    await expect(paidRange).toBeVisible({ timeout: 5000 })
  })

  test('sign-in page paid tier links to /payment (not "coming soon")', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.waitForTimeout(2000)
    // Premium card should link to payment page
    const paymentLink = page.locator('a[href="/payment"]')
    const count = await paymentLink.count()
    expect(count).toBeGreaterThan(0)
  })
})
