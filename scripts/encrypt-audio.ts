#!/usr/bin/env npx tsx
// scripts/encrypt-audio.ts
// Run: npx tsx scripts/encrypt-audio.ts [--chapter prologue] [--lang es] [--dry-run]
// Requires: CONTENT_MASTER_KEY in environment + ffmpeg installed
// Dynamically scans public/audio/chapters/{es,en}/ for all available MP3s

import { execSync } from 'child_process'
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  existsSync,
  rmSync,
  statSync,
} from 'fs'
import { join, basename } from 'path'
import { randomBytes, createCipheriv, createHash } from 'crypto'
import { config } from 'dotenv'
import type { EncryptedChapterManifest, EncryptedChunk } from '../src/lib/crypto/types'

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

// --- Check ffmpeg availability ---

function checkFfmpeg(): void {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' })
  } catch {
    console.error('ERROR: ffmpeg not found. Install with:')
    console.error('  macOS: brew install ffmpeg')
    console.error('  Linux: sudo apt install ffmpeg')
    process.exit(1)
  }
}

// --- Dynamic audio mapping ---
// Scans public/audio/chapters/{es,en}/ for MP3 files

const AUDIO_BASE = join(process.cwd(), 'public', 'audio', 'chapters')

/** Map chapter number prefix (e.g., "00", "01") to a slug name */
function chapterNumToSlug(num: string): string {
  const n = parseInt(num, 10)
  if (n === 0) return 'prologue'
  return `chapter-${num}`
}

interface AudioEntry {
  slug: string
  es?: string
  en?: string
}

function buildAudioMap(): Map<string, AudioEntry> {
  const map = new Map<string, AudioEntry>()

  for (const lang of ['es', 'en']) {
    const langDir = join(AUDIO_BASE, lang)
    if (!existsSync(langDir)) continue

    const files = readdirSync(langDir).filter((f) => f.endsWith('.mp3')).sort()
    for (const file of files) {
      const match = file.match(/^(\d{2})-/)
      if (!match) continue

      const num = match[1]
      const slug = chapterNumToSlug(num)
      const filePath = join(langDir, file)

      if (!map.has(slug)) {
        map.set(slug, { slug })
      }
      const entry = map.get(slug)!
      if (lang === 'es') entry.es = filePath
      else entry.en = filePath
    }
  }

  return map
}

const CHUNK_DURATION_SECONDS = 30
const TMP_DIR = '/tmp/pachacuti-audio-chunks'
const MAX_MANIFEST_WARN_MB = 50

function splitMp3(sourcePath: string, outputDir: string): string[] {
  mkdirSync(outputDir, { recursive: true })
  execSync(
    `ffmpeg -y -i "${sourcePath}" -f segment -segment_time ${CHUNK_DURATION_SECONDS} ` +
    `-c copy "${outputDir}/chunk_%03d.mp3" 2>/dev/null`,
    { stdio: 'pipe' },
  )
  return readdirSync(outputDir)
    .filter((f) => f.endsWith('.mp3'))
    .sort()
    .map((f) => join(outputDir, f))
}

