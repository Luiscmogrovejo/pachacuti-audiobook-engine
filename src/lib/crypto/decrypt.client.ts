// src/lib/crypto/decrypt.client.ts
// Browser-only: SubtleCrypto AES-GCM decryption
// DO NOT import server-only modules here
// Wire format expected: IV is hex-encoded 12 bytes; data is base64 [ciphertext+authTag]
// This matches exactly what encryptChunk() in encrypt.server.ts produces

import type { EncryptedChunk, EncryptedChapterManifest } from './types'

/**
 * Import raw key bytes as a non-extractable AES-GCM CryptoKey.
 * The key bytes come from /api/crypto/session-key response.
 * extractable: false prevents naive key export from DevTools heap.
 */
export async function importKeyBytes(keyBytes: ArrayBuffer): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false, // extractable: false -- correct choice for this threat model
    ['decrypt'],
  )
}

/**
 * Decrypt a single chunk using SubtleCrypto AES-GCM.
 * Wire format: IV is hex-encoded 12 bytes; data is base64 [ciphertext+16-byte-tag].
 * The decrypted result is an ArrayBuffer -- convert to string with TextDecoder if text,
 * use directly as audio data buffer if audio.
 */
export async function decryptChunk(
  chunk: EncryptedChunk,
  cryptoKey: CryptoKey,
): Promise<ArrayBuffer> {
  const iv = hexToBytes(chunk.iv)
  const dataWithTag = base64ToBytes(chunk.data)

  // SubtleCrypto AES-GCM: expects [ciphertext+authTag] -- tag is last 16 bytes
  // This matches our wire format exactly -- no rearrangement needed
  return window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    cryptoKey,
    dataWithTag.buffer as ArrayBuffer,
  )
}

/**
 * Decrypt a single text chunk and return as string.
 */
export async function decryptTextChunk(
  chunk: EncryptedChunk,
  cryptoKey: CryptoKey,
): Promise<string> {
  const decrypted = await decryptChunk(chunk, cryptoKey)
  return new TextDecoder('utf-8').decode(decrypted)
}

/**
 * Decrypt all text chunks in a manifest and return the full chapter as paragraph array.
 * Chunks are decrypted in index order.
 */
export async function decryptAllTextChunks(
  manifest: EncryptedChapterManifest,
  cryptoKey: CryptoKey,
): Promise<string[]> {
  const decoder = new TextDecoder('utf-8')
  const sortedChunks = [...manifest.chunks].sort((a, b) => a.index - b.index)

  const paragraphs: string[] = []
  for (const chunk of sortedChunks) {
    const decrypted = await decryptChunk(chunk, cryptoKey)
    paragraphs.push(decoder.decode(decrypted))
  }
  return paragraphs
}

/**
 * Decrypt a single audio chunk and return as ArrayBuffer (ready for Blob/objectURL).
 */
export async function decryptAudioChunk(
  chunk: EncryptedChunk,
  cryptoKey: CryptoKey,
): Promise<ArrayBuffer> {
  return decryptChunk(chunk, cryptoKey)
}

// Utility: hex string -> Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

// Utility: base64 string -> Uint8Array
function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
