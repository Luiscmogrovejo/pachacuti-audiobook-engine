// src/pages/api/audio/manifest/[chapter].ts -- Lightweight audio manifest metadata
// GET /api/audio/manifest/prologue?lang=es
// Returns: { chapter, language, chunkCount, chunkDurations, totalDuration }
// No chunk data -- just metadata for the client to build a progress UI

/// <reference types="node" />
import type { APIRoute } from 'astro'
import { VALID_SLUGS, FREE_SLUGS, PAID_SLUGS } from '../../../../lib/data/chapters'
import type { EncryptedChapterManifest } from '../../../../lib/crypto/types'
import fs from 'node:fs'
import path from 'node:path'

const VALID_LANGS = new Set(['es', 'en'])

/** Base path for encrypted content */
const ENCRYPTED_BASE = path.resolve('./content/encrypted')

/** Bitrate for duration estimation: 192kbps MP3 */
const BITRATE_BPS = 192_000

/**
 * Estimate chunk duration from base64 data size.
 * Formula: (decodedBytes * 8) / bitrate = seconds
 * Base64 overhead: each 4 chars = 3 bytes, so decodedBytes = base64Length * 3/4
 */
function estimateChunkDuration(base64Data: string): number {
  const decodedBytes = Math.floor(base64Data.length * 3 / 4)
  return (decodedBytes * 8) / BITRATE_BPS
}

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

  // --- Tier enforcement (same as other content endpoints) ---

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

  // Read manifest from disk
  const manifestPath = path.join(ENCRYPTED_BASE, 'audio', chapter, `${lang}.enc.json`)

  // Path traversal defense
  if (!manifestPath.startsWith(ENCRYPTED_BASE)) {
    return new Response(
      JSON.stringify({ error: 'Invalid path' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (!fs.existsSync(manifestPath)) {
    return new Response(
      JSON.stringify({ error: 'Audio manifest not found for this chapter/language' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    const data = fs.readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(data) as EncryptedChapterManifest

    // Calculate chunk durations from encrypted data sizes
    const chunkDurations = manifest.chunks.map((chunk) =>
      Math.round(estimateChunkDuration(chunk.data) * 100) / 100
    )
    const totalDuration = Math.round(chunkDurations.reduce((sum, d) => sum + d, 0) * 100) / 100

    return new Response(
      JSON.stringify({
        chapter: manifest.chapter,
        language: manifest.language,
        chunkCount: manifest.chunkCount,
        chunkDurations,
        totalDuration,
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
  } catch {
    return new Response(
      JSON.stringify({ error: 'Failed to read audio manifest' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
