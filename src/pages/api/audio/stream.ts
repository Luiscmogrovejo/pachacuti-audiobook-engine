// src/pages/api/audio/stream.ts -- Serve audio files via verified JWT tokens
// GET /api/audio/stream?token=eyJ...
// Supports Range Requests for mobile Safari seeking (206 Partial Content)

import type { APIRoute } from 'astro'
import { verifyAudioToken } from '../../../lib/audio/token'
import { CHAPTER_BY_SLUG } from '../../../lib/data/chapters'
import fs from 'node:fs'
import path from 'node:path'

/** Base path for audio files -- different in dev vs production.
 *  Production: /app/media/audio/chapters (volume-mounted OUTSIDE dist/client to prevent direct static serving)
 *  Dev: ./public/audio/chapters (Astro dev server serves public/ directly)
 */
const AUDIO_BASE_PATH = import.meta.env.AUDIO_BASE_PATH || (
  import.meta.env.PROD ? './media/audio/chapters' : './public/audio/chapters'
)

/** Allowed origin hosts for referrer check (production + dev) */
const ALLOWED_HOSTS = new Set([
  'pachacuti.robertamauta.com',
  'localhost',
  '127.0.0.1',
])

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  // Referrer check -- reject requests not originating from our domain
  // Allows missing referrer (some browsers strip it) but blocks foreign origins
  const referer = request.headers.get('referer')
  if (referer) {
    try {
      const refererHost = new URL(referer).hostname
      if (!ALLOWED_HOSTS.has(refererHost)) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        )
      }
    } catch {
      // Malformed referer -- reject
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  // Validate token presence
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Missing token' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Verify JWT
  const payload = await verifyAudioToken(token)
  if (!payload) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Verify token IP binding -- reject if request comes from a different IP
  const requestIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  if (payload.ip !== requestIp) {
    return new Response(
      JSON.stringify({ error: 'Token IP mismatch' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Look up chapter config to get the audio filename
  const chapter = CHAPTER_BY_SLUG.get(payload.chapter)
  if (!chapter) {
    return new Response(
      JSON.stringify({ error: 'Chapter not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const audioFile = payload.lang === 'es' ? chapter.audioFileEs : chapter.audioFileEn
  if (!audioFile) {
    return new Response(
      JSON.stringify({ error: 'Audio not available for this chapter/language' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Voice-aware directory: 'es' -> 'es', 'es' + male -> 'es-male'
  const voiceSuffix = payload.voice === 'male' ? '-male' : ''
  const langDir = `${payload.lang}${voiceSuffix}`

  // Resolve file path
  const filePath = path.resolve(AUDIO_BASE_PATH, langDir, audioFile)

  // Path traversal defense -- ensure resolved path stays within AUDIO_BASE_PATH
  const resolvedBase = path.resolve(AUDIO_BASE_PATH)
  if (!filePath.startsWith(resolvedBase)) {
    return new Response(
      JSON.stringify({ error: 'Invalid file path' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Check file exists
  if (!fs.existsSync(filePath)) {
    return new Response(
      JSON.stringify({ error: 'Audio file not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Get file stats
  const stat = fs.statSync(filePath)
  const fileSize = stat.size

  // Common headers for all responses
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'audio/mpeg',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, no-store',
  }

  // Handle Range Requests (critical for mobile Safari seeking)
  const rangeHeader = request.headers.get('range')
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
    if (match) {
      const start = parseInt(match[1], 10)
      const end = match[2] ? parseInt(match[2], 10) : fileSize - 1

      // Validate range
      if (start >= fileSize) {
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` },
        })
      }

      const clampedEnd = Math.min(end, fileSize - 1)
      const contentLength = clampedEnd - start + 1

      const stream = fs.createReadStream(filePath, { start, end: clampedEnd })
      const readableStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk))
          })
          stream.on('end', () => {
            controller.close()
          })
          stream.on('error', (err) => {
            controller.error(err)
          })
        },
        cancel() {
          stream.destroy()
        },
      })

      return new Response(readableStream, {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Length': contentLength.toString(),
          'Content-Range': `bytes ${start}-${clampedEnd}/${fileSize}`,
        },
      })
    }
  }

  // Full file response (no Range header)
  const stream = fs.createReadStream(filePath)
  const readableStream = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk))
      })
      stream.on('end', () => {
        controller.close()
      })
      stream.on('error', (err) => {
        controller.error(err)
      })
    },
    cancel() {
      stream.destroy()
    },
  })

  return new Response(readableStream, {
    status: 200,
    headers: {
      ...baseHeaders,
      'Content-Length': fileSize.toString(),
    },
  })
}
