// scripts/validate-assets.ts -- validate all asset references against actual files on disk
// Run: npx tsx scripts/validate-assets.ts
// Produces: asset-manifest.json in project root

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

// ── Import data from src/lib/data/ ────────────────────────────────
// We can't import .ts modules directly, so we'll read and eval them.
// Instead, let's just inline the logic and read from the data files.

// Helper: check if file exists relative to project root
function exists(relativePath: string): boolean {
  return existsSync(join(ROOT, relativePath))
}

// Helper: list files in a directory
function listDir(relativePath: string): string[] {
  const dir = join(ROOT, relativePath)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
}

// Helper: check frontmatter for status: "pending"
function isPlaceholder(filePath: string): boolean {
  try {
    const content = readFileSync(join(ROOT, filePath), 'utf-8')
    return content.includes('status: "pending"') || content.includes("status: 'pending'")
  } catch {
    return false
  }
}

// Helper: check if file has YAML frontmatter with a specific field
function hasFrontmatter(filePath: string): boolean {
  try {
    const content = readFileSync(join(ROOT, filePath), 'utf-8')
    return content.startsWith('---')
  } catch {
    return false
  }
}

interface ManifestSummary {
  total_assets: number
  present: number
  missing: number
  placeholders: number
}

interface ManifestResult {
  generated: string
  summary: ManifestSummary
  chapters: {
    text: { present: number; placeholders: number; missing: string[] }
    audio: { present: number; missing: string[] }
  }
  scenes: {
    present: number
    missing_from_data: string[]
    chapters_without_scenes: number[]
  }
  backgrounds: {
    present: number
    chapters_without_bg: number[]
  }
  characters: {
    md_files: number
    portraits_webp: number
    portraits_avif: number
    missing: string[]
  }
  glossary: {
    terms: number
    audio_files: number
    terms_without_audio: string[]
  }
  fonts: {
    present: number
    missing: string[]
  }
}

// ── Chapter definitions (mirrors src/lib/data/chapters.ts) ──────
interface ChapterDef {
  slug: string
  chapter: number
  audioFileEs: string | null
  audioFileEn: string | null
}

// Parse chapters.ts to extract chapter data
function parseChapters(): ChapterDef[] {
  const content = readFileSync(join(ROOT, 'src/lib/data/chapters.ts'), 'utf-8')
  const chapters: ChapterDef[] = []

  // Match each chapter entry
  const entries = content.matchAll(
    /\{\s*slug:\s*"([^"]+)",\s*chapter:\s*(\d+),.*?audioFileEs:\s*(?:"([^"]+)"|null),\s*audioFileEn:\s*(?:"([^"]+)"|null)/gs
  )

  for (const match of entries) {
    chapters.push({
      slug: match[1],
      chapter: parseInt(match[2]),
      audioFileEs: match[3] || null,
      audioFileEn: match[4] || null,
    })
  }

  return chapters
}

// Parse themes.ts to extract bg paths
function parseThemeBgs(): Map<string, string | null> {
  const content = readFileSync(join(ROOT, 'src/lib/data/themes.ts'), 'utf-8')
  const bgs = new Map<string, string | null>()

  const entries = content.matchAll(
    /slug:\s*'([^']+)',\s*\n\s*bg:\s*(?:'([^']+)'|null)/g
  )

  for (const match of entries) {
    bgs.set(match[1], match[2] || null)
  }

  return bgs
}

// Parse scenes.ts to extract image paths grouped by chapter
function parseSceneImages(): Map<number, string[]> {
  const content = readFileSync(join(ROOT, 'src/lib/data/scenes.ts'), 'utf-8')
  const scenes = new Map<number, string[]>()

  // Initialize all 24 chapters
  for (let i = 0; i <= 23; i++) {
    scenes.set(i, [])
  }

  // Find all scene entries with chapter + imagePath
  const entryPattern = /chapter:\s*(\d+),\s*imagePath:\s*"([^"]+)"/g
  for (const match of content.matchAll(entryPattern)) {
    const chNum = parseInt(match[1])
    const imgPath = match[2]
    const existing = scenes.get(chNum) || []
    existing.push(imgPath)
    scenes.set(chNum, existing)
  }

  return scenes
}

