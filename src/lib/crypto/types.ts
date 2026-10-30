// src/lib/crypto/types.ts -- types shared between encrypt scripts, API routes, and client decryption
// No server-only import needed here -- just type definitions

export interface EncryptedChunk {
  /** Hex-encoded 12-byte IV */
  iv: string
  /** Base64-encoded ciphertext+authTag (WebCrypto-compatible format) */
  data: string
  /** Index of this chunk within the chapter (0-based) */
  index: number
}

export interface EncryptedChapterManifest {
  chapter: string     // e.g. "prologue"
  language: string    // "es" | "en"
  type: 'text' | 'audio'
  chunkCount: number
  /** SHA-256 of original plaintext for content integrity verification */
  plaintextHash: string
  encryptedAt: string // ISO timestamp
  chunks: EncryptedChunk[]
}

export interface EncryptedImageManifest {
  chapter: string     // e.g. "ch00"
  type: 'image'
  /** Original filenames of encrypted images */
  imagePaths: string[]
  chunkCount: number
  encryptedAt: string // ISO timestamp
  chunks: EncryptedChunk[]
}
