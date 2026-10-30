// src/middleware.ts -- Astro middleware: security headers + rate limiting (PROT-03) + session attachment (AUTH-05)
// In-memory Map-based rate limiter, IP-only (no user-agent fingerprinting per PROT-05)
// Security headers applied to ALL responses (INFR-04)
// Session attached to locals for /listen/* and /api/progress/* routes (non-blocking)

import { defineMiddleware } from 'astro:middleware'

// ─── Security Headers ─────────────────────────────────────────────────────

/**
 * Add security headers to every response.
 * Accepts pathname to set appropriate Cache-Control per asset type.
 */
function addSecurityHeaders(response: Response, pathname: string): void {
  // Content Security Policy
  response.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self'",
    "font-src 'self'",
    "connect-src 'self' https://challenges.cloudflare.com https://checkout.stripe.com",
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '))

  // HTTP Strict Transport Security
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions Policy
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')

  // X-XSS-Protection: disabled in favor of CSP (modern best practice)
  // Setting to 0 prevents XSS auditor issues in older browsers
  response.headers.set('X-XSS-Protection', '0')

  // ── Cache-Control per asset type ──

  // Hashed static assets (CSS, JS) -- immutable
  if (pathname.startsWith('/_astro/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }
  // API responses -- checked before file extension patterns so /api/image/*.webp doesn't match art tier.
  // /api/image/ routes set their own Cache-Control (private, max-age=300), other APIs get no-store.
  else if (pathname.startsWith('/api/')) {
    if (!pathname.startsWith('/api/image/')) {
      response.headers.set('Cache-Control', 'no-store')
    }
    // /api/image/ keeps whatever Cache-Control the route handler set
  }
  // Audio files -- long cache (content rarely changes, large files benefit from caching)
  else if (pathname.startsWith('/audio/') || /\.(mp3|ogg|wav)$/.test(pathname)) {
    response.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  }
  // Art/image files -- long cache
  else if (pathname.startsWith('/art/') || /\.(avif|webp|png|jpg|jpeg|svg)$/.test(pathname)) {
    response.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  }
  // Font files -- immutable (versioned by filename)
  else if (/\.(woff2?|ttf|otf)$/.test(pathname)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }
  // HTML pages -- no cache (SSR may change)
  else if (pathname.endsWith('/') || pathname.endsWith('.html')) {
    response.headers.set('Cache-Control', 'no-cache, must-revalidate')
  }
}

// ─── Rate Limiting ─────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  resetAt: number
}

/** Rate limit state: key = "ip:bucket", value = { count, resetAt } */
const rateLimitMap = new Map<string, RateLimitEntry>()

/** Limits per route bucket (requests per 60-second window) */
const LIMITS: Record<string, number> = {
  audio: 60,    // /api/audio/* -- 60 req/min
  auth: 10,     // /api/auth/*  -- 10 req/min (more restrictive)
  text: 30,     // /api/text/*  -- 30 req/min (encrypted text)
  image: 60,    // /api/image/* -- 60 req/min (token-gated images)
  payment: 10,  // /api/payment/* -- 10 req/min (Stripe sessions)
}

const WINDOW_MS = 60_000   // 1 minute
const CLEANUP_INTERVAL_MS = 5 * 60_000 // 5 minutes

/** Clean up expired entries to prevent memory leak */
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) {
        rateLimitMap.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)
}

/**
 * Extract client IP from request headers.
 * Falls back to 'unknown' if no IP headers present.
 */
function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Determine which rate limit bucket a URL path belongs to.
 * Returns null for non-rate-limited paths.
 */
function getBucket(pathname: string): string | null {
  if (pathname.startsWith('/api/audio/')) return 'audio'
  if (pathname.startsWith('/api/auth/')) return 'auth'
  if (pathname.startsWith('/api/text/')) return 'text'
  if (pathname.startsWith('/api/image/')) return 'image'
  // Exempt webhook from rate limiting (Stripe retries need to succeed)
  if (pathname === '/api/payment/webhook') return null
  if (pathname.startsWith('/api/payment/')) return 'payment'
  return null
}

// ─── Session Attachment ────────────────────────────────────────────────────

/** Routes where session is attached to locals (non-blocking, no redirect) */
function needsSessionCheck(pathname: string): boolean {
  return (
    pathname.startsWith('/listen/') ||
    pathname.startsWith('/api/progress/') ||
    pathname.startsWith('/api/bookmarks/') ||
    pathname.startsWith('/api/payment/')
  )
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url, locals } = context
  const isDev = import.meta.env.DEV
  const pathname = url.pathname

  // ── Session attachment for relevant routes ──
  if (needsSessionCheck(pathname)) {
    try {
      // Dynamic import to avoid loading auth machinery on every request
      const { getSession } = await import('./lib/auth/server')
      const sessionData = await getSession(request)
      if (sessionData) {
        locals.user = {
          id: sessionData.user.id,
          email: sessionData.user.email,
          name: sessionData.user.name ?? undefined,
        }
        locals.session = {
          id: sessionData.session.id,
          token: sessionData.session.token,
          expiresAt: sessionData.session.expiresAt,
        }
      }
    } catch {
      // Session check failed (DB unavailable, etc.) -- proceed without auth
      // Non-blocking: do NOT redirect or return 403
    }
  }

  // ── Rate limiting for API routes ──
  const bucket = getBucket(pathname)

  // Non-rate-limited routes: apply security headers and pass through
  if (!bucket) {
    const response = await next()
    addSecurityHeaders(response, pathname)
    return response
  }

  const ip = getClientIp(request)
  const key = `${ip}:${bucket}`
  const now = Date.now()
  const limit = isDev ? 10_000 : LIMITS[bucket]

  let entry = rateLimitMap.get(key)

  // Create or reset entry if window expired
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS }
    rateLimitMap.set(key, entry)
  }

  entry.count++

  // Check if over limit -- 429 responses also get security headers
  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    const errorResponse = new Response(
      JSON.stringify({ error: 'Rate limit exceeded', retryAfter }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Remaining': '0',
        },
      },
    )
    addSecurityHeaders(errorResponse, pathname)
    return errorResponse
  }

  // Add rate limit info header to response
  const response = await next()

  const remaining = Math.max(0, limit - entry.count)
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  addSecurityHeaders(response, pathname)

  return response
})
