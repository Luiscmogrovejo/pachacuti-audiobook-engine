// src/lib/crypto/session.client.ts -- Client-side session key manager
// Fetches session encryption key from /api/crypto/session-key,
// imports as non-extractable CryptoKey, caches in module scope.
// DO NOT import server-only modules here

import { importKeyBytes } from './decrypt.client'

/** Cached session state -- kept in memory, not localStorage */
interface SessionState {
  cryptoKey: CryptoKey
  authorizedChapters: string[]
  rawKeyBase64: string // Kept for token generation (image API)
  fetchedAt: number
}

/** Session key expires after 1 hour; refresh at 50 minutes */
const KEY_EXPIRY_MS = 60 * 60 * 1000
const KEY_REFRESH_MS = 50 * 60 * 1000

/** Module-scope cache -- non-extractable key can't leave memory */
let cachedSession: SessionState | null = null
let fetchPromise: Promise<SessionState> | null = null

/**
 * Convert a base64 string to ArrayBuffer.
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer as ArrayBuffer
}

/**
 * Fetch and cache the session encryption key.
 * Returns a non-extractable CryptoKey and the list of authorized chapters.
 * Caches the key in module scope -- repeat calls return the cache until expiry.
 */
export async function fetchSessionKey(): Promise<{
  cryptoKey: CryptoKey
  authorizedChapters: string[]
  rawKeyBase64: string
}> {
  // Return cached key if still valid
  if (cachedSession && Date.now() - cachedSession.fetchedAt < KEY_EXPIRY_MS) {
    return {
      cryptoKey: cachedSession.cryptoKey,
      authorizedChapters: cachedSession.authorizedChapters,
      rawKeyBase64: cachedSession.rawKeyBase64,
    }
  }

  // Deduplicate concurrent requests
  if (fetchPromise) {
    const result = await fetchPromise
    return {
      cryptoKey: result.cryptoKey,
      authorizedChapters: result.authorizedChapters,
      rawKeyBase64: result.rawKeyBase64,
    }
  }

  fetchPromise = (async (): Promise<SessionState> => {
    try {
      const response = await fetch('/api/crypto/session-key')
      if (!response.ok) {
        throw new Error(`Session key fetch failed: ${response.status}`)
      }

      const data = await response.json()
      const keyBase64 = data.key as string
      const chapters = data.chapters as string[]

      // Import as non-extractable CryptoKey (extractable: false)
      const keyBytes = base64ToArrayBuffer(keyBase64)
      const cryptoKey = await importKeyBytes(keyBytes)

      const session: SessionState = {
        cryptoKey,
        authorizedChapters: chapters,
        rawKeyBase64: keyBase64,
        fetchedAt: Date.now(),
      }

      cachedSession = session

      // Schedule auto-refresh before expiry
      scheduleRefresh()

      return session
    } finally {
      fetchPromise = null
    }
  })()

  return fetchPromise.then((s) => ({
    cryptoKey: s.cryptoKey,
    authorizedChapters: s.authorizedChapters,
    rawKeyBase64: s.rawKeyBase64,
  }))
}

/**
 * Check if a chapter slug is in the authorized list.
 */
export function isChapterAuthorized(slug: string): boolean {
  if (!cachedSession) return false
  return cachedSession.authorizedChapters.includes(slug)
}

/**
 * Get the raw base64 key for use as an image token.
 * Returns null if no session key has been fetched yet.
 */
export function getSessionToken(): string | null {
  if (!cachedSession) return null
  return cachedSession.rawKeyBase64
}

/**
 * Clear the cached session (e.g., on sign out).
 */
export function clearSessionKey(): void {
  cachedSession = null
  fetchPromise = null
}

/** Schedule a background key refresh before expiry */
let refreshTimerId: ReturnType<typeof setTimeout> | null = null

function scheduleRefresh(): void {
  if (refreshTimerId) clearTimeout(refreshTimerId)

  refreshTimerId = setTimeout(async () => {
    // Clear cache so next fetchSessionKey() forces a refresh
    cachedSession = null
    try {
      await fetchSessionKey()
    } catch {
      // Silently fail -- next content request will retry
    }
  }, KEY_REFRESH_MS)
}