// Parse characters.ts to extract slugs
function parseCharacterSlugs(): string[] {
  const content = readFileSync(join(ROOT, 'src/lib/data/characters.ts'), 'utf-8')
  const slugs: string[] = []

  const pattern = /slug:\s*"([^"]+)"/g
  for (const match of content.matchAll(pattern)) {
    slugs.push(match[1])
  }

  return slugs
}

// Parse glossary.ts to extract words
function parseGlossaryWords(): string[] {
  const content = readFileSync(join(ROOT, 'src/lib/data/glossary.ts'), 'utf-8')
  const words: string[] = []

  const pattern = /word:\s*"([^"]+)"/g
  for (const match of content.matchAll(pattern)) {
    words.push(match[1])
  }

  return words
}

// ── Main validation ────────────────────────────────────────────────

function validate(): ManifestResult {
  const chapters = parseChapters()
  const themeBgs = parseThemeBgs()
  const sceneImages = parseSceneImages()
  const characterSlugs = parseCharacterSlugs()
  const glossaryWords = parseGlossaryWords()

  let totalAssets = 0
  let presentAssets = 0
  let missingAssets = 0
  let placeholderCount = 0

  // 1. Chapter text validation
  const textPresent: string[] = []
  const textPlaceholders: string[] = []
  const textMissing: string[] = []

  const esFiles = listDir('content/chapters/es')
  const enFiles = listDir('content/chapters/en')

  for (const ch of chapters) {
    // ES
    const esMatch = esFiles.find(f => f.endsWith('.md'))
    const esExists = esFiles.length > 0
    totalAssets++
    if (esExists) {
      // Check if any file matches this chapter
      const matching = esFiles.find(f => {
        if (ch.chapter === 0) return f.startsWith('00-')
        const prefix = String(ch.chapter).padStart(2, '0') + '-'
        return f.startsWith(prefix)
      })
      if (matching) {
        const filePath = `content/chapters/es/${matching}`
        if (isPlaceholder(filePath)) {
          textPlaceholders.push(`ch${ch.chapter}-es`)
          placeholderCount++
        } else {
          textPresent.push(`ch${ch.chapter}-es`)
        }
        presentAssets++
      } else {
        textMissing.push(`ch${ch.chapter}-es`)
        missingAssets++
      }
    } else {
      textMissing.push(`ch${ch.chapter}-es`)
      missingAssets++
    }

    // EN
    totalAssets++
    const enMatching = enFiles.find(f => {
      if (ch.chapter === 0) return f.startsWith('00-')
      const prefix = String(ch.chapter).padStart(2, '0') + '-'
      return f.startsWith(prefix)
    })
    if (enMatching) {
      const filePath = `content/chapters/en/${enMatching}`
      if (isPlaceholder(filePath)) {
        textPlaceholders.push(`ch${ch.chapter}-en`)
        placeholderCount++
      } else {
        textPresent.push(`ch${ch.chapter}-en`)
      }
      presentAssets++
    } else {
      textMissing.push(`ch${ch.chapter}-en`)
      missingAssets++
    }
  }

  // 2. Chapter audio validation
  const audioPresent: string[] = []
  const audioMissing: string[] = []

  for (const ch of chapters) {
    if (ch.audioFileEs) {
      totalAssets++
      if (exists(`public/audio/chapters/es/${ch.audioFileEs}`)) {
        audioPresent.push(`ch${ch.chapter}-es`)
        presentAssets++
      } else {
        audioMissing.push(`ch${ch.chapter}-es`)
        missingAssets++
      }
    } else {
      audioMissing.push(`ch${ch.chapter}-es (no audio)`)
    }

    if (ch.audioFileEn) {
      totalAssets++
      if (exists(`public/audio/chapters/en/${ch.audioFileEn}`)) {
        audioPresent.push(`ch${ch.chapter}-en`)
        presentAssets++
      } else {
        audioMissing.push(`ch${ch.chapter}-en`)
        missingAssets++
      }
    } else {
      audioMissing.push(`ch${ch.chapter}-en (no audio)`)
    }
  }

  // 3. Scene image validation
  let scenesPresent = 0
  const scenesMissingFromData: string[] = []
  const chaptersWithoutScenes: number[] = []

  for (const [chNum, paths] of sceneImages) {
    if (paths.length === 0) {
      chaptersWithoutScenes.push(chNum)
      continue
    }
    for (const imgPath of paths) {
      totalAssets++
      // imgPath is like "/art/scenes/ch01-scene-01.webp" -> check public/art/scenes/...
      const publicPath = `public${imgPath}`
      if (exists(publicPath)) {
        scenesPresent++
        presentAssets++
      } else {
        scenesMissingFromData.push(imgPath)
        missingAssets++
      }
    }
  }

  // 4. Background image validation
  let bgPresent = 0
  const chaptersWithoutBg: number[] = []

  for (const ch of chapters) {
    const bgPath = themeBgs.get(ch.slug)
    if (bgPath) {
      totalAssets++
      if (exists(`public${bgPath}`)) {
        bgPresent++
        presentAssets++
      } else {
        missingAssets++
      }
    } else {
      chaptersWithoutBg.push(ch.chapter)
    }
  }

  // 5. Character portrait validation
  let charMdFiles = 0
  let charWebp = 0
  let charAvif = 0
  const charMissing: string[] = []

  for (const slug of characterSlugs) {
    // MD file
    totalAssets++
    if (exists(`content/characters/${slug}.md`)) {
      charMdFiles++
      presentAssets++
    } else {
      charMissing.push(`${slug}.md`)
      missingAssets++
    }

    // WebP portrait
    totalAssets++
    if (exists(`content/characters/${slug}.webp`)) {
      charWebp++
      presentAssets++
    } else {
      charMissing.push(`${slug}.webp`)
      missingAssets++
    }

    // AVIF portrait
    totalAssets++
    if (exists(`content/characters/${slug}.avif`)) {
      charAvif++
      presentAssets++
    } else {
      charMissing.push(`${slug}.avif`)
      missingAssets++
    }
  }

  // 6. Glossary audio validation
  const glossaryAudioDir = listDir('public/audio/glossary')
  let glossaryAudioCount = 0
  const termsWithoutAudio: string[] = []

  for (const word of glossaryWords) {
    const audioFilename = word
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
      .replace(/[^a-z0-9\s-]/g, '')     // Remove non-alphanumeric
      .replace(/\s+/g, '-')             // Replace spaces with hyphens
      .replace(/-+/g, '-')              // Collapse multiple hyphens
      + '.mp3'

    totalAssets++
    if (glossaryAudioDir.includes(audioFilename)) {
      glossaryAudioCount++
      presentAssets++
    } else {
      // Try alternate: the word itself lowercased with hyphens
      const altFilename = word.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '') + '.mp3'
      if (glossaryAudioDir.includes(altFilename)) {
        glossaryAudioCount++
        presentAssets++
      } else {
        termsWithoutAudio.push(word)
        missingAssets++
      }
    }
  }

  // 7. Font validation
  const expectedFonts = [
    'Cinzel-Bold.woff2',
    'Cinzel-Regular.woff2',
    'CinzelDecorative-Regular.woff2',
    'CrimsonText-Italic.woff2',
    'CrimsonText-Regular.woff2',
    'IMFellEnglish-Regular.woff2',
  ]
  let fontsPresent = 0
  const fontsMissing: string[] = []

  for (const font of expectedFonts) {
    totalAssets++
    if (exists(`public/fonts/${font}`)) {
      fontsPresent++
      presentAssets++
    } else {
      fontsMissing.push(font)
      missingAssets++
    }
  }

  return {
    generated: new Date().toISOString(),
    summary: {
      total_assets: totalAssets,
      present: presentAssets,
      missing: missingAssets,
      placeholders: placeholderCount,
    },
    chapters: {
      text: {
        present: textPresent.length,
        placeholders: textPlaceholders.length,
        missing: textMissing,
      },
      audio: {
        present: audioPresent.length,
        missing: audioMissing,
      },
    },
    scenes: {
      present: scenesPresent,
      missing_from_data: scenesMissingFromData,
      chapters_without_scenes: chaptersWithoutScenes,
    },
    backgrounds: {
      present: bgPresent,
      chapters_without_bg: chaptersWithoutBg,
    },
    characters: {
      md_files: charMdFiles,
      portraits_webp: charWebp,
      portraits_avif: charAvif,
      missing: charMissing,
    },
    glossary: {
      terms: glossaryWords.length,
      audio_files: glossaryAudioCount,
      terms_without_audio: termsWithoutAudio,
    },
    fonts: {
      present: fontsPresent,
      missing: fontsMissing,
    },
  }
}

