#!/usr/bin/env npx tsx
// scripts/encrypt-content.ts
// Run: npx tsx scripts/encrypt-content.ts [--chapter prologue] [--lang es] [--dry-run]
// Requires: CONTENT_MASTER_KEY in environment (use .env.local)
// Dynamically scans content/chapters/{es,en}/ -- supports all 24 chapters

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs'
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

function hashPlaintext(plaintext: Buffer): string {
  return createHash('sha256').update(plaintext).digest('hex')
}

// --- Dynamic chapter mapping ---
// Scans content/chapters/{es,en}/ and builds slug -> { es: path, en: path }

const CHAPTERS_DIR = join(process.cwd(), 'content', 'chapters')
const MIN_FILE_SIZE = 500 // Skip placeholders under 500 bytes

/** Map chapter number prefix (e.g., "00", "01") to a slug name */
function chapterNumToSlug(num: string): string {
  const n = parseInt(num, 10)
  if (n === 0) return 'prologue'
  return `chapter-${num}`
}

interface ChapterEntry {
  slug: string
  es?: string
  en?: string
}

function buildChapterMap(): Map<string, ChapterEntry> {
  const map = new Map<string, ChapterEntry>()

  for (const lang of ['es', 'en']) {
    const langDir = join(CHAPTERS_DIR, lang)
    if (!existsSync(langDir)) continue

    const files = readdirSync(langDir).filter((f) => f.endsWith('.md')).sort()
    for (const file of files) {
      const match = file.match(/^(\d{2})-/)
      if (!match) continue

      const num = match[1]
      const slug = chapterNumToSlug(num)
      const filePath = join(langDir, file)

      // Skip placeholders under MIN_FILE_SIZE
      const stat = statSync(filePath)
      if (stat.size < MIN_FILE_SIZE) continue

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

function splitIntoParagraphs(markdown: string): string[] {
  return markdown
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 10)
}

function encryptChapter(
  slug: string,
  lang: string,
  sourcePath: string,
  dryRun: boolean,
  masterKey: Buffer,
): void {
  console.log(`\nProcessing: ${slug}/${lang} from ${sourcePath}`)

  const markdown = readFileSync(sourcePath, 'utf-8')
  const paragraphs = splitIntoParagraphs(markdown)
  console.log(`  Paragraphs: ${paragraphs.length}`)

  const plaintextBuffer = Buffer.from(markdown, 'utf-8')
  const ptHash = hashPlaintext(plaintextBuffer)

  const chunks: EncryptedChunk[] = paragraphs.map((paragraph, index) => {
    const chunk = encryptChunk(Buffer.from(paragraph, 'utf-8'), masterKey)
    return { ...chunk, index }
  })

  const manifest: EncryptedChapterManifest = {
    chapter: slug,
    language: lang,
    type: 'text',
    chunkCount: chunks.length,
    plaintextHash: ptHash,
    encryptedAt: new Date().toISOString(),
    chunks,
  }

  const outputDir = join(process.cwd(), 'content/encrypted/text')
  const outputPath = join(outputDir, `${slug}-${lang}.enc.json`)

  if (dryRun) {
    console.log(`  DRY RUN: would write ${chunks.length} chunks to ${outputPath}`)
    console.log(`  Sample chunk 0 IV: ${chunks[0]?.iv ?? 'N/A'}`)
    console.log(`  Plaintext hash: ${ptHash}`)
    return
  }

  mkdirSync(outputDir, { recursive: true })
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8')
  console.log(`  Written: ${outputPath}`)
  console.log(`  Chunks: ${chunks.length}, Hash: ${ptHash}`)
}

// CLI entry point
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const chapterFlag = args.findIndex((a) => a === '--chapter')
const langFlag = args.findIndex((a) => a === '--lang')
const targetChapter = chapterFlag >= 0 ? args[chapterFlag + 1] : null
const targetLang = langFlag >= 0 ? args[langFlag + 1] : null

const chapterMap = buildChapterMap()

if (targetChapter && !chapterMap.has(targetChapter)) {
  console.error(`Unknown chapter: ${targetChapter}. Valid: ${[...chapterMap.keys()].join(', ')}`)
  process.exit(1)
}

const slugs = targetChapter ? [targetChapter] : [...chapterMap.keys()]
const langs = targetLang ? [targetLang] : ['es', 'en']

console.log(`Encryption mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
console.log(`Chapters: ${slugs.join(', ')}`)
console.log(`Languages: ${langs.join(', ')}`)
console.log(`Chapters with content (>500 bytes): ${chapterMap.size}`)

const masterKey = loadMasterKey()
let encrypted = 0

for (const slug of slugs) {
  const entry = chapterMap.get(slug)
  if (!entry) continue

  for (const lang of langs) {
    const sourcePath = lang === 'es' ? entry.es : entry.en
    if (!sourcePath) {
      console.warn(`No ${lang} text for ${slug} -- skipping`)
      continue
    }
    encryptChapter(slug, lang, sourcePath, dryRun, masterKey)
    encrypted++
  }
}

console.log(`\nDone. Processed ${encrypted} chapter/language pairs.`)
