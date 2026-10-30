// src/lib/crypto/encrypt.server.ts -- Server-side AES-256-GCM encryption + HKDF key derivation
// Astro SSR convention: .server.ts suffix prevents client-side bundling
// Used by API routes (import.meta.env) and referenced by CLI scripts (process.env)

/// <reference types="node" />
import { randomBytes, createCipheriv, hkdfSync, createHash } from 'crypto'
import type { EncryptedChunk } from './types'

/**
 * Get the master encryption key from environment.
 * Tries import.meta.env first (Astro SSR), then process.env (CLI scripts).
 */
function getKeyString(): string {
  // Astro SSR context
  try {
    const astroKey = import.meta.env?.CONTENT_MASTER_KEY
    if (astroKey) return astroKey
  } catch {
    // import.meta.env not available (CLI context)
  }

  // CLI / Node.js context
  const nodeKey = process.env.CONTENT_MASTER_KEY
  if (nodeKey) return nodeKey

  throw new Error('CONTENT_MASTER_KEY not set in import.meta.env or process.env')
}

/**
 * Load and validate the master key.
 * Auto-detects hex (64-char) vs base64 encoding.
 */
function loadMasterKey(): Buffer {
  const keyStr = getKeyString()
  const isHex = /^[0-9a-f]{64}$/i.test(keyStr)
  const key = isHex ? Buffer.from(keyStr, 'hex') : Buffer.from(keyStr, 'base64')
  if (key.length !== 32) {
    throw new Error(
      `CONTENT_MASTER_KEY must be 32 bytes (got ${key.length} from ${isHex ? 'hex' : 'base64'})`
    )
  }
  return key
}

/** Get the validated 32-byte master key */
export function getMasterKey(): Buffer {
  return loadMasterKey()
}

/**
 * Derive a session-scoped key from the master key using HKDF.
 * Used by /api/crypto/session-key to issue per-session derived keys.
 * info label: pachacuti:session:{sessionId}
 */
export function deriveSessionKey(masterKey: Buffer, sessionId: string): Buffer {
  return Buffer.from(
    hkdfSync('sha256', masterKey, '', `pachacuti:session:${sessionId}`, 32)
  )
}

/**
 * Encrypt a single chunk with AES-GCM-256.
 * Wire format: IV (hex) + [ciphertext + 16-byte authTag] (base64)
 * Compatible with SubtleCrypto.decrypt({ name: "AES-GCM" })
 */
export function encryptChunk(plaintext: Buffer, key: Buffer): EncryptedChunk {
  const iv = randomBytes(12) // 96-bit IV -- unique per chunk
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const ciphertextBody = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const authTag = cipher.getAuthTag() // 16-byte GCM authentication tag

  // CRITICAL: WebCrypto expects [ciphertext][authTag] -- NOT [authTag][ciphertext]
  const dataWithTag = Buffer.concat([ciphertextBody, authTag])

  return {
    iv: iv.toString('hex'),
    data: dataWithTag.toString('base64'),
    index: 0, // caller sets this
  }
}

/**
 * Compute SHA-256 of plaintext for integrity verification.
 */
export function hashPlaintext(plaintext: Buffer): string {
  return createHash('sha256').update(plaintext).digest('hex')
}
