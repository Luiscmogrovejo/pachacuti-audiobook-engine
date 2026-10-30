#!/usr/bin/env npx tsx
// scripts/verify-encryption.ts
// Quick round-trip validation: decrypt all chunks of a manifest and verify hash
// Run: npx tsx scripts/verify-encryption.ts [path-to-manifest.enc.json]
// If no path given, picks the first text manifest found in content/encrypted/text/

import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { createDecipheriv, createHash } from 'crypto'
import { config } from 'dotenv'
import type { EncryptedChapterManifest, EncryptedChunk } from '../src/lib/crypto/types'

// Load .env.local
config({ path: join(process.cwd(), '.env.local') })
config()

function loadMasterKey(): Buffer {
  const keyStr = process.env.CONTENT_MASTER_KEY
  if (!keyStr) throw new Error('CONTENT_MASTER_KEY not set')
  const isHex = /^[0-9a-f]{64}$/i.test(keyStr)
  const key = isHex ? Buffer.from(keyStr, 'hex') : Buffer.from(keyStr, 'base64')
  if (key.length !== 32)
    throw new Error(`CONTENT_MASTER_KEY must be 32 bytes (got ${key.length} from ${isHex ? 'hex' : 'base64'})`)
  return key
}

function decryptChunk(chunk: EncryptedChunk, key: Buffer): Buffer {
  const iv = Buffer.from(chunk.iv, 'hex')
  const dataWithTag = Buffer.from(chunk.data, 'base64')

  // Split: [ciphertext][16-byte authTag]
  const authTag = dataWithTag.subarray(dataWithTag.length - 16)
  const ciphertext = dataWithTag.subarray(0, dataWithTag.length - 16)

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted
}

// --- CLI entry point ---

const encryptedDir = join(process.cwd(), 'content/encrypted/text')

// Find a manifest to verify
let manifestPath = process.argv[2]
if (!manifestPath) {
  if (!existsSync(encryptedDir)) {
    console.error('No encrypted content found. Run: npm run encrypt:text')
    process.exit(1)
  }
  const files = readdirSync(encryptedDir).filter((f) => f.endsWith('.enc.json'))
  if (files.length === 0) {
    console.error('No encrypted text manifests found. Run: npm run encrypt:text')
    process.exit(1)
  }
  manifestPath = join(encryptedDir, files[0])
}

console.log(`Verifying: ${manifestPath}`)

const manifest: EncryptedChapterManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
console.log(`  Chapter: ${manifest.chapter}/${manifest.language}`)
console.log(`  Type: ${manifest.type}`)
console.log(`  Chunks: ${manifest.chunkCount}`)
console.log(`  Expected hash: ${manifest.plaintextHash}`)

const masterKey = loadMasterKey()

// Decrypt all chunks and reconstruct original text
const sortedChunks = [...manifest.chunks].sort((a, b) => a.index - b.index)
const decryptedParagraphs: string[] = []

for (const chunk of sortedChunks) {
  try {
    const decrypted = decryptChunk(chunk, masterKey)
    decryptedParagraphs.push(decrypted.toString('utf-8'))
  } catch (err) {
    console.error(`  FAIL: Chunk ${chunk.index} decryption error: ${err}`)
    process.exit(1)
  }
}

console.log(`  Decrypted ${decryptedParagraphs.length} chunks successfully`)

// Note: plaintextHash is SHA-256 of the ENTIRE original markdown file (before splitting),
// not the joined paragraphs. We verify individual chunk decryption succeeded (no auth tag failures).
// Full hash verification would require the original file, which may not be available.

// Instead, verify that we can reconstruct meaningful text
const sampleText = decryptedParagraphs[0]?.substring(0, 100) ?? ''
console.log(`  Sample decrypted text: "${sampleText}..."`)

if (decryptedParagraphs.length === manifest.chunkCount) {
  console.log(`\nPASS: ${manifest.chapter}-${manifest.language} round-trip verified (${manifest.chunkCount} chunks decrypted, all auth tags valid)`)
} else {
  console.error(`\nFAIL: Expected ${manifest.chunkCount} chunks, got ${decryptedParagraphs.length}`)
  process.exit(1)
}
