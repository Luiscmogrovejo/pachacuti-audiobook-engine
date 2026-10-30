#!/usr/bin/env node

/**
 * generate-glossary-audio-v2.mjs -- Azure Speech with SSML phoneme tags for glossary
 *
 * Phase 7.5 upgrade: uses the PLS lexicon IPA for each word via explicit
 * <phoneme> SSML tags, producing correct Quechua pronunciation.
 *
 * Usage:
 *   node scripts/generate-glossary-audio-v2.mjs                    # Generate all (skip existing)
 *   node scripts/generate-glossary-audio-v2.mjs --dry-run          # Preview only
 *   node scripts/generate-glossary-audio-v2.mjs --force            # Regenerate even if exists
 *   node scripts/generate-glossary-audio-v2.mjs --sample 5         # Generate first N entries only
 *   node scripts/generate-glossary-audio-v2.mjs --sample 5 --force # Force first 5
 *   node scripts/generate-glossary-audio-v2.mjs --words "Pachacuti,ayllu,Willaq Umu"
 *
 * Environment (from .env.local):
 *   AZURE_SPEECH_KEY       - Required
 *   AZURE_SPEECH_REGION    - Required (or AZURE_SPEECH_ENDPOINT)
 *   AZURE_SPEECH_ENDPOINT  - Optional alternative to region
 *
 * Output: public/audio/glossary/{word-normalized}.mp3
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(PROJECT_ROOT, ".env.local") });

const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "audio", "glossary");
const GLOSSARY_PATH = path.join(PROJECT_ROOT, "src", "lib", "data", "glossary.ts");
const PLS_EN_PATH = path.join(PROJECT_ROOT, "public", "audio", "lexicon", "quechua-en.xml");
const PLS_ES_PATH = path.join(PROJECT_ROOT, "public", "audio", "lexicon", "quechua-es.xml");

const VOICE = "es-PE-CamilaNeural";
const MAX_CONCURRENT = 10;
const BATCH_DELAY_MS = 100;

// Audio format: 16kHz 32kbps mono MP3 (small files for glossary pronunciation)
const AUDIO_FORMAT_ENUM = "Audio16Khz32KBitRateMonoMp3";

// ---------------------------------------------------------------------------
// CLI Args
// ---------------------------------------------------------------------------

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

function getSampleCount() {
  const idx = process.argv.indexOf("--sample");
  if (idx >= 0 && idx + 1 < process.argv.length) {
    return parseInt(process.argv[idx + 1], 10);
  }
  return 0; // 0 = all
}

function getWordFilter() {
  const idx = process.argv.indexOf("--words");
  if (idx >= 0 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1].split(",").map((w) => w.trim().toLowerCase());
  }
  return null;
}

const SAMPLE_COUNT = getSampleCount();
const WORD_FILTER = getWordFilter();

// ---------------------------------------------------------------------------
// Parse PLS XML to get IPA for each word
// ---------------------------------------------------------------------------

function parsePLS(filepath) {
  if (!fs.existsSync(filepath)) {
    console.warn(`[WARN] PLS file not found: ${filepath}`);
    return new Map();
  }
  const content = fs.readFileSync(filepath, "utf-8");
  const map = new Map();
  const regex =
    /<lexeme>\s*<grapheme>([^<]+)<\/grapheme>\s*<phoneme>([^<]+)<\/phoneme>\s*<\/lexeme>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    // Normalize grapheme: decode &apos; and curly quotes
    const grapheme = match[1]
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"');
    map.set(grapheme.toLowerCase(), match[2]);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Parse glossary entries from TypeScript source
// ---------------------------------------------------------------------------

function parseGlossary() {
  const src = fs.readFileSync(GLOSSARY_PATH, "utf-8");
  const entries = [];
  const entryRegex =
    /\{\s*word:\s*"([^"]+)"[\s\S]*?pronunciation:\s*"([^"]+)"[\s\S]*?category:\s*"([^"]+)"[\s\S]*?\}/g;
  let match;
  while ((match = entryRegex.exec(src)) !== null) {
    entries.push({
      word: match[1],
      pronunciation: match[2],
      category: match[3],
    });
  }

  if (entries.length === 0) {
    console.error("[ERROR] No glossary entries found in", GLOSSARY_PATH);
    process.exit(1);
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Normalize word to filename
// ---------------------------------------------------------------------------

function normalizeWord(word) {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ---------------------------------------------------------------------------
// Build SSML with phoneme tags
// ---------------------------------------------------------------------------

function buildSSML(entry, ipaMap) {
  const { word, category } = entry;
  const rate = category !== "expresion" ? "-15%" : "-10%";

  // Look up IPA for the word (try lowercase)
  const ipa = ipaMap.get(word.toLowerCase());

  let wordSSML;
  if (ipa) {
    // Use explicit phoneme tag for Quechua pronunciation
    wordSSML = `<phoneme alphabet="ipa" ph="${escapeXml(ipa)}">${escapeXml(word)}</phoneme>`;
  } else {
    // Fallback: just the word text (Azure will use its default pronunciation)
    wordSSML = escapeXml(word);
  }

  return `<speak version="1.0" xml:lang="es-PE">
  <voice name="${VOICE}">
    <prosody rate="${rate}">${wordSSML}</prosody>
  </voice>
</speak>`;
}

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ---------------------------------------------------------------------------
// Generate audio for a single entry
// ---------------------------------------------------------------------------

async function generateAudio(SpeechSDK, speechConfig, entry, index, total, ipaMap) {
  const filename = normalizeWord(entry.word) + ".mp3";
  const outputPath = path.join(OUTPUT_DIR, filename);

  // Skip if already exists and not forcing
  if (!FORCE && fs.existsSync(outputPath)) {
    return { status: "skipped", filename, word: entry.word };
  }

  if (DRY_RUN) {
    const ssml = buildSSML(entry, ipaMap);
    const ipa = ipaMap.get(entry.word.toLowerCase());
    console.log(
      `[${index + 1}/${total}] [DRY RUN] ${filename} -- "${entry.word}" (${entry.category})${ipa ? ` IPA: ${ipa}` : " (no IPA)"}`
    );
    return { status: "dry-run", filename, word: entry.word };
  }

  const ssml = buildSSML(entry, ipaMap);

  return new Promise((resolve) => {
    const audioConfig = SpeechSDK.AudioConfig.fromAudioFileOutput(outputPath);
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);

    synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        synthesizer.close();
        if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
          const size = fs.statSync(outputPath).size;
          console.log(
            `[${index + 1}/${total}] Generated: ${filename} (${(size / 1024).toFixed(1)}KB)`
          );
          resolve({ status: "generated", filename, word: entry.word, size });
        } else {
          const error = result.errorDetails || "Unknown error";
          console.error(`[${index + 1}/${total}] FAILED: ${filename} -- ${error}`);
          resolve({ status: "failed", filename, word: entry.word, error });
        }
      },
      (error) => {
        synthesizer.close();
        console.error(`[${index + 1}/${total}] ERROR: ${filename} -- ${error}`);
        resolve({ status: "error", filename, word: entry.word, error: String(error) });
      }
    );
  });
}

// ---------------------------------------------------------------------------
// Batch processing with concurrency limit
// ---------------------------------------------------------------------------

async function processBatch(SpeechSDK, speechConfig, entries, ipaMap) {
  const total = entries.length;
  const results = [];

  for (let i = 0; i < total; i += MAX_CONCURRENT) {
    const batch = entries.slice(i, i + MAX_CONCURRENT);
    const batchResults = await Promise.all(
      batch.map((entry, j) =>
        generateAudio(SpeechSDK, speechConfig, entry, i + j, total, ipaMap)
      )
    );
    results.push(...batchResults);

    // Rate limit delay between batches
    if (i + MAX_CONCURRENT < total) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Glossary Audio Generator v2 (Phase 7.5 -- SSML Phonemes) ===\n");

  // Load PLS IPA map (use ES lexicon since voice is es-PE-CamilaNeural)
  console.log("[INFO] Loading PLS lexicon for IPA lookup...");
  const ipaMap = parsePLS(PLS_ES_PATH);
  console.log(`[INFO] PLS entries loaded: ${ipaMap.size}`);

  // Parse glossary
  let entries = parseGlossary();
  console.log(`[INFO] Glossary entries: ${entries.length}`);

  // Apply word filter
  if (WORD_FILTER) {
    entries = entries.filter((e) => WORD_FILTER.includes(e.word.toLowerCase()));
    console.log(`[INFO] Filtered to ${entries.length} entries matching: ${WORD_FILTER.join(", ")}`);
  }

  // Apply sample limit
  if (SAMPLE_COUNT > 0 && !WORD_FILTER) {
    entries = entries.slice(0, SAMPLE_COUNT);
    console.log(`[INFO] Sampling first ${SAMPLE_COUNT} entries`);
  }

  // Check IPA coverage
  let withIPA = 0;
  let withoutIPA = 0;
  for (const entry of entries) {
    if (ipaMap.has(entry.word.toLowerCase())) {
      withIPA++;
    } else {
      withoutIPA++;
      if (!DRY_RUN) {
        console.warn(`  [WARN] No IPA for: "${entry.word}"`);
      }
    }
  }
  console.log(`[INFO] IPA coverage: ${withIPA}/${entries.length} (${withoutIPA} without IPA)\n`);

  if (DRY_RUN) {
    console.log("[DRY RUN] Preview of SSML for first 3 entries:\n");
    for (const entry of entries.slice(0, 3)) {
      const ssml = buildSSML(entry, ipaMap);
      console.log(`--- ${entry.word} ---`);
      console.log(ssml);
      console.log();
    }
    console.log("[DRY RUN] All entries:");
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const ipa = ipaMap.get(e.word.toLowerCase());
      console.log(
        `  [${i + 1}/${entries.length}] ${normalizeWord(e.word)}.mp3 -- "${e.word}" (${e.category})${ipa ? ` IPA: ${ipa}` : ""}`
      );
    }
    console.log(`\n[DRY RUN] Would generate ${entries.length} files to ${OUTPUT_DIR}`);
    return;
  }

  // Load Azure Speech SDK
  const speechKey = process.env.AZURE_SPEECH_KEY;
  const speechRegion = process.env.AZURE_SPEECH_REGION;
  const speechEndpoint = process.env.AZURE_SPEECH_ENDPOINT;

  if (!speechKey || (!speechRegion && !speechEndpoint)) {
    console.error(
      "[ERROR] AZURE_SPEECH_KEY and (AZURE_SPEECH_REGION or AZURE_SPEECH_ENDPOINT) must be set in .env.local"
    );
    process.exit(1);
  }

  const SpeechSDK = await import("microsoft-cognitiveservices-speech-sdk");

  let speechConfig;
  if (speechEndpoint) {
    try {
      speechConfig = SpeechSDK.SpeechConfig.fromEndpoint(new URL(speechEndpoint), speechKey);
      console.log(`[INFO] Using endpoint: ${speechEndpoint}`);
    } catch {
      console.log("  fromEndpoint failed, falling back to fromSubscription...");
      speechConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion || "eastus2");
    }
  } else {
    speechConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
  }
  speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat[AUDIO_FORMAT_ENUM];

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`[INFO] Created output directory: ${OUTPUT_DIR}`);
  }

  console.log(`[INFO] Voice: ${VOICE}`);
  console.log(`[INFO] Output: ${OUTPUT_DIR}`);
  console.log(`[INFO] Force regenerate: ${FORCE}`);
  console.log(`[INFO] Concurrency: ${MAX_CONCURRENT}, Batch delay: ${BATCH_DELAY_MS}ms`);
  console.log();

  const results = await processBatch(SpeechSDK, speechConfig, entries, ipaMap);

  // Summary
  const generated = results.filter((r) => r.status === "generated").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "failed" || r.status === "error").length;

  console.log("\n=== Summary ===");
  console.log(`  Generated: ${generated}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Failed:    ${failed}`);
  console.log(`  Total:     ${results.length}`);

  if (failed > 0) {
    console.log("\nFailed entries:");
    results
      .filter((r) => r.status === "failed" || r.status === "error")
      .forEach((r) => console.log(`  - ${r.filename}: ${r.error}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
