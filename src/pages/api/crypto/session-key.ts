// src/pages/api/crypto/session-key.ts -- Issue session-scoped encryption key
// GET /api/crypto/session-key
// Returns: { key: base64, chapters: string[], expiresIn: 3600 }
// Anonymous users get free chapters only; authenticated get signup+free; paid gets all

/// <reference types="node" />
import type { APIRoute } from 'astro'
import { createSessionKeyPayload } from '../../../lib/crypto/key-exchange'
import { CHAPTERS } from '../../../lib/data/chapters'
import { randomUUID } from 'crypto'

/** All chapter slugs by tier */
const FREE_CHAPTERS = CHAPTERS.filter((ch) => ch.tier === 'free').map((ch) => ch.slug)
const SIGNUP_CHAPTERS = CHAPTERS.filter((ch) => ch.tier === 'signup').map((ch) => ch.slug)

/** Rate limit: 10 requests/min per IP */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const WINDOW_MS = 60_000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

// Clean up expired rate limit entries every 5 minutes
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key)
    }
  }, 5 * 60_000)
}

export const GET: APIRoute = async ({ request }) => {
  // Extract client IP
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  // Rate limit check
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Determine auth state
  let isAuthenticated = false
  let sessionId: string = `anon-${ip}-${Date.now()}`

  try {
    const { getSession } = await import('../../../lib/auth/server')
    const session = await getSession(request)
    if (session) {
      isAuthenticated = true
      sessionId = session.session?.id || session.user?.id || randomUUID()
    }
  } catch {
    // Auth module unavailable (dev without DB) -- treat as anonymous
  }

  // Determine authorized chapters based on tier
  let authorizedChapters: string[]

  if (!isAuthenticated) {
    // Anonymous: free chapters only
    authorizedChapters = [...FREE_CHAPTERS]
  } else {
    // Authenticated: free + signup chapters
    // Paid tier not yet implemented -- exclude paid chapters
    authorizedChapters = [...FREE_CHAPTERS, ...SIGNUP_CHAPTERS]
  }

  // Derive session key
  const payload = createSessionKeyPayload(sessionId, authorizedChapters)

  return new Response(
    JSON.stringify({
      key: payload.key,
      chapters: payload.chapters,
      expiresIn: 3600,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    },
  )
}
