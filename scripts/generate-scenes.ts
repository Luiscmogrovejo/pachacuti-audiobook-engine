#!/usr/bin/env npx tsx
/**
 * scripts/generate-scenes.ts — Unified art generation pipeline for Pachacuti
 *
 * Drives fal.ai Flux 2 Pro + Kontext Pro scene generation with:
 * - ARCH bank for location consistency
 * - STYLE_ANCHOR for visual style consistency
 * - Candidate management (3 per scene)
 * - Cost tracking with running totals
 * - Resume support (skips existing files)
 * - Prompt logging for traceability
 *
 * Usage:
 *   npx tsx scripts/generate-scenes.ts --help
 *   npx tsx scripts/generate-scenes.ts --chapter ch01 --dry-run
 *   npx tsx scripts/generate-scenes.ts --chapter ch13 --schnell
 *   npx tsx scripts/generate-scenes.ts --chapter ch13 --scene 01
 *   npx tsx scripts/generate-scenes.ts --approve ch13-scene-01 b
 *   npx tsx scripts/generate-scenes.ts --test-style
 *   npx tsx scripts/generate-scenes.ts --test-style --schnell
 *
 * IMPORTANT: Requires FAL_KEY in .env.local
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, appendFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import dotenv from 'dotenv'

// Data modules
import { STYLE_ANCHOR, WARM_PALETTE } from './data/style-anchor.js'
import { ARCH } from './data/arch-bank.js'
import { CHAPTER_CONFIG } from './data/chapter-config.js'
import { SCENE_PROMPTS, generateScenePromptId } from './data/scene-prompts.js'
import { buildCharacterIdentityPrefix } from './data/character-identities.js'

// Load .env.local (standard dotenv/config only loads .env)
dotenv.config({ path: '.env.local' })

// Lazy-loaded dependencies (avoid import-time crashes if not needed)
let _fal: typeof import('@fal-ai/client').fal | null = null
let _sharp: typeof import('sharp').default | null = null

async function getFal() {
  if (!_fal) {
    const { fal } = await import('@fal-ai/client')
    fal.config({ credentials: process.env.FAL_KEY })
    _fal = fal
  }
  return _fal!
}

async function getSharp() {
  if (!_sharp) {
    const sharp = await import('sharp')
    _sharp = sharp.default
  }
  return _sharp!
}

// ====================================================================
// PATHS
// ====================================================================
const ROOT = resolve(import.meta.dirname ?? __dirname, '..')
const SCENES_DIR = join(ROOT, 'public/art/scenes')
const BACKGROUNDS_DIR = join(ROOT, 'public/art/backgrounds')
const RAW_DIR = join(ROOT, 'public/art/raw')
const CANDIDATES_DIR = join(ROOT, 'public/art/candidates')
const PROMPT_LOG = join(ROOT, 'public/art/prompt-log.md')
const APPROVAL_LOG = join(ROOT, 'public/art/approval-log.json')

// ====================================================================
// CLI ARGUMENT PARSING
// ====================================================================
const args = process.argv.slice(2)

function getArg(flag: string): string | null {
  const idx = args.indexOf(flag)
  if (idx === -1) return null
  return args[idx + 1] ?? null
}

const FLAG_HELP = args.includes('--help') || args.includes('-h')
const FLAG_DRY_RUN = args.includes('--dry-run')
const FLAG_SCHNELL = args.includes('--schnell')
const FLAG_ULTRA = args.includes('--ultra')
const FLAG_KONTEXT = args.includes('--kontext')
const FLAG_TEST_STYLE = args.includes('--test-style')
const FLAG_APPROVE = args.includes('--approve')
const CHAPTER_FILTER = getArg('--chapter')
const SCENE_FILTER = getArg('--scene')

// ====================================================================
// COST TRACKING
// ====================================================================
const COSTS: Record<string, number> = {
  'flux-ultra': 0.06,
  'flux-2-pro': 0.045,
  'flux-2-pro-edit': 0.045,
  'kontext-pro': 0.04,
  'flux-schnell': 0.003,
}

let totalCost = 0
let totalImages = 0

function logCost(model: string, count: number): void {
  const unitCost = COSTS[model] ?? 0.045
  const cost = unitCost * count
  totalCost += cost
  totalImages += count
  console.log(`  Cost: $${cost.toFixed(3)} (running total: $${totalCost.toFixed(2)}, ${totalImages} images)`)
}

// ====================================================================
// DATA URI CONVERSION
// ====================================================================
export function toDataURI(filePath: string): string | null {
  if (!existsSync(filePath)) {
    console.warn(`  WARNING: File not found: ${filePath}`)
    return null
  }
  const buffer = readFileSync(filePath)
  const ext = filePath.endsWith('.webp')
    ? 'webp'
    : filePath.endsWith('.png')
      ? 'png'
      : filePath.endsWith('.avif')
        ? 'avif'
        : 'jpeg'
  return `data:image/${ext};base64,${buffer.toString('base64')}`
}

// ====================================================================
// PROVIDER FUNCTIONS
// ====================================================================

/**
 * Generate with Flux 2 Pro -- environment scenes and multi-character scenes
 * @param prompt Full scene prompt (STYLE_ANCHOR + ARCH + scene description)
 * @param refImageUrls Array of data URIs for character reference images (uses /edit endpoint)
 * @param opts Additional options
 * @returns PNG buffer
 */
