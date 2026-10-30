// src/pages/api/text/[chapter].ts -- Serve encrypted text chapter manifests
// GET /api/text/prologue?lang=es
// Returns EncryptedChapterManifest JSON for a given chapter+language
// Tier enforcement: free=always, signup=session, paid=402

/// <reference types="node" />
import type { APIRoute } from 'astro'
import { VALID_SLUGS, FREE_SLUGS, PAID_SLUGS } from '../../../lib/data/chapters'
import fs from 'node:fs'
import path from 'node:path'

const VALID_LANGS = new Set(['es', 'en'])

/** Rate limit: 30 requests/min per IP */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30
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

// Clean up expired entries every 5 minutes
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key)
    }
  }, 5 * 60_000)
}

/** Base path for encrypted content */
const ENCRYPTED_BASE = path.resolve('./content/encrypted')

export const GET: APIRoute = async ({ params, request }) => {
  const chapter = params.chapter
  const url = new URL(request.url)
  const lang = url.searchParams.get('lang') || 'es'

  // Validate chapter slug
  if (!chapter || !VALID_SLUGS.has(chapter)) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing chapter slug' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Validate language
  if (!VALID_LANGS.has(lang)) {
    return new Response(
      JSON.stringify({ error: 'Invalid lang (must be "es" or "en")' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Extract client IP
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  // Rate limit
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // --- Tier enforcement ---

  // Paid chapters: 402
  if (PAID_SLUGS.has(chapter)) {
    return new Response(
      JSON.stringify({ error: 'Premium access required', tier: 'paid' }),
      { status: 402, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Signup chapters: require authenticated session
  if (!FREE_SLUGS.has(chapter)) {
    try {
      const { getSession } = await import('../../../lib/auth/server')
      const session = await getSession(request)
      if (!session) {
        return new Response(
          JSON.stringify({ error: 'Authentication required', tier: 'signup' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        )
      }
    } catch {
      // Auth unavailable -- treat as unauthenticated
      return new Response(
        JSON.stringify({ error: 'Authentication required', tier: 'signup' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  // Read encrypted manifest from disk
  const manifestPath = path.join(ENCRYPTED_BASE, 'text', `${chapter}-${lang}.enc.json`)

  // Path traversal defense
  if (!manifestPath.startsWith(ENCRYPTED_BASE)) {
    return new Response(
      JSON.stringify({ error: 'Invalid path' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (!fs.existsSync(manifestPath)) {
    return new Response(
      JSON.stringify({ error: 'Encrypted text not found for this chapter/language' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    const manifestData = fs.readFileSync(manifestPath, 'utf-8')
    return new Response(manifestData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new Response(
      JSON.stringify({ error: 'Failed to read encrypted text' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