function encryptAudioChapter(
  slug: string,
  lang: string,
  sourcePath: string,
  dryRun: boolean,
  masterKey: Buffer,
): void {
  console.log(`\nProcessing audio: ${slug}/${lang} from ${sourcePath}`)

  if (!existsSync(sourcePath)) {
    console.warn(`  WARNING: Source not found: ${sourcePath} -- skipping`)
    return
  }

  const tmpDir = join(TMP_DIR, `${slug}-${lang}`)

  if (dryRun) {
    try {
      const probe = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${sourcePath}" 2>/dev/null`,
        { encoding: 'utf-8' },
      ).trim()
      const durationSec = parseFloat(probe)
      const estimatedChunks = Math.ceil(durationSec / CHUNK_DURATION_SECONDS)
      const fileStat = statSync(sourcePath)
      const sizeMB = (fileStat.size / 1024 / 1024).toFixed(1)
      console.log(`  DRY RUN: ${sizeMB}MB, duration ${durationSec.toFixed(1)}s, ~${estimatedChunks} chunks at ${CHUNK_DURATION_SECONDS}s each`)
    } catch {
      console.log(`  DRY RUN: would split ${sourcePath} into ${CHUNK_DURATION_SECONDS}s chunks and encrypt`)
    }
    return
  }

  // Split MP3 into 30-second chunks
  console.log(`  Splitting into ${CHUNK_DURATION_SECONDS}s chunks...`)
  const chunkPaths = splitMp3(sourcePath, tmpDir)
  console.log(`  Chunks created: ${chunkPaths.length}`)

  const chunks: EncryptedChunk[] = []

  for (const [index, chunkPath] of chunkPaths.entries()) {
    const chunkData = readFileSync(chunkPath)
    const encrypted = encryptChunk(chunkData, masterKey)
    chunks.push({ ...encrypted, index })

    // Clean up temp chunk file immediately after encrypting
    unlinkSync(chunkPath)
  }

  const manifest: EncryptedChapterManifest = {
    chapter: slug,
    language: lang,
    type: 'audio',
    chunkCount: chunks.length,
    plaintextHash: '', // audio hash omitted -- too large, not needed for integrity check
    encryptedAt: new Date().toISOString(),
    chunks,
  }

  const manifestJson = JSON.stringify(manifest, null, 2)
  const manifestSizeMB = Buffer.byteLength(manifestJson) / 1024 / 1024

  if (manifestSizeMB > MAX_MANIFEST_WARN_MB) {
    console.warn(`  WARNING: Manifest is ${manifestSizeMB.toFixed(1)}MB -- consider chunked file format`)
  }

  const outputDir = join(process.cwd(), 'content/encrypted/audio', slug)
  const outputPath = join(outputDir, `${lang}.enc.json`)
  mkdirSync(outputDir, { recursive: true })
  writeFileSync(outputPath, manifestJson, 'utf-8')
  console.log(`  Written: ${outputPath} (${chunks.length} chunks, ${manifestSizeMB.toFixed(1)}MB)`)

  // Clean up tmp directory
  try {
    rmSync(tmpDir, { recursive: true, force: true })
  } catch { /* ignore cleanup errors */ }
}

// --- CLI entry point ---

checkFfmpeg()

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const chapterFlag = args.findIndex((a) => a === '--chapter')
const langFlag = args.findIndex((a) => a === '--lang')
const targetChapter = chapterFlag >= 0 ? args[chapterFlag + 1] : null
const targetLang = langFlag >= 0 ? args[langFlag + 1] : null

const audioMap = buildAudioMap()

if (targetChapter && !audioMap.has(targetChapter)) {
  console.error(`Unknown chapter: ${targetChapter}. Valid: ${[...audioMap.keys()].join(', ')}`)
  process.exit(1)
}

const slugs = targetChapter ? [targetChapter] : [...audioMap.keys()]
const langs = targetLang ? [targetLang] : ['es', 'en']

console.log(`Audio encryption mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
console.log(`Chapters with audio: ${audioMap.size}`)
console.log(`Chapters: ${slugs.join(', ')}`)
console.log(`Languages: ${langs.join(', ')}`)

const masterKey = loadMasterKey()
let encrypted = 0

for (const slug of slugs) {
  const entry = audioMap.get(slug)
  if (!entry) continue

  for (const lang of langs) {
    const sourcePath = lang === 'es' ? entry.es : entry.en
    if (!sourcePath) {
      console.warn(`No ${lang} audio for ${slug} -- skipping`)
      continue
    }
    encryptAudioChapter(slug, lang, sourcePath, dryRun, masterKey)
    encrypted++
  }
}

console.log(`\nDone. Processed ${encrypted} audio chapter/language pairs.`)
