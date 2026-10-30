// src/pages/api/audio/encrypted/[chapter].ts -- Serve encrypted audio chunks
// GET /api/audio/encrypted/prologue?lang=es&chunk=0 (single chunk)
// GET /api/audio/encrypted/prologue?lang=es (manifest metadata without chunk data)
// Tier enforcement + rate limiting + session key token validation

/// <reference types="node" />
import type { APIRoute } from 'astro'
import { VALID_SLUGS, FREE_SLUGS, PAID_SLUGS } from '../../../../lib/data/chapters'
import type { EncryptedChapterManifest } from '../../../../lib/crypto/types'
import fs from 'node:fs'
import path from 'node:path'

const VALID_LANGS = new Set(['es', 'en'])

/** Rate limit: 120 requests/min per IP (clients fetch many chunks in sequence) */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 120
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

/** Cache parsed manifests in memory to avoid re-reading 26MB+ files on every chunk request */
const manifestCache = new Map<string, { manifest: EncryptedChapterManifest; loadedAt: number }>()
const CACHE_TTL_MS = 5 * 60_000 // 5 minute cache

function getManifest(chapter: string, lang: string): EncryptedChapterManifest | null {
  const cacheKey = `${chapter}-${lang}`
  const cached = manifestCache.get(cacheKey)

  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.manifest
  }

  const manifestPath = path.join(ENCRYPTED_BASE, 'audio', chapter, `${lang}.enc.json`)

  // Path traversal defense
  if (!manifestPath.startsWith(ENCRYPTED_BASE)) return null
  if (!fs.existsSync(manifestPath)) return null

  try {
    const data = fs.readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(data) as EncryptedChapterManifest
    manifestCache.set(cacheKey, { manifest, loadedAt: Date.now() })
    return manifest
  } catch {
    return null
  }
}

export const GET: APIRoute = async ({ params, request }) => {
  const chapter = params.chapter
  const url = new URL(request.url)
  const lang = url.searchParams.get('lang') || 'es'
  const voiceParam = url.searchParams.get('voice') || 'female'
  const voiceSuffix = voiceParam === 'male' ? '-male' : ''
  const chunkParam = url.searchParams.get('chunk')

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

  // Paid chapters: require session + isPaid
  if (PAID_SLUGS.has(chapter)) {
    try {
      const { getSession, getIsPaid } = await import('../../../../lib/auth/server')
      const session = await getSession(request)
      if (!session) {
        return new Response(
          JSON.stringify({ error: 'Authentication required', tier: 'signup' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        )
      }
      const isPaid = await getIsPaid(request)
      if (!isPaid) {
        return new Response(
          JSON.stringify({ error: 'Premium access required', tier: 'paid' }),
          { status: 402, headers: { 'Content-Type': 'application/json' } },
        )
      }
    } catch {
      // Auth module unavailable — default to RESTRICT
      return new Response(
        JSON.stringify({ error: 'Premium access required', tier: 'paid' }),
        { status: 402, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  // Signup chapters: require authenticated session
  if (!FREE_SLUGS.has(chapter) && !PAID_SLUGS.has(chapter)) {
    try {
      const { getSession } = await import('../../../../lib/auth/server')
      const session = await getSession(request)
      if (!session) {
        return new Response(
          JSON.stringify({ error: 'Authentication required', tier: 'signup' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        )
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Authentication required', tier: 'signup' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  // Load manifest (voice-aware: 'es' for female, 'es-male' for male)
  const manifest = getManifest(chapter, `${lang}${voiceSuffix}`)
  if (!manifest) {
    return new Response(
      JSON.stringify({ error: 'Encrypted audio not found for this chapter/language' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // If no chunk param: return manifest metadata (without chunk data)
  if (chunkParam === null || chunkParam === undefined) {
    return new Response(
      JSON.stringify({
        chapter: manifest.chapter,
        language: manifest.language,
        type: manifest.type,
        chunkCount: manifest.chunkCount,
        encryptedAt: manifest.encryptedAt,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    )
  }

  // Serve individual chunk
  const chunkIndex = parseInt(chunkParam, 10)
  if (isNaN(chunkIndex) || chunkIndex < 0 || chunkIndex >= manifest.chunks.length) {
    return new Response(
      JSON.stringify({
        error: 'Invalid chunk index',
        validRange: `0-${manifest.chunks.length - 1}`,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const chunk = manifest.chunks[chunkIndex]

  return new Response(
    JSON.stringify({
      iv: chunk.iv,
      data: chunk.data,
      index: chunk.index,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  )
}