export async function generateWithFlux2Pro(
  prompt: string,
  refImageUrls: string[] = [],
  opts: { imageSize?: string | Record<string, number>; safetyTolerance?: number; expandPrompt?: boolean } = {}
): Promise<Buffer> {
  const fal = await getFal()

  // Default: 2048x1536 landscape (same quality tier as character portraits at 1536x2048)
  const defaultSize = { width: 2048, height: 1536 }

  const input: Record<string, unknown> = {
    prompt,
    image_size: opts.imageSize ?? defaultSize,
    output_format: 'png',
    safety_tolerance: opts.safetyTolerance ?? 5,
    num_images: 1,
    expand_prompt: opts.expandPrompt ?? false,
  }

  // Use /edit endpoint if reference images are provided
  const endpoint = refImageUrls.length > 0 ? 'fal-ai/flux-2-pro/edit' : 'fal-ai/flux-2-pro'
  if (refImageUrls.length > 0) {
    input.image_urls = refImageUrls.slice(0, 8) // max 8 references
  }

  const result = await fal.subscribe(endpoint, { input })
  const imageUrl = (result as any).data?.images?.[0]?.url
  if (!imageUrl) throw new Error(`${endpoint} returned no image URL`)

  const resp = await fetch(imageUrl)
  return Buffer.from(await resp.arrayBuffer())
}

/**
 * Generate with Flux Pro Ultra -- highest quality, 2K resolution
 * Best for hero images, key story moments, and premium visuals
 */
export async function generateWithFluxUltra(
  prompt: string,
  opts: { aspectRatio?: string; safetyTolerance?: number; raw?: boolean } = {}
): Promise<Buffer> {
  const fal = await getFal()

  const result = await fal.subscribe('fal-ai/flux-pro/v1.1-ultra', {
    input: {
      prompt,
      aspect_ratio: opts.aspectRatio ?? '4:3',
      output_format: 'png',
      safety_tolerance: opts.safetyTolerance ?? 5,
      num_images: 1,
      raw: opts.raw ?? false,
    },
  })

  const imageUrl = (result as any).data?.images?.[0]?.url
  if (!imageUrl) throw new Error('flux-ultra returned no image URL')

  const resp = await fetch(imageUrl)
  return Buffer.from(await resp.arrayBuffer())
}

/**
 * Generate with Flux Kontext Pro -- single character in scene
 * @param prompt Transformation prompt (short, identity comes from reference image)
 * @param sourceImageUrl Data URI or public URL of character portrait
 * @returns PNG buffer
 */
export async function generateWithFluxKontext(
  prompt: string,
  sourceImageUrl: string
): Promise<Buffer> {
  const fal = await getFal()

  const result = await fal.subscribe('fal-ai/flux-pro/kontext', {
    input: {
      prompt,
      image_url: sourceImageUrl,
      num_images: 1,
      output_format: 'png',
      safety_tolerance: 4,
    },
  })

  const imageUrl = (result as any).data?.images?.[0]?.url
  if (!imageUrl) throw new Error('Flux Kontext returned no image URL')

  const resp = await fetch(imageUrl)
  return Buffer.from(await resp.arrayBuffer())
}

/**
 * Generate with Flux Schnell -- cheap drafts for prompt testing
 * @param prompt Full prompt
 * @param opts Additional options
 * @returns PNG buffer
 */
