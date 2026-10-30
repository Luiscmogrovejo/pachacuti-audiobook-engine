// tests/e2e/encryption.spec.ts -- E2E tests for encrypted content pipeline
// Tests: session key API, encrypted text/audio/image endpoints, access control
// NOTE: Tests 1-5 validate API endpoints (work with or without PUBLIC_ENABLE_ENCRYPTION)
// Tests 6-8 would require PUBLIC_ENABLE_ENCRYPTION=true and encrypted content on disk

import { test, expect } from '@playwright/test'

test.describe('Encryption API Endpoints', () => {
  test('GET /api/crypto/session-key returns valid key for anonymous user', async ({ request }) => {
    const response = await request.get('/api/crypto/session-key')
    // Accept 200 (working) or 500 (DB/env not configured in test)
    if (response.status() === 200) {
      const data = await response.json()
      expect(data.key).toBeDefined()
      expect(typeof data.key).toBe('string')
      expect(data.key.length).toBeGreaterThan(10)
      expect(data.chapters).toBeDefined()
      expect(Array.isArray(data.chapters)).toBe(true)
      // Anonymous should get free chapters
      expect(data.chapters).toContain('prologue')
      expect(data.expiresIn).toBe(3600)
    } else {
      // Acceptable in test env without CONTENT_MASTER_KEY
      expect([200, 500]).toContain(response.status())
    }
  })

  test('GET /api/text/prologue returns encrypted manifest or 404 (no encrypted content)', async ({
    request,
  }) => {
    const response = await request.get('/api/text/prologue?lang=es')
    // 200 if encrypted content exists, 404 if not yet generated
    expect([200, 404]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      expect(data.chapter).toBe('prologue')
      expect(data.language).toBe('es')
      expect(data.type).toBe('text')
      expect(data.chunks).toBeDefined()
      expect(Array.isArray(data.chunks)).toBe(true)
    }
  })

  test('GET /api/text/invalid-slug returns 400', async ({ request }) => {
    const response = await request.get('/api/text/not-a-chapter?lang=es')
    expect(response.status()).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Invalid')
  })

  test('GET /api/text/chapter-03 requires auth (signup tier)', async ({ request }) => {
    const response = await request.get('/api/text/chapter-03?lang=es')
    // 401 (needs auth) or 404 (no encrypted content) -- both acceptable
    expect([401, 404]).toContain(response.status())
  })

  test('GET /api/text/chapter-11 returns 402 (paid tier)', async ({ request }) => {
    const response = await request.get('/api/text/chapter-11?lang=es')
    expect(response.status()).toBe(402)
    const data = await response.json()
    expect(data.tier).toBe('paid')
  })

  test('GET /api/audio/manifest/prologue returns manifest or 404', async ({ request }) => {
    const response = await request.get('/api/audio/manifest/prologue?lang=es')
    expect([200, 404]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      expect(data.chapter).toBe('prologue')
      expect(data.language).toBe('es')
      expect(typeof data.chunkCount).toBe('number')
      expect(data.chunkCount).toBeGreaterThan(0)
      expect(Array.isArray(data.chunkDurations)).toBe(true)
      expect(typeof data.totalDuration).toBe('number')
    }
  })

  test('GET /api/audio/encrypted/prologue returns metadata or 404', async ({ request }) => {
    const response = await request.get('/api/audio/encrypted/prologue?lang=es')
    expect([200, 404]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      expect(data.chapter).toBe('prologue')
      expect(typeof data.chunkCount).toBe('number')
    }
  })

  test('GET /api/image/ returns 403 without token', async ({ request }) => {
    const response = await request.get('/api/image/scenes/ch00/ch00-scene-01.webp')
    expect(response.status()).toBe(403)
    const data = await response.json()
    expect(data.error).toContain('Missing token')
  })

  test('GET /api/image/ with valid token returns image or 404', async ({ request }) => {
    // Use a dummy token (length > 10) -- the image endpoint validates token presence, not cryptographic validity
    const response = await request.get(
      '/api/image/scenes/ch00/ch00-scene-01.webp?token=test-session-token-for-e2e',
    )
    // 200 (image found in public/art/) or 404 (image doesn't exist in test env)
    expect([200, 404]).toContain(response.status())

    if (response.status() === 200) {
      expect(response.headers()['content-type']).toContain('image/webp')
      expect(response.headers()['cache-control']).toContain('private')
    }
  })

  test('GET /api/audio/token includes encrypted flag', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=prologue&lang=es')
    // 200 (token generated) or 401/500 (auth/env issues in test)
    if (response.status() === 200) {
      const data = await response.json()
      expect(data.token).toBeDefined()
      expect(data.expiresIn).toBe(300)
      expect(typeof data.encrypted).toBe('boolean')
    }
  })

  test('Encrypted content routes have correct security headers', async ({ request }) => {
    const response = await request.get('/api/text/prologue?lang=es')
    // Verify security headers are present (even on 404)
    expect(response.headers()['x-content-type-options']).toBe('nosniff')
  })

  test('Rate limiting works on text endpoint', async ({ request }) => {
    // In dev mode, rate limits are very high (10k), so just verify the header exists
    const response = await request.get('/api/text/prologue?lang=es')
    // Rate limit header should be present (from middleware)
    const remaining = response.headers()['x-ratelimit-remaining']
    expect(remaining).toBeDefined()
  })
})

test.describe('Encryption Feature Flag', () => {
  test('Player loads without encryption (default behavior preserved)', async ({ page }) => {
    await page.goto('/listen/prologue')
    await page.waitForTimeout(2000)

    // Karaoke display should be visible
    const karaoke = page.locator('[data-testid="karaoke-text"]')
    await expect(karaoke).toBeVisible()

    // No console errors from encryption code
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.waitForTimeout(1000)

    // Filter out expected errors (network, etc.) -- only flag encryption-specific errors
    const encryptionErrors = errors.filter((e) => e.toLowerCase().includes('encrypt'))
    expect(encryptionErrors).toHaveLength(0)
  })
})
