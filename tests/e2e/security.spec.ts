import { test, expect } from '@playwright/test'

test.describe('Security Headers', () => {
  test('CSP header is present with correct directives', async ({ request }) => {
    const response = await request.get('/')
    const csp = response.headers()['content-security-policy']
    expect(csp).toBeDefined()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain('script-src')
    expect(csp).toContain("frame-ancestors 'none'")
  })

  test('HSTS header is present with 2-year max-age + preload', async ({ request }) => {
    const response = await request.get('/')
    const hsts = response.headers()['strict-transport-security']
    expect(hsts).toBeDefined()
    expect(hsts).toContain('max-age=63072000')
    expect(hsts).toContain('includeSubDomains')
    expect(hsts).toContain('preload')
  })

  test('X-Frame-Options is DENY', async ({ request }) => {
    const response = await request.get('/')
    expect(response.headers()['x-frame-options']).toBe('DENY')
  })

  test('X-Content-Type-Options is nosniff', async ({ request }) => {
    const response = await request.get('/')
    expect(response.headers()['x-content-type-options']).toBe('nosniff')
  })

  test('Referrer-Policy is strict-origin-when-cross-origin', async ({ request }) => {
    const response = await request.get('/')
    expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })

  test('Permissions-Policy restricts camera, microphone, geolocation', async ({ request }) => {
    const response = await request.get('/')
    const pp = response.headers()['permissions-policy']
    expect(pp).toBeDefined()
    expect(pp).toContain('camera=()')
    expect(pp).toContain('microphone=()')
    expect(pp).toContain('geolocation=()')
  })

  test('health endpoint returns 200 with status ok', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeDefined()
  })

  test('API response includes no-store cache control', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.headers()['cache-control']).toContain('no-store')
  })

  test('rate limit header present on audio API', async ({ request }) => {
    const response = await request.get('/api/audio/token?chapter=prologue&lang=es')
    const remaining = response.headers()['x-ratelimit-remaining']
    expect(remaining).toBeDefined()
    // Should be a numeric string
    expect(parseInt(remaining)).toBeGreaterThanOrEqual(0)
  })
})

// === Phase 7.10: Multi-route security header verification ===

test.describe('Security Headers on All Route Types', () => {
  const ROUTES = [
    { path: '/', name: 'homepage' },
    { path: '/listen/prologue', name: 'player page' },
    { path: '/api/health', name: 'API route' },
    { path: '/characters', name: 'portal page' },
    { path: '/gallery', name: 'gallery page' },
  ]

  for (const { path, name } of ROUTES) {
    test(`all 6 security headers present on ${name} (${path})`, async ({ request }) => {
      const response = await request.get(path)
      const headers = response.headers()

      // CSP
      expect(headers['content-security-policy']).toBeDefined()
      expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
      expect(headers['content-security-policy']).toContain("object-src 'none'")

      // HSTS
      expect(headers['strict-transport-security']).toContain('max-age=63072000')
      expect(headers['strict-transport-security']).toContain('includeSubDomains')
      expect(headers['strict-transport-security']).toContain('preload')

      // X-Frame-Options
      expect(headers['x-frame-options']).toBe('DENY')

      // X-Content-Type-Options
      expect(headers['x-content-type-options']).toBe('nosniff')

      // Referrer-Policy
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')

      // Permissions-Policy
      expect(headers['permissions-policy']).toContain('interest-cohort=()')
    })
  }
})

test.describe('CSP Detailed Directive Verification', () => {
  test('CSP contains all required directives', async ({ request }) => {
    const response = await request.get('/')
    const csp = response.headers()['content-security-policy']

    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    expect(csp).toContain("img-src 'self' data: blob:")
    expect(csp).toContain("media-src 'self'")
    expect(csp).toContain("font-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain('https://challenges.cloudflare.com')
  })
})

test.describe('Cache-Control Per Asset Type', () => {
  test('API routes get no-store cache', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.headers()['cache-control']).toContain('no-store')
  })

  test('HTML pages get no-cache, must-revalidate', async ({ request }) => {
    const response = await request.get('/')
    const cc = response.headers()['cache-control']
    expect(cc).toContain('no-cache')
    expect(cc).toContain('must-revalidate')
  })
})
