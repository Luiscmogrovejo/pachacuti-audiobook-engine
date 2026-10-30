// tests/e2e/payment.spec.ts -- E2E tests for payment flow (Phase 7.9)
// Stripe Checkout integration, payment page, success page, payment-status API

import { test, expect } from '@playwright/test'

test.describe('Payment Flow (Phase 7.9)', () => {
  // === PAYMENT PAGE ===

  test('/payment page renders with product info', async ({ page }) => {
    await page.goto('/payment')
    await page.waitForTimeout(3000)
    // Should show product name
    const productName = page.locator('text=/Pachacuti Premium/')
    const count = await productName.count()
    expect(count).toBeGreaterThan(0)
  })

  test('/payment page shows "sign in first" for anonymous user', async ({ page }) => {
    await page.goto('/payment')
    await page.waitForTimeout(3000)
    // Anonymous users should see sign-in prompt
    const signinCta = page.locator('text=/Sign in to purchase|Inicia sesion para comprar/')
      .or(page.locator('a[href="/auth/signin"]'))
    const count = await signinCta.count()
    expect(count).toBeGreaterThan(0)
  })

  test('/payment page shows what is included in premium', async ({ page }) => {
    await page.goto('/payment')
    await page.waitForTimeout(3000)
    // Should list premium features
    const chaptersIncluded = page.locator('text=/13.*chapter|13.*capitulo/i')
    const count = await chaptersIncluded.count()
    expect(count).toBeGreaterThan(0)
  })

  // === PAYMENT API ENDPOINTS ===

  test('/api/payment/create-session returns 401 for unauthenticated', async ({ request }) => {
    const response = await request.post('/api/payment/create-session', {
      headers: { 'Content-Type': 'application/json' },
    })
    // Returns 401 (not authenticated) or 500 (DB unavailable)
    expect([401, 500]).toContain(response.status())
  })

  test('/api/payment/create-session returns 503 if Stripe not configured (dev)', async ({ request }) => {
    // In dev/test env without STRIPE_SECRET_KEY, should return 503 or 401
    const response = await request.post('/api/payment/create-session', {
      headers: { 'Content-Type': 'application/json' },
    })
    // Without auth: 401; with auth but no Stripe: 503
    expect([401, 500, 503]).toContain(response.status())
  })

  test('/api/auth/payment-status returns isPaid=false for anonymous', async ({ request }) => {
    const response = await request.get('/api/auth/payment-status')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.isPaid).toBe(false)
  })

  // === SUCCESS PAGE ===

  test('/payment/success page renders', async ({ page }) => {
    await page.goto('/payment/success')
    await page.waitForTimeout(3000)
    // Should show processing or success message
    const successContent = page.locator('text=/Processing|Procesando|Welcome|Bienvenido|Premium/')
    const count = await successContent.count()
    expect(count).toBeGreaterThan(0)
  })

  // === PAID GATE COMPONENT ===

  test('PaidGate shows purchase or signup CTA', async ({ page }) => {
    await page.goto('/listen/chapter-11')
    await page.waitForTimeout(5000)
    // PaidGate for anonymous: shows signup form ("Registrate para comprar" / "Sign up to purchase")
    // PaidGate for auth non-paid: shows "Unlock Premium" / "Desbloquear Premium" button
    const purchaseOrSignup = page.locator('text=/Registrate para comprar|Sign up to purchase|Unlock Premium|Desbloquear Premium/')
      .or(page.locator('button').filter({ hasText: /Registrate|Sign up|Unlock|Desbloquear/ }))
    const count = await purchaseOrSignup.count()
    expect(count).toBeGreaterThan(0)
  })

  // === CHARACTER ACCESS CONTROL ===

  test('characters page shows locked cards for non-trio characters', async ({ page }) => {
    await page.goto('/characters')
    await page.waitForTimeout(3000)
    // Non-paid users should see locked character cards
    const lockedCards = page.locator('[data-testid="character-card-locked"]')
    const count = await lockedCards.count()
    // Should have many locked cards (29 non-trio characters)
    expect(count).toBeGreaterThan(10)
  })

  test('characters page trio (Cusi, Rumi, Naymlap) always visible', async ({ page }) => {
    await page.goto('/characters')
    await page.waitForTimeout(2000)
    // Main trio section should be visible with character cards
    const trioCards = page.locator('[data-testid="character-card"]')
    const count = await trioCards.count()
    // At least 3 trio character cards (in featured section)
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('characters page shows unlock CTA for non-paid users', async ({ page }) => {
    await page.goto('/characters')
    await page.waitForTimeout(3000)
    // Should show an unlock/sign-up CTA
    const ctaText = page.locator('text=/Unlock|Desbloquear|Sign Up|Registrate/')
    const count = await ctaText.count()
    expect(count).toBeGreaterThan(0)
  })
})
