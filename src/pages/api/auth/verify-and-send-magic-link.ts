// src/pages/api/auth/verify-and-send-magic-link.ts
// Pre-flight endpoint: verify Turnstile token server-side, then trigger magic link via Better Auth
// POST { email, callbackURL, turnstileToken }
// Returns 200 on success, 400 on bad input, 403 on failed Turnstile verification

import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth/server'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Verify a Turnstile token server-side via Cloudflare's siteverify API.
 * Returns true if verification succeeds or if TURNSTILE_SECRET_KEY is not configured (dev fallback).
 */
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = import.meta.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    // Dev mode: skip verification when secret not configured
    return true
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: ip,
      }),
    })
    const data = await response.json() as { success: boolean }
    return data.success === true
  } catch {
    // Network error verifying Turnstile -- reject to be safe
    return false
  }
}

/**
 * Extract client IP, preferring cf-connecting-ip for Cloudflare Tunnel deployments.
 */
function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export const POST: APIRoute = async ({ request }) => {
  // Parse request body
  let body: { email?: string; callbackURL?: string; turnstileToken?: string }
  try {
    body = await request.json() as { email?: string; callbackURL?: string; turnstileToken?: string }
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { email, callbackURL, turnstileToken } = body

  // Validate required fields
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return new Response(
      JSON.stringify({ error: 'Valid email is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (!turnstileToken || typeof turnstileToken !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Turnstile token is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Verify Turnstile token server-side
  const ip = getClientIp(request)
  const isValid = await verifyTurnstile(turnstileToken, ip)
  if (!isValid) {
    return new Response(
      JSON.stringify({ error: 'Verification failed' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Turnstile passed -- trigger magic link via Better Auth server-side API
  try {
    await auth.api.signInMagicLink({
      body: {
        email: email.trim(),
        callbackURL: callbackURL || '/listen/prologue',
      },
    })

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to send magic link' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
