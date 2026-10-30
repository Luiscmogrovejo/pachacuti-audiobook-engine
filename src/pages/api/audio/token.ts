// src/pages/api/audio/token.ts -- Issue short-lived JWT for audio streaming
// GET /api/audio/token?chapter=prologue&lang=es
// Returns: { token: "eyJ...", expiresIn: 300 }
// Server-side tier enforcement: free=always, signup=session required, paid=session+isPaid

import type { APIRoute } from 'astro'
import { VALID_SLUGS, CHAPTER_BY_SLUG, FREE_SLUGS, PAID_SLUGS } from '../../../lib/data/chapters'
import { signAudioToken } from '../../../lib/audio/token'
import fs from 'node:fs'
import path from 'node:path'

/** Base path for encrypted content -- checked to determine encrypted flag */
const ENCRYPTED_BASE = path.resolve('./content/encrypted')

const VALID_LANGS = new Set(['es', 'en'])
const VALID_VOICES = new Set(['female', 'male'])

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url)
  const chapter = url.searchParams.get('chapter')
  const lang = url.searchParams.get('lang')

  // Validate chapter slug
  if (!chapter || !VALID_SLUGS.has(chapter)) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing chapter slug' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Validate language
  if (!lang || !VALID_LANGS.has(lang)) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing lang (must be "es" or "en")' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Voice param: optional, defaults to 'female' for backward compatibility
  const voiceParam = url.searchParams.get('voice')
  const voice = (voiceParam && VALID_VOICES.has(voiceParam) ? voiceParam : 'female') as 'female' | 'male'

  // --- Tier-based access enforcement (server-side gate) ---

  // Paid chapters: require authenticated session + isPaid=true
  if (PAID_SLUGS.has(chapter)) {
    const { getSession, getIsPaid } = await import('../../../lib/auth/server')
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
  }

  // Signup chapters: require authenticated session
  if (!FREE_SLUGS.has(chapter) && !PAID_SLUGS.has(chapter)) {
    const { getSession } = await import('../../../lib/auth/server')
    const session = await getSession(request)

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Authentication required', tier: 'signup' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  // Extract client IP for token binding (cf-connecting-ip preferred behind Cloudflare)
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  // Free chapters + authenticated signup chapters: generate token
  const token = await signAudioToken({ chapter, lang: lang as 'es' | 'en', ip, voice })

  // Check if encrypted audio exists for this chapter/language/voice
  const voiceSuffix = voice === 'male' ? '-male' : ''
  const encryptedManifestPath = path.join(ENCRYPTED_BASE, 'audio', chapter, `${lang}${voiceSuffix}.enc.json`)
  const encrypted = fs.existsSync(encryptedManifestPath)

  return new Response(
    JSON.stringify({ token, expiresIn: 300, encrypted }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    },
  )
}
