#!/usr/bin/env npx tsx
// scripts/encrypt-images.ts
// Run: npx tsx scripts/encrypt-images.ts [--chapter 0] [--dry-run]
// Requires: CONTENT_MASTER_KEY in environment (use .env.local)
// Encrypts scene images from public/art/scenes/chNN/*.webp
// Each image is a single encrypted chunk (images are 80-200KB each)

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
  statSync,
} from 'fs'
import { join, basename } from 'path'
import { randomBytes, createCipheriv, createHash } from 'crypto'
import { config } from 'dotenv'
import type { EncryptedChunk, EncryptedImageManifest } from '../src/lib/crypto/types'

// Load .env.local (dotenv does NOT read .env.local by default)
config({ path: join(process.cwd(), '.env.local') })
config() // fallback to .env

// --- Inline crypto functions (avoid server-only import in CLI script) ---

function loadMasterKey(): Buffer {
  const keyStr = process.env.CONTENT_MASTER_KEY
  if (!keyStr) throw new Error('CONTENT_MASTER_KEY not set')
  const isHex = /^[0-9a-f]{64}$/i.test(keyStr)
  const key = isHex ? Buffer.from(keyStr, 'hex') : Buffer.from(keyStr, 'base64')
  if (key.length !== 32)
    throw new Error(`CONTENT_MASTER_KEY must be 32 bytes (got ${key.length} from ${isHex ? 'hex' : 'base64'})`)
  return key
}

function encryptChunk(plaintext: Buffer, key: Buffer): EncryptedChunk {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertextBody = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const authTag = cipher.getAuthTag()
  const dataWithTag = Buffer.concat([ciphertextBody, authTag])
  return {
    iv: iv.toString('hex'),
    data: dataWithTag.toString('base64'),
    index: 0,
  }
}

// --- Scene image discovery ---
// Scans public/art/scenes/chNN/ for .webp files

const SCENES_BASE = join(process.cwd(), 'public', 'art', 'scenes')

interface SceneChapter {
  chapterDir: string  // e.g. "ch00"
  chapterNum: number
  images: string[]    // full paths to .webp files
}

function discoverSceneChapters(): SceneChapter[] {
  if (!existsSync(SCENES_BASE)) {
    console.error(`ERROR: Scenes directory not found: ${SCENES_BASE}`)
    process.exit(1)
  }

  const chapters: SceneChapter[] = []
  const dirs = readdirSync(SCENES_BASE).filter((d) => /^ch\d{2}$/.test(d)).sort()

  for (const dir of dirs) {
    const chapterPath = join(SCENES_BASE, dir)
    const stat = statSync(chapterPath)
    if (!stat.isDirectory()) continue

    const images = readdirSync(chapterPath)
      .filter((f) => f.endsWith('.webp'))
      .sort()
      .map((f) => join(chapterPath, f))

    if (images.length === 0) continue

    const num = parseInt(dir.replace('ch', ''), 10)
    chapters.push({ chapterDir: dir, chapterNum: num, images })
  }

  return chapters
}

function encryptSceneImages(
  chapter: SceneChapter,
  dryRun: boolean,
  masterKey: Buffer,
): void {
  console.log(`\nProcessing images: ${chapter.chapterDir} (${chapter.images.length} WebP files)`)

  if (dryRun) {
    let totalSize = 0
    for (const imgPath of chapter.images) {
      const stat = statSync(imgPath)
      const sizeKB = (stat.size / 1024).toFixed(1)
      console.log(`  DRY RUN: ${basename(imgPath)} (${sizeKB}KB)`)
      totalSize += stat.size
    }
    console.log(`  DRY RUN: Total ${(totalSize / 1024).toFixed(1)}KB across ${chapter.images.length} files`)
    return
  }

  const chunks: EncryptedChunk[] = []
  const imagePaths: string[] = []

  for (const [index, imgPath] of chapter.images.entries()) {
    const imageData = readFileSync(imgPath)
    const encrypted = encryptChunk(imageData, masterKey)
    chunks.push({ ...encrypted, index })
    imagePaths.push(basename(imgPath))
  }

  const manifest: EncryptedImageManifest = {
    chapter: chapter.chapterDir,
    type: 'image',
    imagePaths,
    chunkCount: chunks.length,
    encryptedAt: new Date().toISOString(),
    chunks,
  }

  const outputDir = join(process.cwd(), 'content/encrypted/images', chapter.chapterDir)
  mkdirSync(outputDir, { recursive: true })

  // Write one manifest per chapter (all images in one file)
  const outputPath = join(outputDir, `${chapter.chapterDir}.enc.json`)
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8')

  const manifestSizeKB = (Buffer.byteLength(JSON.stringify(manifest)) / 1024).toFixed(1)
  console.log(`  Written: ${outputPath} (${chunks.length} images, ${manifestSizeKB}KB)`)
}

// --- CLI entry point ---

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const chapterFlag = args.findIndex((a) => a === '--chapter')
const targetChapter = chapterFlag >= 0 ? parseInt(args[chapterFlag + 1], 10) : null

const sceneChapters = discoverSceneChapters()

if (targetChapter !== null) {
  const found = sceneChapters.find((c) => c.chapterNum === targetChapter)
  if (!found) {
    const valid = sceneChapters.map((c) => c.chapterNum).join(', ')
    console.error(`No scene images for chapter ${targetChapter}. Chapters with scenes: ${valid}`)
    process.exit(1)
  }
}

const chapters = targetChapter !== null
  ? sceneChapters.filter((c) => c.chapterNum === targetChapter)
  : sceneChapters

const totalImages = chapters.reduce((sum, c) => sum + c.images.length, 0)

console.log(`Image encryption mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
console.log(`Chapters with scenes: ${chapters.length}`)
console.log(`Total WebP images: ${totalImages}`)

const masterKey = loadMasterKey()
let encrypted = 0

for (const chapter of chapters) {
  encryptSceneImages(chapter, dryRun, masterKey)
  encrypted += chapter.images.length
}

console.log(`\nDone. Processed ${encrypted} scene images across ${chapters.length} chapters.`)