export async function generateWithFluxSchnell(
  prompt: string,
  opts: { imageSize?: string } = {}
): Promise<Buffer> {
  const fal = await getFal()

  const result = await fal.subscribe('fal-ai/flux/schnell', {
    input: {
      prompt,
      image_size: opts.imageSize ?? 'landscape_4_3',
      num_images: 1,
      // Schnell does not support output_format or safety_tolerance
    },
  })

  const imageUrl = (result as any).data?.images?.[0]?.url
  if (!imageUrl) throw new Error('Flux Schnell returned no image URL')

  const resp = await fetch(imageUrl)
  return Buffer.from(await resp.arrayBuffer())
}

// ====================================================================
// SHARP CONVERSION PIPELINE
// ====================================================================

/**
 * Convert PNG buffer to WebP (q85, <400KB) + AVIF (q50 effort 6) + raw PNG backup
 */
export async function convertAndSave(
  pngBuffer: Buffer,
  outputBasename: string,
  outputDir: string
): Promise<{ webpPath: string; avifPath: string; rawPath: string; webpSize: number; avifSize: number; webpQuality: number }> {
  const sharp = await getSharp()
  mkdirSync(outputDir, { recursive: true })

  const webpPath = join(outputDir, `${outputBasename}.webp`)
  const avifPath = join(outputDir, `${outputBasename}.avif`)

  // WebP q85 with auto quality reduction if > 400KB
  let webpQuality = 85
  let webpBuffer = await sharp(pngBuffer).webp({ quality: webpQuality }).toBuffer()
  while (webpBuffer.length > 400 * 1024 && webpQuality > 50) {
    webpQuality -= 10
    webpBuffer = await sharp(pngBuffer).webp({ quality: webpQuality }).toBuffer()
  }
  writeFileSync(webpPath, webpBuffer)

  // AVIF q50 effort 6
  const avifBuffer = await sharp(pngBuffer).avif({ quality: 50, effort: 6 }).toBuffer()
  writeFileSync(avifPath, avifBuffer)

  // Raw PNG backup
  mkdirSync(RAW_DIR, { recursive: true })
  const rawPath = join(RAW_DIR, `${outputBasename}.png`)
  writeFileSync(rawPath, pngBuffer)

  return {
    webpPath,
    avifPath,
    rawPath,
    webpSize: webpBuffer.length,
    avifSize: avifBuffer.length,
    webpQuality,
  }
}

// ====================================================================
// CANDIDATE MANAGEMENT
// ====================================================================

/**
 * Save 3 candidate PNGs for a scene
 */
export function saveCandidates(
  pngBuffers: Buffer[],
  sceneId: string,
  chapter: string
): string[] {
  // Organized: candidates/ch00/ch00-scene-01/candidate-a.png
  const chapterDir = join(CANDIDATES_DIR, chapter, sceneId)
  mkdirSync(chapterDir, { recursive: true })
  const labels = ['a', 'b', 'c', 'd', 'e'] as const
  const paths: string[] = []

  for (let i = 0; i < pngBuffers.length && i < labels.length; i++) {
    const filename = `candidate-${labels[i]}.png`
    const filepath = join(chapterDir, filename)
    writeFileSync(filepath, pngBuffers[i])
    paths.push(filepath)
    console.log(`  Saved candidate ${labels[i]}: ${sceneId}-candidate-${labels[i]}.png`)
  }

  return paths
}

/**
 * Approve a candidate -- convert to final WebP + AVIF
 */