// ── Run ────────────────────────────────────────────────────────────

const result = validate()

// Write JSON manifest
const manifestPath = join(ROOT, 'asset-manifest.json')
writeFileSync(manifestPath, JSON.stringify(result, null, 2) + '\n')

// Print human-readable summary
console.log('\n=== Pachacuti Asset Validation ===\n')
console.log(`Total assets checked: ${result.summary.total_assets}`)
console.log(`Present: ${result.summary.present}`)
console.log(`Missing: ${result.summary.missing}`)
console.log(`Placeholders: ${result.summary.placeholders}`)
console.log('')

console.log(`Chapters text: ${result.chapters.text.present} present, ${result.chapters.text.placeholders} placeholders, ${result.chapters.text.missing.length} missing`)
console.log(`Chapters audio: ${result.chapters.audio.present} present, ${result.chapters.audio.missing.length} missing/pending`)
console.log(`Scenes: ${result.scenes.present} present, ${result.scenes.missing_from_data.length} referenced but missing`)
console.log(`Backgrounds: ${result.backgrounds.present} present, ${result.backgrounds.chapters_without_bg.length} chapters without bg`)
console.log(`Characters: ${result.characters.md_files} md, ${result.characters.portraits_webp} webp, ${result.characters.portraits_avif} avif`)
console.log(`Glossary: ${result.glossary.terms} terms, ${result.glossary.audio_files} audio files, ${result.glossary.terms_without_audio.length} without audio`)
console.log(`Fonts: ${result.fonts.present}/${6} present`)

if (result.scenes.missing_from_data.length > 0) {
  console.log('\nERROR: Scene data references non-existent files:')
  for (const f of result.scenes.missing_from_data) {
    console.log(`  - ${f}`)
  }
}

if (result.characters.missing.length > 0) {
  console.log('\nWARNING: Missing character files:')
  for (const f of result.characters.missing) {
    console.log(`  - ${f}`)
  }
}

if (result.fonts.missing.length > 0) {
  console.log('\nERROR: Missing fonts:')
  for (const f of result.fonts.missing) {
    console.log(`  - ${f}`)
  }
}

console.log('\nManifest written to: asset-manifest.json')

// Exit with code 1 if any data file references a non-existent file
// (known gaps like ch13-23 audio are warnings, not errors)
const hasDataErrors = result.scenes.missing_from_data.length > 0 || result.fonts.missing.length > 0
if (hasDataErrors) {
  console.log('\nFAILED: Data integrity errors found')
  process.exit(1)
} else {
  console.log('\nPASSED: No data integrity errors')
  process.exit(0)
}
