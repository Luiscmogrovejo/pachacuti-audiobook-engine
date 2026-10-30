#!/usr/bin/env node

/**
 * Pachacuti Audiobook Generator v3 -- Azure Speech SDK + PLS Lexicon + SentenceBoundary Timing
 *
 * Generates MP3 audio AND sentence-level + word-level timing JSON using the
 * Azure Speech SDK's wordBoundary/SentenceBoundary events with PLS custom
 * lexicon for Quechua pronunciation.
 *
 * Usage:
 *   node scripts/generate-audiobook-v3.mjs --dry-run                         # Preview all
 *   node scripts/generate-audiobook-v3.mjs --dry-run --chapter 00 --lang es  # Preview ch00 ES
 *   node scripts/generate-audiobook-v3.mjs --chapter 00 --lang es            # Generate ch00 ES
 *   node scripts/generate-audiobook-v3.mjs --chapter 00                      # Generate ch00 both langs
 *   node scripts/generate-audiobook-v3.mjs                                   # Generate all
 *   node scripts/generate-audiobook-v3.mjs --verify-alignment                # Verify timing vs text
 *   node scripts/generate-audiobook-v3.mjs --help
 *
 * Environment (from .env.local via dotenv):
 *   AZURE_SPEECH_KEY       - Required. Azure AI Services subscription key.
 *   AZURE_SPEECH_ENDPOINT  - Required. e.g. https://pachacuti-resource.services.ai.azure.com
 *
 * Outputs:
 *   Audio:    public/audio/chapters/{lang}/{filename}.mp3
 *   Sentence: public/audio/timing/{lang}/ch{NN}.json       [{text, start, end}]
 *   Words:    public/audio/timing/{lang}/ch{NN}-words.json  [{word, start, end, score}]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Load .env.local explicitly (dotenv/config does NOT read .env.local by default)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(PROJECT_ROOT, ".env.local") });

// Dynamic import for the SDK (CommonJS module)
const SpeechSDK = await import("microsoft-cognitiveservices-speech-sdk");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CHAPTERS_DIR = path.join(PROJECT_ROOT, "content", "chapters");
const AUDIO_OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "audio", "chapters");
const TIMING_OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "audio", "timing");
const LEXICON_DIR = path.join(PROJECT_ROOT, "public", "audio", "lexicon");

const MAX_CHUNK_CHARS = 5000; // Azure limit ~10min audio per request
const DELAY_BETWEEN_CHUNKS_MS = 3500;
const PLACEHOLDER_THRESHOLD_BYTES = 500; // Files < 500 bytes are placeholders

// Default voices
const VOICES = {
  es: "es-PE-CamilaNeural",
  en: "en-US-AriaNeural",
};

// SSML styles
const STYLES = {
  es: null, // es-PE voices don't support styles
  en: "narration-professional", // Engaged, professional storytelling
};

// Audio format: 48kHz 192kbps MP3
const AUDIO_FORMAT_ENUM = "Audio48Khz192KBitRateMonoMp3";
const AUDIO_BITRATE = 192000; // bits per second for duration calc

// ---------------------------------------------------------------------------
// Dynamic Chapter Map -- scan content/chapters/ directories
// ---------------------------------------------------------------------------

function buildChapterMap() {
  const chapterFiles = {};

  for (const lang of ["es", "en"]) {
    const langDir = path.join(CHAPTERS_DIR, lang);
    if (!fs.existsSync(langDir)) continue;

    const files = fs.readdirSync(langDir).filter((f) => f.endsWith(".md") && f !== ".gitkeep");

    for (const file of files) {
      const match = file.match(/^(\d{2})-/);
      if (!match) continue;

      const chNum = match[1];
      const filePath = path.join(langDir, file);
      const stat = fs.statSync(filePath);

      // Skip placeholders (< 500 bytes, e.g., ch20-23)
      if (stat.size < PLACEHOLDER_THRESHOLD_BYTES) continue;

      if (!chapterFiles[chNum]) {
        chapterFiles[chNum] = {};
      }
      chapterFiles[chNum][lang] = file;
    }
  }

  // Only keep chapters that have BOTH languages
  const complete = {};
  for (const [chNum, langs] of Object.entries(chapterFiles)) {
    if (langs.es && langs.en) {
      complete[chNum] = langs;
    }
  }

  return complete;
}

const CHAPTER_FILES = buildChapterMap();

// ---------------------------------------------------------------------------
// CLI Argument Parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    dryRun: false,
    chapters: [],
    lang: null,
    help: false,
    verifyAlignment: false,
    lexiconUrl: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--chapter":
        opts.chapters.push(args[++i].padStart(2, "0"));
        break;
      case "--lang":
        opts.lang = args[++i];
        break;
      case "--verify-alignment":
        opts.verifyAlignment = true;
        break;
      case "--lexicon-url":
        opts.lexiconUrl = args[++i];
        break;
      case "--help":
      case "-h":
        opts.help = true;
        break;
    }
  }

  return opts;
}

// ---------------------------------------------------------------------------
// Markdown -> Clean Narration Text
// (EXACT copy from generate-audiobook-v2.mjs lines 150-198)
// ---------------------------------------------------------------------------

function markdownToNarrationText(md) {
  const rawMd = md; // preserve raw markdown for epigraph detection before stripping

  let text = md;
  text = text.replace(/^---[\s\S]*?---\n*/m, "");
  text = text.replace(/^#{1,3}\s+(.*)$/gm, "\n\n");
  text = text.replace(/^[\s]*[-*_]{3,}[\s]*$/gm, "\n");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/^---\s*/gm, "\u2014 ");
  text = text.replace(/\s*---\s*/g, " \u2014 ");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/\n{3,}/g, "\n\n");

  // Split into paragraphs (mirrors parseChapterMarkdown behavior)
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Remove author credit line (first paragraph if "Por ..." or "By ...")
  if (paragraphs.length > 0 && /^(Por|By)\s+/i.test(paragraphs[0])) {
    paragraphs.shift();
  }

  // Extract epigraph from raw markdown BEFORE stripping (same regex as parseChapterMarkdown)
  const epigraphMatch = rawMd.match(
    /---\s*\n\s*\n\*"([^"]+)"\*\s*\n\*([^*]+)\*/s
  );
  const epigraphFull = epigraphMatch
    ? `"${epigraphMatch[1]}"\n${epigraphMatch[2]}`
    : "";

  // After splitting into paragraphs, remove epigraph paragraph if it matches
  if (epigraphFull && paragraphs.length > 0) {
    const firstClean = paragraphs[0]
      .replace(/[*"]/g, "")
      .replace(/\u2014/g, "---")
      .trim();
    const epClean = epigraphFull.replace(/"/g, "").trim();
    if (
      firstClean.includes(epClean.slice(0, 30)) ||
      epClean.includes(firstClean.slice(0, 30))
    ) {
      paragraphs.shift();
    }
  }

  // Remove subtitle-like standalone lines at start (e.g., "RUMI --- Nawpa Pacha")
  while (
    paragraphs.length > 0 &&
    paragraphs[0].length < 40 &&
    /^[A-Z\s\u2014-]+$/.test(paragraphs[0].replace(/\*/g, ""))
  ) {
    paragraphs.shift();
  }

  return paragraphs.join("\n\n");
}

// ---------------------------------------------------------------------------
// Text Chunking (paragraph-aware)
// (EXACT copy from generate-audiobook-v2.mjs lines 252-291)
// ---------------------------------------------------------------------------

function chunkText(text, maxChars = MAX_CHUNK_CHARS) {
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let current = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (trimmed.length > maxChars) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = "";
      }
      const sentences = trimmed.match(/[^.!?]+[.!?]+[\s]*/g) || [trimmed];
      let sentBuf = "";
      for (const sent of sentences) {
        if ((sentBuf + sent).length > maxChars) {
          if (sentBuf.trim()) chunks.push(sentBuf.trim());
          sentBuf = sent;
        } else {
          sentBuf += sent;
        }
      }
      if (sentBuf.trim()) current = sentBuf;
      continue;
    }

    const candidate = current ? current + "\n\n" + trimmed : trimmed;
    if (candidate.length > maxChars) {
      chunks.push(current.trim());
      current = trimmed;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ---------------------------------------------------------------------------
// Post-processing: clean Azure wordBoundary artifacts
// (EXACT copy from generate-audiobook-v2.mjs lines 401-428)
// ---------------------------------------------------------------------------

/**
 * Clean Azure wordBoundary artifacts from timing word array.
 *
 * Azure Speech SDK's wordBoundary events produce 3 categories of artifacts:
 * 1. Embedded newlines from SSML <p> boundaries leaking into word events
 * 2. Leading/trailing Unicode quotes leaking from SSML narration text
 * 3. Em-dash prefixes when narration text has "\u2014 Word" (Azure merges dash+word)
 */
function cleanTimingWords(words) {
  const cleaned = [];
  for (const w of words) {
    let word = w.word;

    // 1. Strip embedded newlines and excess whitespace (SSML paragraph boundary artifacts)
    word = word.replace(/\n\s*/g, "").trim();

    // 2. Strip leading/trailing Unicode quotes that leaked from SSML
    word = word.replace(/^[\u201C\u201D\u201E\u201F\u00AB\u00BB"]+/, "");
    word = word.replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB"]+$/, "");

    // 3. Handle em-dash merged words: "\u2014 Word" -> "Word"
    word = word.replace(/^\u2014\s*/, "");

    // 4. Skip empty words after cleaning
    word = word.trim();
    if (word.length === 0) continue;

    cleaned.push({
      ...w,
      word: word,
    });
  }
  return cleaned;
}

// ---------------------------------------------------------------------------
// Sentence Splitting (for timing validation)
// ---------------------------------------------------------------------------

/**
 * Split narration text into sentences for timing validation.
 *
 * Rules:
 * - Split on . ? ! followed by whitespace or end-of-string
 * - Handle ellipsis ... as sentence-ending
 * - Handle quoted dialogue: period inside quotes ends the sentence
 * - Do NOT split on abbreviations (Sr., Dr.) -- rare in this text
 * - Return array of sentence strings (trimmed, non-empty)
 */
function splitSentences(text) {
  // Replace ellipsis with a unique marker to preserve as sentence-ending
  let processed = text.replace(/\.{3}/g, "\u2026");

  // Split on sentence-ending punctuation followed by whitespace or end-of-string
  // This handles . ? ! and ellipsis (now \u2026)
  const rawSentences = processed.split(
    /(?<=[.?!\u2026])\s+(?=[A-Z\u00C0-\u00DC\u00E0-\u00FC\u201C"(])|(?<=[.?!\u2026])$/gm
  );

  return rawSentences
    .map((s) => s.replace(/\u2026/g, "...").trim())
    .filter((s) => s.length > 0);
}

// ---------------------------------------------------------------------------
// Post-processing: derive sentence timings from word timings
// ---------------------------------------------------------------------------

/**
 * Derive sentence boundaries from word timing data when Azure SentenceBoundary
 * events return 0 results (known issue with CamilaNeural / AriaNeural voices).
 *
 * Algorithm:
 *  1. Split narration text into sentences using splitSentences()
 *  2. For each sentence, extract its constituent words (strip punctuation)
 *  3. Walk the word timing array sequentially, fuzzy-matching sentence words
 *     to word.word (case-insensitive, punctuation-stripped)
 *  4. Record first matched word's start and last matched word's end
 *  5. Return [{text, start, end}]
 *
 * @param {string} narrationText - The full narration text (from markdownToNarrationText)
 * @param {Array} wordTimings - Cleaned word timing array [{word, start, end, score}]
 * @returns {Array} Sentence timings [{text, start, end}]
 */
function deriveSentencesFromWords(narrationText, wordTimings) {
  const sentences = splitSentences(narrationText);
  if (sentences.length === 0 || wordTimings.length === 0) return [];

  /**
   * Normalize a word for fuzzy matching:
   * - lowercase
   * - strip all punctuation (periods, commas, quotes, colons, semicolons, etc.)
   * - strip Unicode quotes and em-dashes
   */
  function normalizeWord(w) {
    return w
      .toLowerCase()
      .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB"'`]/g, "")
      .replace(/[\u2014\u2013\u2026]/g, "")
      .replace(/[.,;:!?()[\]{}\-_/\\]/g, "")
      .trim();
  }

  /**
   * Extract words from a sentence, stripping punctuation but preserving
   * the word stems for matching against Azure word timings.
   */
  function extractSentenceWords(sentence) {
    // Split on whitespace, then normalize each token
    return sentence
      .split(/\s+/)
      .map(normalizeWord)
      .filter((w) => w.length > 0);
  }

  const derived = [];
  let wordIdx = 0; // running pointer into wordTimings array

  for (const sentence of sentences) {
    const sentenceWords = extractSentenceWords(sentence);
    if (sentenceWords.length === 0) continue;

    // Find the first word of this sentence in the word timing array
    // Allow a lookahead window to handle minor mismatches (e.g., Azure
    // splitting/merging words differently than our tokenizer)
    const MAX_LOOKAHEAD = 15;
    let firstMatchIdx = -1;

    for (let look = 0; look < MAX_LOOKAHEAD && wordIdx + look < wordTimings.length; look++) {
      const candidate = normalizeWord(wordTimings[wordIdx + look].word);
      if (candidate === sentenceWords[0]) {
        firstMatchIdx = wordIdx + look;
        break;
      }
      // Also try matching first 2 words joined (Azure sometimes merges tokens)
      if (sentenceWords.length >= 2) {
        const joined = sentenceWords[0] + sentenceWords[1];
        if (candidate === joined) {
          firstMatchIdx = wordIdx + look;
          break;
        }
      }
    }

    if (firstMatchIdx === -1) {
      // Could not find sentence start -- use current position as best guess
      // This handles edge cases like onomatopoeia or special formatting
      firstMatchIdx = wordIdx;
    }

    // Now walk forward matching remaining sentence words to find the last word
    let matchPtr = firstMatchIdx;
    let lastMatchIdx = firstMatchIdx;
    let sentWordIdx = 0;

    while (sentWordIdx < sentenceWords.length && matchPtr < wordTimings.length) {
      const timingWord = normalizeWord(wordTimings[matchPtr].word);
      const sentWord = sentenceWords[sentWordIdx];

      if (timingWord === sentWord) {
        lastMatchIdx = matchPtr;
        matchPtr++;
        sentWordIdx++;
      } else if (sentWord.startsWith(timingWord) || timingWord.startsWith(sentWord)) {
        // Partial match (Azure split a word or our tokenizer merged one)
        lastMatchIdx = matchPtr;
        matchPtr++;
        sentWordIdx++;
      } else {
        // Mismatch -- skip this timing word (Azure might have injected an extra)
        matchPtr++;
        // Safety: don't skip too far ahead
        if (matchPtr - lastMatchIdx > 10) break;
      }
    }

    // Clamp to valid bounds
    const clampedFirst = Math.min(firstMatchIdx, wordTimings.length - 1);
    const clampedLast = Math.min(lastMatchIdx, wordTimings.length - 1);

    derived.push({
      text: sentence,
      start: wordTimings[clampedFirst].start,
      end: wordTimings[clampedLast].end,
    });

    // Advance the running pointer past this sentence's words
    wordIdx = clampedLast + 1;
  }

  return derived;
}

// ---------------------------------------------------------------------------
// SSML Builder with PLS Lexicon Reference
// ---------------------------------------------------------------------------

function buildSSML(text, voiceName, langCode, style, lexiconUri) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  const paragraphs = escaped.split(/\n\n+/);
  const ssmlParagraphs = paragraphs
    .map((p) => `        <p>${p.trim()}</p>`)
    .join("\n");

  const nsAttr = style
    ? ' xmlns:mstts="http://www.w3.org/2001/mstts"'
    : "";
  const lexiconTag = lexiconUri
    ? `\n    <lexicon uri="${lexiconUri}"/>`
    : "";
  const styleOpen = style
    ? `\n      <mstts:express-as style="${style}">`
    : "";
  const styleClose = style ? "\n      </mstts:express-as>" : "";

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"${nsAttr} xml:lang="${langCode}">
  <voice name="${voiceName}">${lexiconTag}${styleOpen}
    <prosody rate="0%" pitch="0%">
${ssmlParagraphs}
    </prosody>${styleClose}
  </voice>
</speak>`;
}

// ---------------------------------------------------------------------------
// Azure Speech SDK: synthesize one chunk and capture word + sentence timing
// ---------------------------------------------------------------------------

function synthesizeChunk(speechConfig, text, voiceName, langCode, style, lexiconUri) {
  return new Promise((resolve, reject) => {
    const ssml = buildSSML(text, voiceName, langCode, style, lexiconUri);

    // Create a pull stream to capture audio data in memory
    const pullStream = SpeechSDK.AudioOutputStream.createPullStream();
    const audioConfig = SpeechSDK.AudioConfig.fromStreamOutput(pullStream);
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);

    const wordTimings = [];
    const sentenceTimings = [];

    // Subscribe to wordBoundary event -- captures BOTH word and sentence boundaries
    synthesizer.wordBoundary = (_sender, event) => {
      if (event.boundaryType === SpeechSDK.SpeechSynthesisBoundaryType.Word) {
        wordTimings.push({
          word: event.text,
          start: event.audioOffset / 10_000_000, // ticks -> seconds
          end: (event.audioOffset + event.duration) / 10_000_000,
          score: 1.0, // Perfect confidence -- SDK timing is authoritative
        });
      }
      if (event.boundaryType === SpeechSDK.SpeechSynthesisBoundaryType.Sentence) {
        sentenceTimings.push({
          text: event.text,
          start: event.audioOffset / 10_000_000,
          end: (event.audioOffset + event.duration) / 10_000_000,
        });
      }
    };

    synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        synthesizer.close();

        if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
          const audioData = result.audioData;
          const durationMs =
            audioData.byteLength > 0
              ? wordTimings.length > 0
                ? wordTimings[wordTimings.length - 1].end * 1000
                : 0
              : 0;

          resolve({
            audioBuffer: Buffer.from(audioData),
            wordTimings,
            sentenceTimings,
            durationMs,
          });
        } else if (result.reason === SpeechSDK.ResultReason.Canceled) {
          const cancellation = SpeechSDK.CancellationDetails.fromResult(result);
          reject(
            new Error(
              `Speech synthesis canceled: ${cancellation.reason}. ` +
                `Error: ${cancellation.errorDetails || "none"}`
            )
          );
        } else {
          reject(new Error(`Unexpected result reason: ${result.reason}`));
        }
      },
      (error) => {
        synthesizer.close();
        reject(new Error(`Speech synthesis error: ${error}`));
      }
    );
  });
}

// ---------------------------------------------------------------------------
// Generate a single chapter: audio + timing
// ---------------------------------------------------------------------------

async function generateChapter(speechConfig, chapterNum, lang, opts) {
  const langCode = lang === "es" ? "es-PE" : "en-US";
  const voiceName = VOICES[lang];
  const style = STYLES[lang];

  // Read chapter text
  const textFile = CHAPTER_FILES[chapterNum]?.[lang];
  if (!textFile) {
    console.error(`  No text file mapping for ch${chapterNum}/${lang}`);
    return false;
  }

  const textPath = path.join(CHAPTERS_DIR, lang, textFile);
  if (!fs.existsSync(textPath)) {
    console.error(`  Text file not found: ${textPath}`);
    return false;
  }

  const rawMd = fs.readFileSync(textPath, "utf8");
  const narrationText = markdownToNarrationText(rawMd);
  const chunks = chunkText(narrationText);
  const totalChars = narrationText.length;
  const expectedSentences = splitSentences(narrationText);

  // Resolve lexicon URI for this language
  const lexiconUri = resolveLexiconUri(lang, opts.lexiconUrl);

  console.log(`\n  Chapter ${chapterNum} [${lang.toUpperCase()}]`);
  console.log(`  Voice: ${voiceName} | Style: ${style || "default"}`);
  console.log(
    `  Characters: ${totalChars.toLocaleString()} | Chunks: ${chunks.length} | Expected sentences: ${expectedSentences.length}`
  );
  console.log(`  Lexicon: ${lexiconUri || "none (no --lexicon-url provided)"}`);

  if (opts.dryRun) {
    console.log(
      `  DRY RUN: would generate ${chunks.length} chunks, ~${totalChars} chars`
    );
    for (let i = 0; i < chunks.length; i++) {
      console.log(
        `    Chunk ${i + 1}: ${chunks[i].length} chars, starts: "${chunks[i].slice(0, 60)}..."`
      );
    }
    return true;
  }

  // Output paths
  const audioFilename = textFile.replace(/\.md$/, ".mp3");
  const audioDir = path.join(AUDIO_OUTPUT_DIR, lang);
  const chunksDir = path.join(audioDir, "chunks", chapterNum);
  const audioPath = path.join(audioDir, audioFilename);
  const timingDir = path.join(TIMING_OUTPUT_DIR, lang);
  const sentenceTimingPath = path.join(timingDir, `ch${chapterNum}.json`);
  const wordTimingPath = path.join(timingDir, `ch${chapterNum}-words.json`);

  fs.mkdirSync(chunksDir, { recursive: true });
  fs.mkdirSync(timingDir, { recursive: true });

  const allWordTimings = [];
  const allSentenceTimings = [];
  const audioBuffers = [];
  let cumulativeOffsetSec = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunkFile = path.join(
      chunksDir,
      `chunk-${String(i).padStart(3, "0")}.mp3`
    );

    process.stdout.write(`  [${i + 1}/${chunks.length}] synthesizing...`);

    try {
      const result = await synthesizeChunk(
        speechConfig,
        chunks[i],
        voiceName,
        langCode,
        style,
        lexiconUri
      );

      // Save chunk audio
      fs.writeFileSync(chunkFile, result.audioBuffer);

      // Offset word timings by cumulative duration of previous chunks
      for (const word of result.wordTimings) {
        allWordTimings.push({
          word: word.word,
          start: parseFloat((word.start + cumulativeOffsetSec).toFixed(3)),
          end: parseFloat((word.end + cumulativeOffsetSec).toFixed(3)),
          score: word.score,
        });
      }

      // Offset sentence timings by cumulative duration of previous chunks
      for (const sentence of result.sentenceTimings) {
        allSentenceTimings.push({
          text: sentence.text,
          start: parseFloat((sentence.start + cumulativeOffsetSec).toFixed(3)),
          end: parseFloat((sentence.end + cumulativeOffsetSec).toFixed(3)),
        });
      }

      // Calculate chunk duration from actual audio data (byte-based, not word-end + buffer)
      // For MP3 at 192kbps: duration_seconds = (bytes * 8) / 192000
      const chunkDurationSec =
        (result.audioBuffer.length * 8) / AUDIO_BITRATE;
      cumulativeOffsetSec += chunkDurationSec;

      audioBuffers.push(result.audioBuffer);

      const sizeMB = (result.audioBuffer.length / 1024).toFixed(0);
      const wordCount = result.wordTimings.length;
      const sentCount = result.sentenceTimings.length;
      process.stdout.write(
        `\r  [${i + 1}/${chunks.length}] ${sizeMB} KB, ${wordCount} words, ${sentCount} sentences timed\n`
      );
    } catch (err) {
      console.error(`\n  ERROR on chunk ${i + 1}: ${err.message}`);
      console.error(`  Text starts: "${chunks[i].slice(0, 80)}..."`);
      throw err;
    }

    // Rate limit delay
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CHUNKS_MS));
    }
  }

  // Concatenate all audio chunks into final chapter file
  console.log(`  Concatenating ${audioBuffers.length} chunks...`);
  const finalAudio = Buffer.concat(audioBuffers);
  fs.writeFileSync(audioPath, finalAudio);
  console.log(
    `  Audio: ${audioPath} (${(finalAudio.length / (1024 * 1024)).toFixed(1)} MB)`
  );

  // Post-process: clean Azure word artifacts (newlines, quotes, em-dash prefixes)
  const cleanedWordTimings = cleanTimingWords(allWordTimings);
  console.log(
    `  Words cleaned: ${allWordTimings.length} -> ${cleanedWordTimings.length} (${allWordTimings.length - cleanedWordTimings.length} removed)`
  );

  // Derive sentence timings from words if Azure SentenceBoundary returned 0
  // (known issue with CamilaNeural and AriaNeural voices)
  let finalSentenceTimings = allSentenceTimings;
  if (allSentenceTimings.length === 0 && cleanedWordTimings.length > 0) {
    console.log(
      `  WARNING: Azure SentenceBoundary returned 0 sentences. Deriving from ${cleanedWordTimings.length} words...`
    );
    finalSentenceTimings = deriveSentencesFromWords(narrationText, cleanedWordTimings);
    console.log(
      `  Derived ${finalSentenceTimings.length} sentences from ${cleanedWordTimings.length} words`
    );
  }

  // Write sentence timing JSON
  fs.writeFileSync(
    sentenceTimingPath,
    JSON.stringify(finalSentenceTimings, null, 2)
  );
  console.log(
    `  Sentence timing: ${sentenceTimingPath} (${finalSentenceTimings.length} sentences)`
  );

  // Write word timing JSON
  fs.writeFileSync(
    wordTimingPath,
    JSON.stringify(cleanedWordTimings, null, 2)
  );
  console.log(
    `  Word timing: ${wordTimingPath} (${cleanedWordTimings.length} words)`
  );

  // Validate sentence count
  if (finalSentenceTimings.length !== expectedSentences.length) {
    console.warn(
      `  WARNING: Sentence count mismatch! Timing: ${finalSentenceTimings.length}, Text: ${expectedSentences.length}`
    );
  } else {
    console.log(
      `  Sentence count validated: ${finalSentenceTimings.length} sentences match`
    );
  }

  // Check timing drift between audio duration and last sentence end
  const totalAudioDuration = (finalAudio.length * 8) / AUDIO_BITRATE;
  const lastSentenceEnd =
    finalSentenceTimings[finalSentenceTimings.length - 1]?.end || 0;
  const drift = Math.abs(totalAudioDuration - lastSentenceEnd);
  if (drift > 2.0) {
    console.warn(
      `  WARNING: Timing drift ${drift.toFixed(1)}s between audio (${totalAudioDuration.toFixed(1)}s) and last sentence (${lastSentenceEnd.toFixed(1)}s)`
    );
  } else {
    console.log(
      `  Timing drift: ${drift.toFixed(1)}s (OK, within 2.0s threshold)`
    );
  }

  // Verify timing monotonicity
  let monotonic = true;
  for (let i = 1; i < finalSentenceTimings.length; i++) {
    if (finalSentenceTimings[i].start < finalSentenceTimings[i - 1].start) {
      console.warn(
        `  WARNING: Non-monotonic sentence timing at ${i}: "${finalSentenceTimings[i].text.slice(0, 30)}..." (${finalSentenceTimings[i].start}s) < "${finalSentenceTimings[i - 1].text.slice(0, 30)}..." (${finalSentenceTimings[i - 1].start}s)`
      );
      monotonic = false;
    }
  }
  if (monotonic) {
    console.log(`  Timing verified: monotonically increasing`);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Lexicon URI Resolution
// ---------------------------------------------------------------------------

function resolveLexiconUri(lang, explicitUrl) {
  const lexiconFilename = lang === "es" ? "quechua-es.xml" : "quechua-en.xml";

  if (explicitUrl) {
    // Explicit URL provided via --lexicon-url
    const fullUri = explicitUrl.endsWith("/")
      ? `${explicitUrl}${lexiconFilename}`
      : `${explicitUrl}/${lexiconFilename}`;
    return fullUri;
  }

  // Check if lexicon files exist locally
  const localPath = path.join(LEXICON_DIR, lexiconFilename);
  if (fs.existsSync(localPath)) {
    // Local files exist but Azure requires HTTPS URLs for lexicon
    // Return null and log a warning -- user must provide --lexicon-url for production
    console.log(
      `  INFO: Lexicon file found at ${localPath} but Azure requires HTTPS URL.`
    );
    console.log(
      `  INFO: Use --lexicon-url <https://...> to enable lexicon in synthesis.`
    );
    return null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Verify Alignment Mode
// ---------------------------------------------------------------------------

function runVerifyAlignment(opts) {
  console.log("=== Verify Sentence Alignment ===\n");

  const chapterNums =
    opts.chapters.length > 0
      ? opts.chapters
      : Object.keys(CHAPTER_FILES).sort();
  const langs = opts.lang ? [opts.lang] : ["es", "en"];

  let allPass = true;

  for (const chNum of chapterNums) {
    for (const lang of langs) {
      const timingPath = path.join(TIMING_OUTPUT_DIR, lang, `ch${chNum}.json`);
      if (!fs.existsSync(timingPath)) {
        console.log(`  SKIP ch${chNum}/${lang}: no timing file`);
        continue;
      }

      const timing = JSON.parse(fs.readFileSync(timingPath, "utf8"));
      const textFile = CHAPTER_FILES[chNum]?.[lang];
      if (!textFile) {
        console.log(`  SKIP ch${chNum}/${lang}: no chapter file mapping`);
        continue;
      }

      const textPath = path.join(CHAPTERS_DIR, lang, textFile);
      const rawMd = fs.readFileSync(textPath, "utf8");
      const narration = markdownToNarrationText(rawMd);
      const expectedSentences = splitSentences(narration);

      const match = timing.length === expectedSentences.length;
      const icon = match ? "PASS" : "FAIL";
      console.log(
        `  ${icon} ch${chNum}/${lang}: timing=${timing.length} text=${expectedSentences.length}`
      );

      if (!match) allPass = false;
    }
  }

  process.exit(allPass ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();

  if (opts.help) {
    console.log(`
Pachacuti Audiobook Generator v3 -- Azure Speech SDK + PLS Lexicon + SentenceBoundary Timing

  --dry-run                Preview character/chunk counts (no API calls)
  --chapter <NUM>          Generate specific chapter (e.g., 00). Can repeat.
  --lang <es|en>           Generate only one language (default: both)
  --verify-alignment       Compare sentence count in timing vs text (no Azure calls)
  --lexicon-url <URL>      Base URL for PLS lexicon files (must be HTTPS for Azure)
  --help                   Show this help

Environment (from .env.local):
  AZURE_SPEECH_KEY         Azure AI Services subscription key
  AZURE_SPEECH_ENDPOINT    Azure endpoint URL

Outputs:
  Audio:    public/audio/chapters/{lang}/*.mp3
  Sentence: public/audio/timing/{lang}/ch{NN}.json       [{text, start, end}]
  Words:    public/audio/timing/{lang}/ch{NN}-words.json  [{word, start, end, score}]

Chapters detected: ${Object.keys(CHAPTER_FILES).sort().join(", ")} (${Object.keys(CHAPTER_FILES).length} chapters)
`);
    process.exit(0);
  }

  // --verify-alignment: no Azure key needed
  if (opts.verifyAlignment) {
    runVerifyAlignment(opts);
    return; // runVerifyAlignment calls process.exit
  }

  // For generation, we need Azure credentials
  const speechKey = process.env.AZURE_SPEECH_KEY;
  const speechEndpoint = process.env.AZURE_SPEECH_ENDPOINT;

  if (!opts.dryRun) {
    if (!speechKey) {
      console.error(
        "ERROR: AZURE_SPEECH_KEY not set. Add to .env.local or set environment variable."
      );
      process.exit(1);
    }
    if (!speechEndpoint) {
      console.error(
        "ERROR: AZURE_SPEECH_ENDPOINT not set. Add to .env.local or set environment variable."
      );
      process.exit(1);
    }
  }

  // Determine chapters to process
  const chapterNums =
    opts.chapters.length > 0
      ? opts.chapters
      : Object.keys(CHAPTER_FILES).sort();
  const langs = opts.lang ? [opts.lang] : ["es", "en"];

  console.log("=== Pachacuti Audiobook Generator v3 ===");
  console.log(`Mode: ${opts.dryRun ? "DRY RUN" : "GENERATE"}`);
  console.log(`Chapters: ${chapterNums.join(", ")} (${chapterNums.length} total)`);
  console.log(`Languages: ${langs.join(", ")}`);
  console.log(`Lexicon URL: ${opts.lexiconUrl || "(none -- use --lexicon-url for production)"}`);

  // Configure Azure Speech
  let speechConfig = null;
  if (!opts.dryRun) {
    // Extract region from endpoint URL
    // e.g., https://pachacuti-resource.services.ai.azure.com -> use endpoint directly
    speechConfig = SpeechSDK.SpeechConfig.fromEndpoint(
      new URL(speechEndpoint),
      speechKey
    );
    speechConfig.speechSynthesisOutputFormat =
      SpeechSDK.SpeechSynthesisOutputFormat[AUDIO_FORMAT_ENUM];
  }

  let successCount = 0;
  let failCount = 0;

  for (const chNum of chapterNums) {
    if (!CHAPTER_FILES[chNum]) {
      console.log(`\n  SKIP ch${chNum}: not in chapter map (placeholder or missing)`);
      continue;
    }

    for (const lang of langs) {
      if (!CHAPTER_FILES[chNum][lang]) {
        console.log(`\n  SKIP ch${chNum}/${lang}: no text file`);
        continue;
      }

      try {
        const success = await generateChapter(
          speechConfig,
          chNum,
          lang,
          opts
        );
        if (success) successCount++;
        else failCount++;
      } catch (err) {
        console.error(`\n  FATAL: ch${chNum}/${lang}: ${err.message}`);
        failCount++;
      }
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Success: ${successCount} | Failed: ${failCount}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
