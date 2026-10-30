/**
 * audit-ipa.ts -- Audit IPA output against known-correct Quechua pronunciations
 *
 * Usage: npx tsx scripts/audit-ipa.ts
 *
 * Tests the toIPA() function and IPA_OVERRIDES against a hand-curated set of
 * known-correct IPA transcriptions for Quechua/Andean words.
 */

// We need to import the functions from build-quechua-lexicon.ts
// Since they're not exported, we'll duplicate the logic here for audit purposes
// and compare against the actual PLS output.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const PROJECT_ROOT = join(import.meta.dirname, '..')

// ---------------------------------------------------------------------------
// Known-correct IPA mappings (hand-verified by Quechua pronunciation reference)
// Format: word -> { en: expected_en_ipa, es: expected_es_ipa }
// ---------------------------------------------------------------------------

const KNOWN_CORRECT: Record<string, { en: string; es: string }> = {
  // Character names
  'pachacuti':       { en: 'pa.tʃa.ˈku.ti',        es: 'pa.tʃa.ˈku.ti' },
  'cusi yupanqui':   { en: 'ˈku.si ju.ˈpaŋ.ki',    es: 'ˈku.si ju.ˈpaŋ.ki' },
  'rumi':            { en: 'ˈɾu.mi',                es: 'ˈɾu.mi' },
  'mama ocllo':      { en: 'ˈma.ma ˈo.jo',          es: 'ˈma.ma ˈo.ʎo' },
  'willaq umu':      { en: 'wi.ˈjak ˈu.mu',         es: 'wi.ˈʎak ˈu.mu' },
  'naymlap':         { en: 'najm.ˈlap',             es: 'najm.ˈlap' },
  'chukillanto':     { en: 'tʃu.ki.ˈjan.to',        es: 'tʃu.ki.ˈʎan.to' },
  'ollantay':        { en: 'o.jan.ˈtaj',             es: 'o.ʎan.ˈtaj' },
  'tupaq':           { en: 'ˈtu.pak',                es: 'ˈtu.pak' },
  'amaru':           { en: 'a.ˈma.ɾu',              es: 'a.ˈma.ɾu' },
  'wiracocha':       { en: 'wi.ɾa.ˈko.tʃa',         es: 'wi.ɾa.ˈko.tʃa' },

  // Place names
  'qosqo':           { en: 'ˈkos.ko',               es: 'ˈkos.ko' },
  'sacsayhuaman':    { en: 'sak.saj.wa.ˈman',       es: 'sak.saj.wa.ˈman' },
  'qoricancha':      { en: 'ko.ɾi.ˈkan.tʃa',        es: 'ko.ɾi.ˈkan.tʃa' },
  'huacaypata':      { en: 'wa.kaj.ˈpa.ta',          es: 'wa.kaj.ˈpa.ta' },
  'titicaca':        { en: 'ti.ti.ˈka.ka',           es: 'ti.ti.ˈka.ka' },
  'tiahuanaco':      { en: 'tja.wa.ˈna.ko',          es: 'tja.wa.ˈna.ko' },

  // Problem words: "w" handling
  'wayra':           { en: 'ˈwaj.ɾa',               es: 'ˈwaj.ɾa' },
  'wankara':         { en: 'waŋ.ˈka.ɾa',            es: 'waŋ.ˈka.ɾa' },
  'waru waru':       { en: 'ˈwa.ɾu ˈwa.ɾu',         es: 'ˈwa.ɾu ˈwa.ɾu' },
  'watia':           { en: 'ˈwa.tja',                es: 'ˈwa.tja' },
  'wawqiy':          { en: 'ˈwaw.kij',              es: 'ˈwaw.kij' },

  // Problem words: "hu" handling
  'huaca':           { en: 'ˈwa.ka',                 es: 'ˈwa.ka' },
  'huanca':          { en: 'ˈwaŋ.ka',               es: 'ˈwaŋ.ka' },

  // Multi-word phrases
  'hanan pacha':     { en: 'ˈa.nan ˈpa.tʃa',        es: 'ˈa.nan ˈpa.tʃa' },
  'kay pacha':       { en: 'ˈkaj ˈpa.tʃa',          es: 'ˈkaj ˈpa.tʃa' },
  'ukhu pacha':      { en: 'ˈu.ku ˈpa.tʃa',         es: 'ˈu.ku ˈpa.tʃa' },
  'inti raymi':      { en: 'ˈin.ti ˈɾaj.mi',         es: 'ˈin.ti ˈɾaj.mi' },
  'sapa inca':       { en: 'ˈsa.pa ˈiŋ.ka',          es: 'ˈsa.pa ˈiŋ.ka' },

  // Apostrophes (glottal stops)
  "sut'i":           { en: 'ˈsu.ti',                 es: 'ˈsu.ti' },
  "mama k'antu":     { en: 'ˈma.ma ˈkan.tu',         es: 'ˈma.ma ˈkan.tu' },

  // Compound words
  'quipucamayoc':    { en: 'ki.pu.ka.ˈma.jok',       es: 'ki.pu.ka.ˈma.jok' },
  'cumbicamayoc':    { en: 'kum.bi.ka.ˈma.jok',      es: 'kum.bi.ka.ˈma.jok' },
  'tawantinsuyu':    { en: 'ta.wan.tin.ˈsu.ju',       es: 'ta.wan.tin.ˈsu.ju' },

  // Short common words
  'ayllu':           { en: 'ˈaj.ju',                 es: 'ˈaj.ʎu' },
  'inti':            { en: 'ˈin.ti',                 es: 'ˈin.ti' },
  'apu':             { en: 'ˈa.pu',                  es: 'ˈa.pu' },
  'quipu':           { en: 'ˈki.pu',                 es: 'ˈki.pu' },
  'chicha':          { en: 'ˈtʃi.tʃa',              es: 'ˈtʃi.tʃa' },
}