export async function approveCandidate(
  sceneId: string,
  winner: 'a' | 'b' | 'c' | 'd' | 'e'
): Promise<void> {
  // Extract chapter from sceneId (e.g., ch00-scene-01 -> ch00)
  const chapter = sceneId.split('-scene-')[0]
  const candidatePath = join(CANDIDATES_DIR, chapter, sceneId, `candidate-${winner}.png`)
  if (!existsSync(candidatePath)) {
    // Fallback to old flat structure
    const flatPath = join(CANDIDATES_DIR, `${sceneId}-candidate-${winner}.png`)
    if (!existsSync(flatPath)) {
      throw new Error(`Candidate not found: ${candidatePath} or ${flatPath}`)
    }
    const pngBuffer = readFileSync(flatPath)
    const chapterSceneDir = join(SCENES_DIR, chapter)
    mkdirSync(chapterSceneDir, { recursive: true })
    const result = await convertAndSave(pngBuffer, sceneId, chapterSceneDir)
    console.log(`  Approved ${sceneId} (candidate ${winner})`)
    console.log(`    WebP: ${result.webpSize} bytes (q${result.webpQuality})`)
    console.log(`    AVIF: ${result.avifSize} bytes`)
    return
  }

  const pngBuffer = readFileSync(candidatePath)
  // Save to scenes/ch00/ch00-scene-01.webp
  const chapterSceneDir = join(SCENES_DIR, chapter)
  mkdirSync(chapterSceneDir, { recursive: true })
  const result = await convertAndSave(pngBuffer, sceneId, chapterSceneDir)

  console.log(`  Approved ${sceneId} (candidate ${winner})`)
  console.log(`    WebP: ${result.webpSize} bytes (q${result.webpQuality})`)
  console.log(`    AVIF: ${result.avifSize} bytes`)

  // Log approval
  let approvals: Record<string, unknown>[] = []
  if (existsSync(APPROVAL_LOG)) {
    try {
      approvals = JSON.parse(readFileSync(APPROVAL_LOG, 'utf-8'))
    } catch { /* start fresh */ }
  }
  approvals.push({
    sceneId,
    winner,
    timestamp: new Date().toISOString(),
    webpSize: result.webpSize,
    avifSize: result.avifSize,
  })
  mkdirSync(join(ROOT, 'public/art'), { recursive: true })
  writeFileSync(APPROVAL_LOG, JSON.stringify(approvals, null, 2))
}

// ====================================================================
// PROMPT LOGGING
// ====================================================================

function logPrompt(sceneId: string, prompt: string, model: string): void {
  mkdirSync(join(ROOT, 'public/art'), { recursive: true })
  const entry = `\n## ${sceneId}\n\n**Model:** ${model}\n**Timestamp:** ${new Date().toISOString()}\n\n\`\`\`\n${prompt}\n\`\`\`\n`
  appendFileSync(PROMPT_LOG, entry)
}

// ====================================================================
// HELP TEXT
// ====================================================================

function printHelp(): void {
  console.log(`
Pachacuti Art Generation Pipeline
=================================

Usage:
  npx tsx scripts/generate-scenes.ts [flags]

Flags:
  --help, -h        Show this help text
  --chapter chXX    Generate scenes for a specific chapter (e.g., --chapter ch01)
  --scene NN        Generate a specific scene within a chapter (e.g., --scene 03)
  --dry-run         Log prompts without calling fal.ai API
  --schnell         Use Flux Schnell ($0.003/img) instead of Flux 2 Pro ($0.045/img)
  --kontext         Use Kontext Pro for single-char scenes (legacy behavior, NOT recommended)
  --test-style      Run style validation with 5 test images
  --approve ID W    Approve candidate W (a/b/c) for scene ID (e.g., --approve ch13-scene-01 b)

Examples:
  # Preview all prompts for chapter 13 without generating
  npx tsx scripts/generate-scenes.ts --chapter ch13 --dry-run

  # Generate cheap drafts for chapter 1
  npx tsx scripts/generate-scenes.ts --chapter ch01 --schnell

  # Generate single scene in chapter 13
  npx tsx scripts/generate-scenes.ts --chapter ch13 --scene 05

  # Run style test with cheap Schnell model
  npx tsx scripts/generate-scenes.ts --test-style --schnell

  # Approve candidate 'b' for a scene
  npx tsx scripts/generate-scenes.ts --approve ch13-scene-01 b

Environment:
  FAL_KEY          fal.ai API key (required, set in .env.local)

Cost per image:
  Flux 2 Pro       $0.045 (production quality)
  Flux 2 Pro Edit  $0.045 (with character refs)
  Kontext Pro      $0.040 (character transformation)
  Flux Schnell     $0.003 (draft/testing)
`)
}

// ====================================================================
// STYLE TEST
// ====================================================================

