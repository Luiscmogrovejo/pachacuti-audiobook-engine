// src/lib/crypto/key-exchange.ts -- Session key derivation for content decryption
// Server-side only: derives per-session keys from the master key via HKDF

/// <reference types="node" />

import { getMasterKey, deriveSessionKey } from './encrypt.server'

export interface SessionKeyPayload {
  /** Base64-encoded 32-byte derived key */
  key: string
  /** List of chapter slugs this key is authorized to decrypt */
  chapters: string[]
}

/**
 * Create a session key payload with a derived key and authorized chapter list.
 * The session key is derived via HKDF: master key + info=pachacuti:session:{sessionId}
 * This means each session gets a unique key, but the same session always gets the same key.
 */
export function createSessionKeyPayload(
  sessionId: string,
  authorizedChapters: string[],
): SessionKeyPayload {
  const masterKey = getMasterKey()
  const sessionKey = deriveSessionKey(masterKey, sessionId)

  return {
    key: sessionKey.toString('base64'),
    chapters: authorizedChapters,
  }
}
