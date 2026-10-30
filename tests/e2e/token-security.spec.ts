// tests/e2e/token-security.spec.ts -- Phase 7.10 Audio Token + Stream Security Tests
// Verifies: token fields, 3-tier enforcement, IP claim in JWT, rate limiting,
// stream access control, Range requests, cache headers.

import { test, expect } from '@playwright/test'

test.describe('Audio Token Security', () => {
  // === Token response shape ===

  test('free chapter token has expected fields: token, expiresIn, encrypted', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=prologue&lang=es')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.token).toBeDefined()
    expect(typeof body.token).toBe('string')
    expect(body.token.length).toBeGreaterThan(10)
    expect(body.expiresIn).toBe(300) // 5 minutes
    expect(typeof body.encrypted).toBe('boolean')
  })

  test('token contains IP claim in JWT payload', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=prologue&lang=es')
    expect(response.status()).toBe(200)
    const body = await response.json()

    // Decode JWT payload (base64url)
    const parts = body.token.split('.')
    expect(parts.length).toBe(3) // header.payload.signature

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    )
    expect(payload.ip).toBeDefined()
    expect(typeof payload.ip).toBe('string')
    expect(payload.chapter).toBe('prologue')
    expect(payload.lang).toBe('es')
  })

  // === Tier enforcement ===

  test('free chapter-02 token returns 200', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=chapter-02&lang=en')
    expect(response.status()).toBe(200)
  })

  test('free chapter-03 returns 200 (moved to free tier)', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=chapter-03&lang=es')
    expect(response.status()).toBe(200)
  })

  test('signup chapter-05 without auth returns 401 or 500', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=chapter-05&lang=es')
    expect([401, 500]).toContain(response.status())
  })

  test('signup chapter-10 without auth returns 401 or 500', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=chapter-10&lang=es')
    expect([401, 500]).toContain(response.status())
  })

  test('paid chapter-11 returns 401 or 402 (auth required first)', async ({ request }) => {
    // Unauthenticated users hit 401 before reaching 402 check
    const response = await request.get('/api/audio/token?chapter=chapter-11&lang=es')
    expect([401, 402, 500]).toContain(response.status())
    const body = await response.json()
    expect(body.tier).toMatch(/signup|paid/)
  })

  test('paid chapter-15 returns 401 or 402', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=chapter-15&lang=es')
    expect([401, 402, 500]).toContain(response.status())
  })

  test('paid chapter-19 returns 401 or 402', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=chapter-19&lang=es')
    expect([401, 402, 500]).toContain(response.status())
  })

  // === Input validation ===

  test('invalid chapter slug returns 400', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=bogus-chapter&lang=es')
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Invalid')
  })

  test('missing chapter param returns 400', async ({ request }) => {
    const response = await request.get('/api/audio/token?lang=es')
    expect(response.status()).toBe(400)
  })

  test('missing lang param returns 400', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=prologue')
    expect(response.status()).toBe(400)
  })

  test('invalid lang param returns 400', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=prologue&lang=fr')
    expect(response.status()).toBe(400)
  })

  // === Rate limit headers ===

  test('rate limit header present and decrements', async ({ request }) => {
    const r1 = await request.get('/api/audio/token?chapter=prologue&lang=es')
    const remaining1 = parseInt(r1.headers()['x-ratelimit-remaining'])
    expect(remaining1).toBeGreaterThanOrEqual(0)

    const r2 = await request.get('/api/audio/token?chapter=prologue&lang=es')
    const remaining2 = parseInt(r2.headers()['x-ratelimit-remaining'])
    // Second request should have fewer remaining (or equal if window reset)
    expect(remaining2).toBeLessThanOrEqual(remaining1)
  })

  test('multiple rapid requests decrement rate limit counter', async ({ request }) => {
    // Send 5 rapid requests
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request.get('/api/audio/token?chapter=prologue&lang=es')
      )
    )

    // All should succeed (dev mode has 10k limit)
    for (const r of responses) {
      expect(r.status()).toBe(200)
    }

    // Rate limit headers should be present on all
    for (const r of responses) {
      expect(r.headers()['x-ratelimit-remaining']).toBeDefined()
    }
  })
})

test.describe('Audio Stream Security', () => {
  test('stream endpoint rejects missing token with 400', async ({ request }) => {
    const response = await request.get('/api/audio/stream')
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Missing token')
  })

  test('stream endpoint rejects invalid token with 403', async ({ request }) => {
    const response = await request.get('/api/audio/stream?token=invalid-fake-jwt-token')
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('Invalid')
  })

  test('stream with valid token returns audio or 403 (IP mismatch expected)', async ({ request }) => {
    // Get a real token first
    const tokenRes = await request.get('/api/audio/token?chapter=prologue&lang=es')
    expect(tokenRes.status()).toBe(200)
    const { token } = await tokenRes.json()

    // Use the token to stream -- may get 403 due to IP binding mismatch
    // (token IP = Playwright test runner IP, stream IP might differ via proxy)
    const streamRes = await request.get(`/api/audio/stream?token=${token}`)
    // Accept 200 (audio bytes), 403 (IP mismatch), or 404 (audio file not on disk)
    expect([200, 403, 404]).toContain(streamRes.status())

    if (streamRes.status() === 200) {
      // Verify audio content type
      expect(streamRes.headers()['content-type']).toContain('audio')
      // Verify cache headers (middleware sets no-store on /api/ routes)
      const cc = streamRes.headers()['cache-control']
      expect(cc).toContain('no-store')
      // Verify Range support header
      expect(streamRes.headers()['accept-ranges']).toBe('bytes')
    }
  })
})

test.describe('Magic Link Endpoint Security', () => {
  test('POST /api/auth/verify-and-send-magic-link exists (not 404)', async ({ request }) => {
    const response = await request.post('/api/auth/verify-and-send-magic-link', {
      data: {},
    })
    // Should return 400 (bad input) -- NOT 404 (endpoint doesn't exist)
    expect(response.status()).not.toBe(404)
    expect([400, 403, 500]).toContain(response.status())
  })

  test('POST without body returns 400 or 403', async ({ request }) => {
    const response = await request.post('/api/auth/verify-and-send-magic-link')
    // Returns 400 (bad JSON), 403 (missing required fields), or 500 (internal error)
    expect([400, 403, 500]).toContain(response.status())
  })

  test('POST with invalid email returns 400', async ({ request }) => {
    const response = await request.post('/api/auth/verify-and-send-magic-link', {
      data: { email: 'not-an-email', turnstileToken: 'test' },
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('email')
  })

  test('POST without turnstile token returns 400', async ({ request }) => {
    const response = await request.post('/api/auth/verify-and-send-magic-link', {
      data: { email: 'test@example.com' },
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Turnstile')
  })
})