const STYLE_TEST_PROMPTS = [
  {
    id: 'style-test-1-cusco',
    prompt: `${STYLE_ANCHOR}\n\nWide stone-paved Cusco avenue at 3400m altitude. Cyclopean polygonal andesite walls fitted without mortar flanking both sides, each stone uniquely shaped and interlocking perfectly, some taller than a man, with visible moss in the joints and centuries of weathering. Trapezoidal doorways with hammered gold lintels catching warm afternoon light. Thick golden-brown ichu grass thatch roofs bundled tightly above the stone walls. Stone water channels carved into the roadside carrying clear glacier-fed mountain water. In the distance the golden hammered-gold walls of the Qorikancha sun temple gleaming. Above the rooflines, green stepped andenes agricultural terraces carved into Sacred Valley slopes, snow-capped Ausangate peak against deep azure Andean sky. Late afternoon sun at altitude casting harsh directional chiaroscuro light and long deep shadows across warm andesite stones. Wisps of ichu grass growing between ancient paving stones. Empty avenue stretching toward the Qorikancha. 3/4 overhead view with vanishing-point perspective.\n\n${WARM_PALETTE}\n\nPre-Columbian Inca Cusco avenue, cyclopean polygonal walls, trapezoidal doorways, hammered gold, ichu thatch, Sacred Valley terraces, Ausangate peak. 1438 Tawantinsuyu. Painterly, dramatic, detailed.`,
    description: 'Cusco avenue — cyclopean walls, trapezoidal doors, ichu thatch',
  },
  {
    id: 'style-test-2-jungle',
    prompt: `${STYLE_ANCHOR}\n\nInterior of the Peruvian Amazon selva rainforest. Massive buttress-root ceiba and shihuahuaco trees forming a cathedral canopy forty meters overhead, each trunk wider than three men standing abreast, bark covered in moss and epiphytic orchids. Green-filtered light penetrating through layers of leaves, giant ferns, bromeliads, and heliconia with bright red flowers. Hanging woody lianas thick as rope draping between trunks. A brown muddy tributary of the Ucayali river visible through gaps in the dense vegetation, with a balsa-wood raft pulled up on the muddy bank. Humid air visible as faint golden-green haze between the massive trunks. Dappled golden-green light where sun breaks through canopy gaps, painting warm spots on the forest floor. Blue morpho butterflies catching light. Cecropia trees with distinctive silver-green palmate leaves. The overwhelming density and vertical scale of primary Peruvian Amazonian forest. Wet, hot, green, ancient.\n\n${WARM_PALETTE}\n\nPeruvian Amazon selva, ceiba buttress roots, brown muddy river, bromeliads, lianas, green-filtered light. Oil-painting realism, dramatic lighting, rich green atmosphere. Painterly, dramatic, detailed.`,
    description: 'Peruvian Amazon selva — ceiba trees, muddy river, bromeliads',
  },
  {
    id: 'style-test-3-battle',
    prompt: `${STYLE_ANCHOR}\n\nYahuar Pampa highland puna plateau at dawn, 1438 CE Tawantinsuyu. Hundreds of Inca warriors standing in tight disciplined formation across the golden-brown ichu grassland between mountain ridges. Every warrior wears thick quilted ichku cotton armor with visible padded cotton layers stitched together with leather reinforcement strips, effective against sling stones. Wooden warak'a-uma helmets carved and painted, some topped with condor feather crests. Weapons clearly visible: bronze star-headed champi war clubs with geometric patterns on the bronze heads resting on shoulders, braided honda slings loaded with smooth river stones hanging from belts, wooden spears with cast bronze leaf-shaped tips held upright. Small round wooden shields with stretched leather covering, painted with tocapu geometric patterns. Woven cotton unku tunics with bold red-and-cream tocapu geometric square patterns visible beneath the quilted armor. A line of brown llamas carrying woven supply bundles behind the formation. Banner-bearers holding tall wooden poles with woven cotton standards displaying bold geometric tocapu patterns. Morning mist hanging low over the ichu tussock grass. Snow-capped Andean Apu peaks visible through the mist. Cold pre-dawn light transitioning to golden sunrise from the east. Low camera angle looking across the formation, emphasizing the vast scale.\n\n${WARM_PALETTE}\n\nPre-Columbian Inca army at Yahuar Pampa. Quilted cotton armor, champi war clubs, honda slings, tocapu patterns, wooden helmets, llama supply train. 1438 Tawantinsuyu. Painterly, dramatic, detailed.`,
    description: 'Inca army — quilted cotton armor, champi clubs, honda slings',
  },
  {
    id: 'style-test-4-interior',
    prompt: `${STYLE_ANCHOR}\n\nInterior of the Qorikancha, the Temple of the Sun in Cusco, 1438 CE, the most sacred building in the Tawantinsuyu empire. Every wall surface covered in thick hammered gold sheets, panels of beaten gold reflecting warm torchlight in deep amber and honey tones, each panel hammered by master Inca goldsmiths. Trapezoidal stone niches cut into the gold-covered walls at regular intervals, each holding a small cast gold figure of Inti the sun god with radiating rays. The walls slightly inward-leaning, built of perfectly fitted dark grey andesite stone blocks behind the gold sheets, the precise stonework visible where gold meets the trapezoidal doorway frame. Polished dark stone floor reflecting the golden glow. A large gold Inti sun disc with radiating ray pattern mounted on the far wall catches and magnifies the torchlight, the central sacred object. Cotton-wick stone oil lamps placed in wall niches provide warm illumination. Small intimate room, low ceiling of ichu thatch over stone beams, thick walls built to contain the sun's power. Trapezoidal doorway in the foreground framing the golden interior. Sacred, reverent, overwhelming warm gold.\n\n${WARM_PALETTE}\n\nQorikancha sun temple interior, hammered gold sheets, trapezoidal niches, Inti sun disc, cotton-wick lamps, fitted andesite stonework. 1438 Cusco Tawantinsuyu. Painterly, dramatic, golden warmth.`,
    description: 'Qorikancha interior — hammered gold walls, Inti disc, niches',
  },
  {
    id: 'style-test-5-coast',
    prompt: `${STYLE_ANCHOR}\n\nParacas peninsula on the Pacific coast of Peru, 1438 CE. A vast desert landscape where golden-brown sand dunes sweep directly down to the cold grey-green Pacific Ocean. The Humboldt current brings cold water and coastal garua fog, wisps of white mist drifting across the dune ridges. Wind-carved sandstone formations in the middle ground, eroded into smooth organic shapes by millennia of coastal wind. In the foreground, scattered fragments of brilliant Paracas woven textiles visible at a burial site, cotton and camelid wool woven in deep crimson cochineal dye, mustard yellow from molle tree, and indigo blue in complex geometric patterns, partially buried in golden sand. A simple adobe mudbrick structure with cotton-cloth door covering sits on a low ridge above the shore. Cold desert meeting cold ocean, no palm trees, no tropical vegetation, just arid sand, rock, and sparse coastal shrubs. Warm amber light from setting sun behind the dunes contrasting with steely grey-green ocean. Dry wind carrying sand particles visible in the golden light. Vast, lonely, wind-swept, ancient.\n\n${WARM_PALETTE}\n\nParacas Peru Pacific coast, golden sand dunes, cold Humboldt current ocean, garua fog, Paracas burial textiles in crimson and indigo, adobe structure. 1438 Tawantinsuyu. Painterly, dramatic, detailed.`,
    description: 'Paracas coast — cold desert, Humboldt current, burial textiles',
  },
]

