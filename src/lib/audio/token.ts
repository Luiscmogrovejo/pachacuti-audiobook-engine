// src/lib/audio/token.ts -- JWT-based signed audio tokens (5-min expiry)
// Prevents direct MP3 URL access -- listeners must obtain a short-lived token first

import { SignJWT, jwtVerify } from 'jose'

const AUDIO_SECRET = new TextEncoder().encode(
  process.env.AUDIO_TOKEN_SECRET || import.meta.env.AUDIO_TOKEN_SECRET || 'dev-secret-change-in-production'
)
const TOKEN_EXPIRY = '5m' // 5-minute expiry per PROT-01

export interface AudioTokenPayload {
  chapter: string    // e.g., "prologue", "chapter-01"
  lang: 'es' | 'en'
  ip: string         // bound to requester IP for replay prevention
  voice?: 'female' | 'male'  // defaults to 'female' when absent
}

/**
 * Sign a short-lived JWT for audio stream access.
 * Token contains chapter slug and language, expires in 5 minutes.
 */
export async function signAudioToken(payload: AudioTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(AUDIO_SECRET)
}

/**
 * Verify and decode an audio JWT token.
 * Returns the payload if valid, null if expired or invalid.
 */
export async function verifyAudioToken(token: string): Promise<AudioTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, AUDIO_SECRET)
    return {
      chapter: payload.chapter as string,
      lang: payload.lang as 'es' | 'en',
      ip: payload.ip as string,
      voice: (payload.voice as 'female' | 'male') || 'female',
    }
  } catch {
    return null
  }
}
