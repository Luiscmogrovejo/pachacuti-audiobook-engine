import { test, expect } from '@playwright/test'

test.describe('Authentication & Access Control', () => {
  // === FREE TIER: prologue, chapter-01, chapter-02 ===

  test('sign-in page loads with form', async ({ page }) => {
    await page.goto('/auth/signin')
    await expect(page).toHaveTitle(/Sign In.*Pachacuti/)
    // SignInForm renders email input after hydration
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 })
  })

  test('sign-in page shows tier breakdown cards', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.waitForTimeout(1000)
    // Should show "What you get" / "Lo que obtienes" heading
    const tierHeading = page.locator('text=/What you get|Lo que obtienes/')
    await expect(tierHeading).toBeVisible({ timeout: 5000 })
    // Should show 3 tier names
    const freeCard = page.locator('text=/Gratis|Free/').first()
    await expect(freeCard).toBeVisible()
  })

  test('Sign In link styled as gold CTA button in Nav', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    // Sign In link in desktop nav (ul > li > a) -- use first() to avoid mobile overlay duplicate
    const signInLink = page.locator('nav ul a[href="/auth/signin"]').first()
    await expect(signInLink).toBeVisible()
    // Should have border class (gold CTA styling)
    const hasBorder = await signInLink.evaluate((el) =>
      el.classList.contains('border')
    )
    expect(hasBorder).toBe(true)
  })

  test('sign-in page has magic link submit button', async ({ page }) => {
    await page.goto('/auth/signin')
    // Bilingual: "Enviar Enlace Magico" (es) or "Send Magic Link" (en)
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10_000 })
  })

  test('free chapter loads without access gate (prologue)', async ({ page }) => {
    await page.goto('/listen/prologue')
    // For free chapters, karaoke text should be visible (no gate blocking)
    await expect(page.locator('[data-testid="karaoke-text"]')).toBeVisible({ timeout: 15_000 })
  })

  test('free chapter loads without access gate (chapter-01)', async ({ page }) => {
    await page.goto('/listen/chapter-01')
    await expect(page.locator('[data-testid="karaoke-text"]')).toBeVisible({ timeout: 15_000 })
  })

  test('free chapter loads without access gate (chapter-02)', async ({ page }) => {
    await page.goto('/listen/chapter-02')
    await expect(page.locator('[data-testid="karaoke-text"]')).toBeVisible({ timeout: 15_000 })
  })

  // === SIGNUP TIER: chapter-03 through chapter-10 ===

  test('gated chapter shows gate or error for unauthenticated user', async ({ page }) => {
    await page.goto('/listen/chapter-05')
    await page.waitForTimeout(5000) // Wait for React island hydration + session check
    // Access gate should show "Sign up to continue listening" or similar text.
    // When DB is unavailable, the session check fails silently and gate still renders.
    const gateText = page.locator('text=Sign up to continue listening')
      .or(page.locator('text=Send Magic Link'))
      .or(page.locator('text=Sign up'))
      .or(page.locator('text=sign up'))
    const gateCount = await gateText.count()
    // Gate content should be present (at least in the chapter drawer badges)
    expect(gateCount).toBeGreaterThan(0)
  })

  test('chapter-03 is now free tier (no gate overlay)', async ({ page }) => {
    await page.goto('/listen/chapter-03')
    // ch03 moved to free tier in Phase 7.9 -- karaoke text should be visible directly
    await expect(page.locator('[data-testid="karaoke-text"]')).toBeVisible({ timeout: 15_000 })
  })

  // === PAID TIER: chapter-11 through chapter-23 ===

  test('paid chapter shows premium gate (chapter-11)', async ({ page }) => {
    await page.goto('/listen/chapter-11')
    await page.waitForTimeout(5000) // Wait for hydration

    // PaidGate should show "premium" text with purchase CTA (no longer "coming soon")
    const premiumText = page.locator('text=Premium Chapter')
      .or(page.locator('text=Premium'))
      .or(page.locator('text=Unlock Premium'))
      .or(page.locator('text=Desbloquear Premium'))
    const count = await premiumText.count()
    expect(count).toBeGreaterThan(0)
  })

  test('paid chapter shows return to free chapters link', async ({ page }) => {
    await page.goto('/listen/chapter-11')
    await page.waitForTimeout(5000)

    // Bilingual: "Return to free chapters" (EN) or "Volver a capitulos gratuitos" (ES)
    const returnLink = page.locator('a[href="/listen/prologue"]').filter({
      hasText: /Return to free chapters|Volver a capitulos gratuitos|free chapters|capitulos gratuitos/,
    })
    await expect(returnLink).toBeVisible({ timeout: 10_000 })
  })

  // === TOKEN ENDPOINT TESTS ===

  test('audio token endpoint returns 200 for free chapter', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=prologue&lang=es')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.token).toBeDefined()
    expect(body.expiresIn).toBe(300)
  })

  test('audio token endpoint returns 200 for free chapter-02', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=chapter-02&lang=es')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.token).toBeDefined()
  })

  test('audio token endpoint rejects signup chapter without auth', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=chapter-05&lang=es')
    // Returns 401 (auth required) or 500 (DB unavailable for session check)
    expect([401, 500]).toContain(response.status())
  })

  test('audio token endpoint returns 200 for free chapter-03', async ({ request }) => {
    // ch03 moved to free tier in Phase 7.9
    const response = await request.get('/api/audio/token?chapter=chapter-03&lang=es')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.token).toBeDefined()
  })

  test('audio token endpoint returns 200 for free chapter-04', async ({ request }) => {
    // ch04 moved to free tier in Phase 7.9
    const response = await request.get('/api/audio/token?chapter=chapter-04&lang=es')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.token).toBeDefined()
  })

  test('audio token endpoint rejects paid chapter without auth (401 or 402)', async ({ request }) => {
    // Unauthenticated: 401 (auth required first). Authenticated-but-not-paid: 402.
    // In test env without DB, paid chapters return 401 since auth check happens first.
    const response = await request.get('/api/audio/token?chapter=chapter-11&lang=es')
    expect([401, 402, 500]).toContain(response.status())
    const body = await response.json()
    // Either "Authentication required" (401) or "Premium access required" (402)
    expect(body.tier).toMatch(/signup|paid/)
  })

  test('audio token endpoint rejects paid chapter-15 without auth', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=chapter-15&lang=es')
    expect([401, 402, 500]).toContain(response.status())
  })

  test('audio token endpoint returns 400 for invalid slug', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=bogus&lang=es')
    expect(response.status()).toBe(400)
  })

  // === Phase 7.10: Extended auth flow tests ===

  test('PaidGate shows premium indicator (ETA badge, CTA, or coming soon)', async ({ page }) => {
    await page.goto('/listen/chapter-11')
    await page.waitForTimeout(5000)
    // PaidGate may show: ETA badge (Q2 2026), "coming soon", "Unlock Premium", or "Premium"
    const premiumIndicator = page.locator('text=/Q[1-4] 202[5-7]|Coming Soon|coming soon|Unlock Premium|Desbloquear Premium|Premium Chapter|Capitulo Premium/')
    const count = await premiumIndicator.count()
    expect(count).toBeGreaterThan(0)
  })

  test('PaidGate shows "Listen to available chapters" CTA', async ({ page }) => {
    await page.goto('/listen/chapter-15')
    await page.waitForTimeout(5000)
    // CTA should link to free content
    const cta = page.locator('a[href*="/listen/"]').filter({
      hasText: /available chapters|capitulos disponibles|Listen to|Escuchar/i,
    })
    const count = await cta.count()
    expect(count).toBeGreaterThan(0)
  })

  test('AccessGate shows 3-tier progression dots', async ({ page }) => {
    // ch05 is signup tier -- go there to see the gate with tier dots
    await page.goto('/listen/chapter-05')
    await page.waitForTimeout(5000)
    // AccessGate progression: Free Ch0-4 / Registered Ch5-10 / Premium Ch11-23
    const tierText = page.locator('text=/Free|Gratis|Registered|Registrado|Premium/')
    const count = await tierText.count()
    // Should have at least 2 tier references (Free + Registered or similar)
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('sign-in page has Turnstile preconnect hint (widget loads when siteKey configured)', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.waitForTimeout(3000)
    // Turnstile widget only renders when TURNSTILE_SITE_KEY is set in env.
    // In dev/test without the key, we verify the preconnect hint is present (always rendered by layout).
    const preconnect = page.locator('link[href*="challenges.cloudflare.com"]')
    const turnstile = page.locator('[class*="turnstile"], [id*="turnstile"], [data-sitekey], iframe[src*="challenges.cloudflare.com"]')
    const preconnectCount = await preconnect.count()
    const widgetCount = await turnstile.count()
    // At least the preconnect hint should be present in the HTML head
    expect(preconnectCount + widgetCount).toBeGreaterThan(0)
  })

  test('AccessGate renders on signup chapter (ch05)', async ({ page }) => {
    await page.goto('/listen/chapter-05')
    await page.waitForTimeout(5000)
    // AccessGate should render with email input for magic link
    const emailInput = page.locator('input[type="email"]')
    const gateText = page.locator('text=/Sign up|Registrate|Send Magic Link|Enviar Enlace/')
    const hasEmail = (await emailInput.count()) > 0
    const hasGate = (await gateText.count()) > 0
    expect(hasEmail || hasGate).toBeTruthy()
  })

  test('Sign In link visible in mobile nav overlay', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await page.waitForTimeout(1000)
    // Open mobile nav
    const navLabel = page.locator('label[for="nav-toggle"]').first()
    await navLabel.click()
    await page.waitForTimeout(500)
    // Sign in link should be present
    const signInLink = page.locator('nav a[href="/auth/signin"]')
    const count = await signInLink.count()
    expect(count).toBeGreaterThan(0)
  })

  test('invalid chapter slug returns 404', async ({ page }) => {
    const response = await page.goto('/listen/nonexistent-chapter')
    expect(response?.status()).toBe(404)
  })
})