async function runStyleTest(): Promise<void> {
  console.log('Style Validation Test')
  console.log('=====================')
  console.log(`Model: ${FLAG_SCHNELL ? 'Flux Schnell ($0.003/img)' : 'Flux 2 Pro ($0.045/img)'}`)
  console.log(`Generating ${STYLE_TEST_PROMPTS.length} test images...\n`)

  // Check FAL_KEY
  if (!process.env.FAL_KEY) {
    console.error('ERROR: FAL_KEY not set. Add it to .env.local:')
    console.error('  echo "FAL_KEY=your_key_here" >> .env.local')
    process.exit(1)
  }

  mkdirSync(CANDIDATES_DIR, { recursive: true })

  const results: { id: string; description: string; success: boolean; path?: string }[] = []

  for (const test of STYLE_TEST_PROMPTS) {
    console.log(`  Generating: ${test.id} -- ${test.description}`)

    try {
      let pngBuffer: Buffer

      if (FLAG_SCHNELL) {
        pngBuffer = await generateWithFluxSchnell(test.prompt)
        logCost('flux-schnell', 1)
      } else {
        pngBuffer = FLAG_ULTRA
          ? await generateWithFluxUltra(test.prompt)
          : await generateWithFlux2Pro(test.prompt)
        logCost('flux-2-pro', 1)
      }

      // Save as candidate
      const candidatePath = join(CANDIDATES_DIR, `${test.id}-candidate-a.png`)
      writeFileSync(candidatePath, pngBuffer)
      console.log(`  Saved: ${candidatePath}`)

      // Log prompt
      logPrompt(test.id, test.prompt, FLAG_SCHNELL ? 'flux-schnell' : FLAG_ULTRA ? 'flux-ultra' : 'flux-2-pro')

      results.push({ id: test.id, description: test.description, success: true, path: candidatePath })
    } catch (err) {
      console.error(`  ERROR: ${test.id} failed:`, err)
      results.push({ id: test.id, description: test.description, success: false })
    }
  }

  // Convert first successful result to WebP + AVIF to verify conversion pipeline
  const firstSuccess = results.find((r) => r.success && r.path)
  if (firstSuccess?.path) {
    console.log(`\n  Converting ${firstSuccess.id} to WebP + AVIF...`)
    try {
      const pngBuffer = readFileSync(firstSuccess.path)
      const convResult = await convertAndSave(pngBuffer, firstSuccess.id, SCENES_DIR)
      console.log(`  WebP: ${convResult.webpSize} bytes (q${convResult.webpQuality})`)
      console.log(`  AVIF: ${convResult.avifSize} bytes`)
      console.log(`  Raw PNG: ${convResult.rawPath}`)
    } catch (err) {
      console.error(`  Conversion ERROR:`, err)
    }
  }

  // Print summary
  console.log('\n=====================')
  console.log('Style Test Results:')
  for (const r of results) {
    console.log(`  ${r.success ? 'PASS' : 'FAIL'} ${r.id} -- ${r.description}`)
  }
  console.log(`\nTotal: ${results.filter((r) => r.success).length}/${results.length} passed`)
  console.log(`Cost: $${totalCost.toFixed(3)}`)
  console.log(`\nReview the generated images in: ${CANDIDATES_DIR}`)
}