// ---------------------------------------------------------------------------
// Parse the PLS XML to get the actual IPA output
// ---------------------------------------------------------------------------

function parsePLS(filepath: string): Map<string, string> {
  const content = readFileSync(filepath, 'utf-8')
  const map = new Map<string, string>()
  const regex = /<lexeme>\s*<grapheme>([^<]+)<\/grapheme>\s*<phoneme>([^<]+)<\/phoneme>\s*<\/lexeme>/g
  let match
  while ((match = regex.exec(content)) !== null) {
    // Normalize: decode &apos; and curly quotes to ASCII apostrophe
    const grapheme = match[1]
      .toLowerCase()
      .replace(/&apos;/g, "'")
      .replace(/[\u2018\u2019\u2018\u2019]/g, "'")
    map.set(grapheme, match[2])
  }
  return map
}

// ---------------------------------------------------------------------------
// Run audit
// ---------------------------------------------------------------------------

function main() {
  console.log('=== IPA Audit: Known-Correct Quechua Pronunciations ===\n')

  const plsEnPath = join(PROJECT_ROOT, 'public/audio/lexicon/quechua-en.xml')
  const plsEsPath = join(PROJECT_ROOT, 'public/audio/lexicon/quechua-es.xml')

  const plsEn = parsePLS(plsEnPath)
  const plsEs = parsePLS(plsEsPath)

  console.log(`PLS EN entries: ${plsEn.size}`)
  console.log(`PLS ES entries: ${plsEs.size}`)
  console.log(`Known-correct test words: ${Object.keys(KNOWN_CORRECT).length}\n`)

  let passCount = 0
  let failCount = 0
  const failures: { word: string; lang: string; expected: string; actual: string }[] = []

  for (const [word, expected] of Object.entries(KNOWN_CORRECT)) {
    for (const lang of ['en', 'es'] as const) {
      const pls = lang === 'en' ? plsEn : plsEs
      const actual = pls.get(word)
      const expectedIPA = expected[lang]

      if (!actual) {
        failCount++
        failures.push({ word, lang, expected: expectedIPA, actual: '(MISSING from PLS)' })
        continue
      }

      if (actual === expectedIPA) {
        passCount++
      } else {
        failCount++
        failures.push({ word, lang, expected: expectedIPA, actual })
      }
    }
  }

  console.log('--- Results ---')
  console.log(`PASS: ${passCount}`)
  console.log(`FAIL: ${failCount}`)
  console.log(`Total tests: ${passCount + failCount}`)

  if (failures.length > 0) {
    console.log('\n--- Failures ---')
    for (const f of failures) {
      console.log(`  FAIL [${f.lang}] "${f.word}"`)
      console.log(`    Expected: ${f.expected}`)
      console.log(`    Actual:   ${f.actual}`)
    }
  }

  console.log('\n--- Summary ---')
  const pctPass = ((passCount / (passCount + failCount)) * 100).toFixed(1)
  console.log(`${pctPass}% pass rate (${passCount}/${passCount + failCount})`)

  if (failCount > 0) {
    process.exit(1)
  }
}

main()