// ====================================================================
// MAIN
// ====================================================================

async function main(): Promise<void> {
  // Handle --help
  if (FLAG_HELP) {
    printHelp()
    process.exit(0)
  }

  // Handle --approve
  if (FLAG_APPROVE) {
    const approveIdx = args.indexOf('--approve')
    const sceneId = args[approveIdx + 1]
    const winner = args[approveIdx + 2] as 'a' | 'b' | 'c' | 'd' | 'e'
    if (!sceneId || !['a', 'b', 'c', 'd', 'e'].includes(winner)) {
      console.error('Usage: --approve <sceneId> <a|b|c>')
      process.exit(1)
    }
    await approveCandidate(sceneId, winner)
    process.exit(0)
  }

  // Handle --test-style
  if (FLAG_TEST_STYLE) {
    await runStyleTest()
    process.exit(0)
  }

  // Validate FAL_KEY
  if (!FLAG_DRY_RUN && !process.env.FAL_KEY) {
    console.error('ERROR: FAL_KEY not set. Add it to .env.local:')
    console.error('  echo "FAL_KEY=your_key_here" >> .env.local')
    process.exit(1)
  }

  console.log('Pachacuti Art Generation Pipeline')
  console.log('=================================')
  console.log(`Mode: ${FLAG_DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Model: ${FLAG_SCHNELL ? 'Flux Schnell ($0.003/img)' : 'Flux 2 Pro ($0.045/img)'}`)
  if (CHAPTER_FILTER) console.log(`Chapter filter: ${CHAPTER_FILTER}`)
  if (SCENE_FILTER) console.log(`Scene filter: ${SCENE_FILTER}`)
  console.log('')

  // Determine chapters in scope
  const chaptersInScope = CHAPTER_CONFIG.filter((ch) => {
    if (!CHAPTER_FILTER) return true
    return `ch${String(ch.chapter).padStart(2, '0')}` === CHAPTER_FILTER
  })

  if (chaptersInScope.length === 0) {
    console.log(`No chapters match filter "${CHAPTER_FILTER}".`)
    process.exit(0)
  }

  let chaptersProcessed = 0

  for (const chapterConf of chaptersInScope) {
    const chKey = `ch${String(chapterConf.chapter).padStart(2, '0')}`
    const prompts = SCENE_PROMPTS[chKey] ?? []

    // Apply scene filter if specified
    const filteredPrompts = SCENE_FILTER
      ? prompts.filter((p) => p.id.endsWith(`-scene-${SCENE_FILTER.padStart(2, '0')}`))
      : prompts

    if (filteredPrompts.length === 0) {
      console.log(`[${chKey}] No prompts found for ${chKey}${SCENE_FILTER ? ` scene ${SCENE_FILTER}` : ''}.`)
      continue
    }

    console.log(`\n[${chKey}] ${chapterConf.title} -- ${filteredPrompts.length} prompts`)
    console.log('-'.repeat(60))

    for (const scenePrompt of filteredPrompts) {
      // Resume support: skip if final file already exists
      const finalPath = join(SCENES_DIR, `${scenePrompt.id}.webp`)
      if (existsSync(finalPath)) {
        console.log(`  [SKIP] ${scenePrompt.id} -- already exists`)
        continue
      }

      // Build full prompt based on scene type and character refs
      const archDesc = ARCH[scenePrompt.archKey] ?? ''
      const hasCharacters = scenePrompt.type === 'character' && scenePrompt.characterRefs.length > 0
      const useKontext = FLAG_KONTEXT && hasCharacters && scenePrompt.characterRefs.length === 1

      // For character scenes (default): IDENTITY_BLOCK + STYLE_ANCHOR + ARCH + scene prompt
      // For character scenes (--kontext): "Same person." + scene prompt + ARCH (legacy)
      // For environment scenes: STYLE_ANCHOR + ARCH + scene prompt
      let fullPrompt: string
      let identityPrefix = ''

      if (hasCharacters && !useKontext) {
        identityPrefix = buildCharacterIdentityPrefix(scenePrompt.characterRefs)
        fullPrompt = identityPrefix
          ? `${identityPrefix}\n\n${STYLE_ANCHOR} ${archDesc} ${scenePrompt.prompt}`
          : `${STYLE_ANCHOR} ${archDesc} ${scenePrompt.prompt}`
      } else {
        fullPrompt = `${STYLE_ANCHOR} ${archDesc} ${scenePrompt.prompt}`
      }

      if (FLAG_DRY_RUN) {
        console.log(`\n  [DRY RUN] ${scenePrompt.id}`)
        console.log(`  Type: ${scenePrompt.type}`)
        console.log(`  ARCH: ${scenePrompt.archKey}`)
        console.log(`  Characters: ${scenePrompt.characterRefs.length > 0 ? scenePrompt.characterRefs.join(', ') : 'none'}`)
        if (hasCharacters && !useKontext) {
          console.log(`  Mode: Flux 2 Pro + Identity Block (${identityPrefix.length} chars)`)
        } else if (useKontext) {
          console.log(`  Mode: Kontext Pro (legacy --kontext flag)`)
        } else {
          console.log(`  Mode: Flux 2 Pro (environment)`)
        }
        console.log(`  Prompt (${fullPrompt.length} chars):`)
        console.log(`  ${fullPrompt.substring(0, 300)}...`)
        continue
      }

      console.log(`\n  Generating ${scenePrompt.id} (${scenePrompt.type})...`)
      if (hasCharacters && !useKontext) {
        console.log(`  Using Flux 2 Pro + Identity Block for: ${scenePrompt.characterRefs.join(', ')}`)
      } else if (useKontext) {
        console.log(`  Using Kontext Pro (legacy) for: ${scenePrompt.characterRefs[0]}`)
      }

      // Generate candidates: 5 for character scenes, 3 for environments
      const numCandidates = scenePrompt.type === 'character' ? 5 : 3
      const candidates: Buffer[] = []
      const model = FLAG_SCHNELL ? 'flux-schnell' : 'flux-2-pro'

      for (let c = 0; c < numCandidates; c++) {
        try {
          let pngBuffer: Buffer

          if (FLAG_SCHNELL) {
            pngBuffer = await generateWithFluxSchnell(fullPrompt)
          } else if (useKontext) {
            // Legacy: Single character via Kontext Pro (only with --kontext flag)
            const portraitPath = join(ROOT, 'content/characters', `${scenePrompt.characterRefs[0]}.webp`)
            const dataUri = toDataURI(portraitPath)
            if (dataUri) {
              pngBuffer = await generateWithFluxKontext(
                `Same person. ${scenePrompt.prompt} ${ARCH[scenePrompt.archKey] ?? ''}`,
                dataUri
              )
            } else {
              // Fallback to Flux 2 Pro if portrait not found
              pngBuffer = await generateWithFlux2Pro(fullPrompt)
            }
          } else {
            // DEFAULT: Flux 2 Pro for all scenes (env + character with identity blocks)
            pngBuffer = await generateWithFlux2Pro(fullPrompt)
          }

          candidates.push(pngBuffer)
          logCost(useKontext ? 'kontext-pro' : model, 1)
        } catch (err) {
          console.error(`  ERROR generating candidate ${c + 1} for ${scenePrompt.id}:`, err)
        }
      }

      if (candidates.length > 0) {
        saveCandidates(candidates, scenePrompt.id, chKey)
        logPrompt(scenePrompt.id, fullPrompt, model)
      } else {
        console.error(`  FAILED: No candidates generated for ${scenePrompt.id}`)
      }
    }

    chaptersProcessed++
  }

  console.log('')
  console.log('=================================')
  console.log(`Summary: ${chaptersProcessed} chapters, ${totalImages} images generated, total cost: $${totalCost.toFixed(2)}`)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
