/**
 * build-quechua-lexicon.ts -- Quechua Pronunciation Dictionary + PLS Lexicon Generator
 *
 * Scans all source material (PACHACUTI-BIBLE.md, glossary.ts, characters.ts, chapters.ts,
 * chapter markdown text) to build a comprehensive Quechua pronunciation dictionary, then
 * outputs PLS (Pronunciation Lexicon Specification) XML files for Azure TTS.
 *
 * Usage:
 *   npx tsx scripts/build-quechua-lexicon.ts               # Build master word list JSON
 *   npx tsx scripts/build-quechua-lexicon.ts --dry-run      # Print word count without writing
 *   npx tsx scripts/build-quechua-lexicon.ts --generate-pls # Build JSON + PLS XML files
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PROJECT_ROOT = join(import.meta.dirname, '..')
// Path to the story bible (private source material). Override with:
//   STORY_BIBLE_PATH=/path/to/PACHACUTI-BIBLE.md npx tsx scripts/build-quechua-lexicon.ts
const BIBLE_PATH = process.env.STORY_BIBLE_PATH
  ?? join(PROJECT_ROOT, 'content/reference/PACHACUTI-BIBLE.md')
const GLOSSARY_PATH = join(PROJECT_ROOT, 'src/lib/data/glossary.ts')
const CHARACTERS_PATH = join(PROJECT_ROOT, 'src/lib/data/characters.ts')
const CHAPTERS_PATH = join(PROJECT_ROOT, 'src/lib/data/chapters.ts')
const CHAPTERS_ES_DIR = join(PROJECT_ROOT, 'content/chapters/es')
const CHAPTERS_EN_DIR = join(PROJECT_ROOT, 'content/chapters/en')

const OUTPUT_JSON = join(PROJECT_ROOT, 'scripts/quechua-words.json')
const OUTPUT_PLS_DIR = join(PROJECT_ROOT, 'public/audio/lexicon')
const OUTPUT_PLS_EN = join(OUTPUT_PLS_DIR, 'quechua-en.xml')
const OUTPUT_PLS_ES = join(OUTPUT_PLS_DIR, 'quechua-es.xml')

// CLI flags
const DRY_RUN = process.argv.includes('--dry-run')
const GENERATE_PLS = process.argv.includes('--generate-pls')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuechuaWord {
  word: string
  sources: string[]
  suggestedIPA: string
}

// ---------------------------------------------------------------------------
// IPA Mapping Engine
// ---------------------------------------------------------------------------

/**
 * Converts a Quechua/Andean word to Hispanicized IPA.
 *
 * Rules (Hispanicized -- culturally authentic Peruvian pronunciation):
 * - Vowels: a=/a/, e=/e/, i=/i/, o=/o/, u=/u/
 * - qu before vowel = /k/ (not uvular /q/)
 * - ch = /tʃ/
 * - ll = /ʎ/ (for es-ES) or /j/ (for en-US) -- use /ʎ/ as default
 * - hu before vowel = /w/ (Hispanicized spelling for /w/)
 * - w = /w/ (native Quechua orthography)
 * - h = /h/ (Quechua has a real /h/ phoneme -- NOT silent like Spanish)
 * - Aspirated stops: qh=/kh/, kh=/kh/, ph=/ph/, th=/th/ (consonant + h sequence)
 * - v = /β/ (bilabial fricative, Hispanicized spelling)
 * - n before k/g = /ŋ/
 * - ñ = /ɲ/
 * - Standard: p=/p/, t=/t/, k=/k/, m=/m/, n=/n/, s=/s/, r=/ɾ/, rr=/r/
 * - Stress: penultimate syllable (Quechua default) marked with /ˈ/
 */
function toIPA(word: string, lang: 'en' | 'es' = 'es'): string {
  // Handle multi-word entries
  if (word.includes(' ')) {
    return word.split(' ').map(w => toIPA(w, lang)).join(' ')
  }

  const lower = word.toLowerCase()
    .replace(/['''\u2018\u2019]/g, "'") // normalize all apostrophe variants

  // Build phoneme list from graphemes
  const phonemes: string[] = []
  let i = 0

  while (i < lower.length) {
    const remaining = lower.slice(i)

    // Skip apostrophes (glottal stops in Quechua -- not pronounced in Hispanicized)
    if (lower[i] === "'") {
      i++
      continue
    }

    // Multi-character sequences (order matters -- longest first)

    // Aspirated stop digraphs: qh, kh, ph, th, chh → consonant + /h/ sequence
    if (remaining.startsWith('chh')) {
      // Aspirated affricate /tʃʰ/ → tʃ + h (Azure approximation)
      phonemes.push('tʃ')
      phonemes.push('h')
      i += 3
    } else if (remaining.startsWith('qh')) {
      // Aspirated uvular /qʰ/ → k + h (uvular→velar + aspiration)
      phonemes.push('k')
      phonemes.push('h')
      i += 2
    } else if (remaining.startsWith('kh')) {
      // Aspirated velar /kʰ/ → k + h
      phonemes.push('k')
      phonemes.push('h')
      i += 2
    } else if (remaining.startsWith('ph') && i + 2 < lower.length && isVowel(lower[i + 2])) {
      // Aspirated bilabial /pʰ/ → p + h (only before vowel to avoid false positives)
      phonemes.push('p')
      phonemes.push('h')
      i += 2
    } else if (remaining.startsWith('th') && i + 2 < lower.length && isVowel(lower[i + 2])) {
      // Aspirated alveolar /tʰ/ → t + h (only before vowel to avoid false positives)
      phonemes.push('t')
      phonemes.push('h')
      i += 2
    } else if (remaining.startsWith('cch')) {
      phonemes.push('tʃ')
      i += 3
    } else if (remaining.startsWith('ch')) {
      phonemes.push('tʃ')
      i += 2
    } else if (remaining.startsWith('ll')) {
      phonemes.push(lang === 'en' ? 'j' : 'ʎ')
      i += 2
    } else if (remaining.startsWith('rr')) {
      phonemes.push('r')
      i += 2
    } else if (remaining.startsWith('qu') && i + 2 < lower.length && isVowel(lower[i + 2])) {
      phonemes.push('k')
      i += 2
    } else if (remaining.startsWith('hu') && i + 2 < lower.length && isVowel(lower[i + 2])) {
      phonemes.push('w')
      i += 2
    } else if (remaining.startsWith('hua')) {
      phonemes.push('w')
      phonemes.push('a')
      i += 3
    } else if (remaining.startsWith('sh')) {
      phonemes.push('ʃ')
      i += 2
    } else if (remaining.startsWith('ñ') || remaining.startsWith('n\u0303')) {
      phonemes.push('ɲ')
      i += 1
    } else if (lower[i] === 'c' && i + 1 < lower.length && (lower[i + 1] === 'e' || lower[i + 1] === 'i')) {
      // ce, ci = /se/, /si/ in Hispanicized
      phonemes.push('s')
      i += 1
    } else if (lower[i] === 'c') {
      phonemes.push('k')
      i += 1
    } else if (lower[i] === 'q' && (i + 1 >= lower.length || lower[i + 1] !== 'u')) {
      // q not followed by u (or word-final q) → /k/ (uvular→velar approximation)
      phonemes.push('k')
      i += 1
    } else if (lower[i] === 'q' && i + 1 < lower.length && lower[i + 1] === 'u' && (i + 2 >= lower.length || !isVowel(lower[i + 2]))) {
      // qu not before vowel
      phonemes.push('k')
      i += 2
    } else if (lower[i] === 'x') {
      phonemes.push('k')
      phonemes.push('s')
      i += 1
    } else if (lower[i] === 'w') {
      phonemes.push('w')
      i += 1
    } else if (lower[i] === 'h') {
      // Quechua has a real /h/ phoneme (glottal fricative) -- NOT silent like Spanish.
      // "hu" before vowel is already handled above as /w/ (Hispanicized spelling).
      // All other "h" should emit /h/.
      phonemes.push('h')
      i += 1
    } else if (lower[i] === 'j') {
      phonemes.push('x')
      i += 1
    } else if (lower[i] === 'g' && i + 1 < lower.length && (lower[i + 1] === 'e' || lower[i + 1] === 'i')) {
      phonemes.push('x')
      i += 1
    } else if (lower[i] === 'g') {
      phonemes.push('ɡ')
      i += 1
    } else if (lower[i] === 'y') {
      phonemes.push('j')
      i += 1
    } else if (lower[i] === 'r') {
      phonemes.push('ɾ')
      i += 1
    } else if (lower[i] === 'n' && i + 1 < lower.length && (lower[i + 1] === 'k' || lower[i + 1] === 'g' || lower[i + 1] === 'c' || lower[i + 1] === 'q')) {
      phonemes.push('ŋ')
      i += 1
    } else if (lower[i] === 'ñ') {
      phonemes.push('ɲ')
      i += 1
    } else if (isVowel(lower[i])) {
      phonemes.push(lower[i])
      i += 1
    } else if (lower[i] === 'v') {
      // Hispanicized: v = /β/ (bilabial fricative, like Spanish "v" between vowels)
      phonemes.push('β')
      i += 1
    } else if ('bdfklmnpst'.includes(lower[i])) {
      phonemes.push(lower[i])
      i += 1
    } else {
      // Unknown character, skip
      i += 1
    }
  }

  // Apply stress to penultimate syllable
  return addStress(phonemes)
}

function isVowel(ch: string): boolean {
  return 'aeiou'.includes(ch)
}

function isPhonemeVowel(ph: string): boolean {
  return 'aeiou'.includes(ph)
}

/**
 * Add penultimate stress mark (Quechua default).
 * Groups phonemes into syllables and marks the penultimate one.
 */
function addStress(phonemes: string[]): string {
  // Find vowel positions (syllable nuclei)
  const vowelIndices: number[] = []
  for (let i = 0; i < phonemes.length; i++) {
    if (isPhonemeVowel(phonemes[i])) {
      vowelIndices.push(i)
    }
  }

  if (vowelIndices.length <= 1) {
    // Monosyllabic or no vowels -- no stress mark needed
    return phonemes.join('')
  }

  // Penultimate stress: mark the vowel of the second-to-last syllable
  const stressIndex = vowelIndices[vowelIndices.length - 2]

  // Build syllabified output with stress
  const syllables = syllabify(phonemes)
  if (syllables.length <= 1) {
    return phonemes.join('')
  }

  // Mark penultimate syllable
  const penultimateIdx = syllables.length - 2
  syllables[penultimateIdx] = 'ˈ' + syllables[penultimateIdx]

  return syllables.join('.')
}

/**
 * Simple syllabification: each vowel is a syllable nucleus.
 * Consonants attach to following vowel when possible.
 */
function syllabify(phonemes: string[]): string[] {
  const syllables: string[] = []
  let current = ''

  for (let i = 0; i < phonemes.length; i++) {
    current += phonemes[i]

    if (isPhonemeVowel(phonemes[i])) {
      // Look ahead: if next chars are consonant(s) + vowel, the last consonant
      // starts a new syllable. Otherwise consonants belong to current syllable.
      let j = i + 1
      // Count following consonants
      while (j < phonemes.length && !isPhonemeVowel(phonemes[j])) {
        j++
      }
      // If there's a vowel after consonant cluster, split:
      // keep all but last consonant in current syllable
      const consonantCount = j - (i + 1)
      if (j < phonemes.length && consonantCount > 0) {
        // Add all but last consonant to current syllable
        for (let k = i + 1; k < j - 1; k++) {
          current += phonemes[k]
        }
        syllables.push(current)
        current = ''
        i = j - 2 // -1 because loop will i++
      } else if (j >= phonemes.length && consonantCount > 0) {
        // Trailing consonants -- add to current syllable
        for (let k = i + 1; k < j; k++) {
          current += phonemes[k]
        }
        syllables.push(current)
        current = ''
        i = j - 1
      } else {
        syllables.push(current)
        current = ''
      }
    }
  }

  if (current) {
    if (syllables.length > 0) {
      syllables[syllables.length - 1] += current
    } else {
      syllables.push(current)
    }
  }

  return syllables
}

// ---------------------------------------------------------------------------
// Manual IPA overrides for tricky words
// ---------------------------------------------------------------------------

const IPA_OVERRIDES: Record<string, { en: string; es: string }> = {
  'pachacuti': { en: 'pa.tʃa.ˈku.ti', es: 'pa.tʃa.ˈku.ti' },
  'tawantinsuyu': { en: 'ta.wan.tin.ˈsu.ju', es: 'ta.wan.tin.ˈsu.ju' },
  'cusi yupanqui': { en: 'ˈku.si ju.ˈpaŋ.ki', es: 'ˈku.si ju.ˈpaŋ.ki' },
  'qosqo': { en: 'ˈkos.ko', es: 'ˈkos.ko' },
  'sacsayhuaman': { en: 'sak.saj.wa.ˈman', es: 'sak.saj.wa.ˈman' },
  'inti raymi': { en: 'ˈin.ti ˈɾaj.mi', es: 'ˈin.ti ˈɾaj.mi' },
  'willaq umu': { en: 'wi.ˈjak ˈu.mu', es: 'wi.ˈʎak ˈu.mu' },
  'naymlap': { en: 'najm.ˈlap', es: 'najm.ˈlap' },
  'rumi': { en: 'ˈɾu.mi', es: 'ˈɾu.mi' },
  'mama ocllo': { en: 'ˈma.ma ˈo.jo', es: 'ˈma.ma ˈo.ʎo' },
  'wiracocha': { en: 'wi.ɾa.ˈko.tʃa', es: 'wi.ɾa.ˈko.tʃa' },
  'hanan pacha': { en: 'ˈha.nan ˈpa.tʃa', es: 'ˈha.nan ˈpa.tʃa' },
  'kay pacha': { en: 'ˈkaj ˈpa.tʃa', es: 'ˈkaj ˈpa.tʃa' },
  'ukhu pacha': { en: 'ˈu.khu ˈpa.tʃa', es: 'ˈu.khu ˈpa.tʃa' },
  'nawpa pacha': { en: 'ˈnaw.pa ˈpa.tʃa', es: 'ˈnaw.pa ˈpa.tʃa' },
  'qoricancha': { en: 'ko.ɾi.ˈkan.tʃa', es: 'ko.ɾi.ˈkan.tʃa' },
  'huacaypata': { en: 'wa.kaj.ˈpa.ta', es: 'wa.kaj.ˈpa.ta' },
  'pururaucas': { en: 'pu.ɾu.ˈɾaw.kas', es: 'pu.ɾu.ˈɾaw.kas' },
  'sapa inca': { en: 'ˈsa.pa ˈiŋ.ka', es: 'ˈsa.pa ˈiŋ.ka' },
  'supay': { en: 'ˈsu.paj', es: 'ˈsu.paj' },
  'pachamama': { en: 'pa.tʃa.ˈma.ma', es: 'pa.tʃa.ˈma.ma' },
  'chavin de huantar': { en: 'tʃa.ˈβin de ˈwan.taɾ', es: 'tʃa.ˈβin de ˈwan.taɾ' },
  'yahuar pampa': { en: 'ˈja.waɾ ˈpam.pa', es: 'ˈja.waɾ ˈpam.pa' },
  'uscovilca': { en: 'us.ko.ˈβil.ka', es: 'us.ko.ˈβil.ka' },
  'ancovilca': { en: 'aŋ.ko.ˈβil.ka', es: 'aŋ.ko.ˈβil.ka' },
  'asto huaraca': { en: 'ˈas.to wa.ˈɾa.ka', es: 'ˈas.to wa.ˈɾa.ka' },
  'tomay huaraca': { en: 'to.ˈmaj wa.ˈɾa.ka', es: 'to.ˈmaj wa.ˈɾa.ka' },
  'chukillanto': { en: 'tʃu.ki.ˈjan.to', es: 'tʃu.ki.ˈʎan.to' },
  'supay willka': { en: 'ˈsu.paj ˈwil.ka', es: 'ˈsu.paj ˈwil.ka' },
  'viracocha inca': { en: 'wi.ɾa.ˈko.tʃa ˈiŋ.ka', es: 'wi.ɾa.ˈko.tʃa ˈiŋ.ka' },
  'ollantay': { en: 'o.jan.ˈtaj', es: 'o.ʎan.ˈtaj' },
  'tupaq': { en: 'ˈtu.pak', es: 'ˈtu.pak' },
  'qori oqllo': { en: 'ˈko.ɾi ˈok.jo', es: 'ˈko.ɾi ˈok.ʎo' },
  'kiatari': { en: 'kja.ˈta.ɾi', es: 'kja.ˈta.ɾi' },
  'anarwarki': { en: 'a.naɾ.ˈwaɾ.ki', es: 'a.naɾ.ˈwaɾ.ki' },
  'amaru': { en: 'a.ˈma.ɾu', es: 'a.ˈma.ɾu' },
  "mama k'antu": { en: 'ˈma.ma ˈkan.tu', es: 'ˈma.ma ˈkan.tu' },
  'killa': { en: 'ˈki.ja', es: 'ˈki.ʎa' },
  'qori sisa': { en: 'ˈko.ɾi ˈsi.sa', es: 'ˈko.ɾi ˈsi.sa' },
  "sut'i": { en: 'ˈsu.ti', es: 'ˈsu.ti' },
  'koriki': { en: 'ko.ˈɾi.ki', es: 'ko.ˈɾi.ki' },
  'ania': { en: 'ˈa.nja', es: 'ˈa.nja' },
  'vinay': { en: 'bi.ˈnaj', es: 'bi.ˈnaj' },
  'inti': { en: 'ˈin.ti', es: 'ˈin.ti' },
  'apu': { en: 'ˈa.pu', es: 'ˈa.pu' },
  'ayllu': { en: 'ˈaj.ju', es: 'ˈaj.ʎu' },
  'quipu': { en: 'ˈki.pu', es: 'ˈki.pu' },
  'chicha': { en: 'ˈtʃi.tʃa', es: 'ˈtʃi.tʃa' },
  'coya': { en: 'ˈko.ja', es: 'ˈko.ja' },
  'mita': { en: 'ˈmi.ta', es: 'ˈmi.ta' },
  'ayni': { en: 'ˈaj.ni', es: 'ˈaj.ni' },
  'qhapaq nan': { en: 'ˈkha.pak ˈnan', es: 'ˈkha.pak ˈnan' },
  'mayu': { en: 'ˈma.ju', es: 'ˈma.ju' },
  'ceque': { en: 'ˈse.ke', es: 'ˈse.ke' },
  'huaca': { en: 'ˈwa.ka', es: 'ˈwa.ka' },
  'rikchariy': { en: 'ɾik.tʃa.ˈɾij', es: 'ɾik.tʃa.ˈɾij' },
  'choquequirao': { en: 'tʃo.ke.ki.ˈɾao', es: 'tʃo.ke.ki.ˈɾao' },
  'titicaca': { en: 'ti.ti.ˈka.ka', es: 'ti.ti.ˈka.ka' },
  'tiahuanaco': { en: 'tja.wa.ˈna.ko', es: 'tja.wa.ˈna.ko' },
  'hanan qosqo': { en: 'ˈha.nan ˈkos.ko', es: 'ˈha.nan ˈkos.ko' },
  'hurin qosqo': { en: 'ˈu.ɾin ˈkos.ko', es: 'ˈu.ɾin ˈkos.ko' },
  'pumachupan': { en: 'pu.ma.ˈtʃu.pan', es: 'pu.ma.ˈtʃu.pan' },
  'ausangate': { en: 'aw.saŋ.ˈɡa.te', es: 'aw.saŋ.ˈɡa.te' },
  'antisuyu': { en: 'an.ti.ˈsu.ju', es: 'an.ti.ˈsu.ju' },
  'chinchaysuyu': { en: 'tʃin.tʃaj.ˈsu.ju', es: 'tʃin.tʃaj.ˈsu.ju' },
  'qollasuyu': { en: 'ko.ʎa.ˈsu.ju', es: 'ko.ʎa.ˈsu.ju' },
  'kuntisuyu': { en: 'kun.ti.ˈsu.ju', es: 'kun.ti.ˈsu.ju' },
  'warachikuy': { en: 'wa.ɾa.ˈtʃi.kuj', es: 'wa.ɾa.ˈtʃi.kuj' },
  'mascapaycha': { en: 'mas.ka.ˈpaj.tʃa', es: 'mas.ka.ˈpaj.tʃa' },
  'kuelap': { en: 'ˈkwe.lap', es: 'ˈkwe.lap' },
  'kusipata': { en: 'ku.si.ˈpa.ta', es: 'ku.si.ˈpa.ta' },
  'waman karpa': { en: 'wa.ˈman ˈkaɾ.pa', es: 'wa.ˈman ˈkaɾ.pa' },
  'apu rimaq': { en: 'ˈa.pu ˈɾi.mak', es: 'ˈa.pu ˈɾi.mak' },
  'hanan chanka': { en: 'ˈha.nan ˈtʃaŋ.ka', es: 'ˈha.nan ˈtʃaŋ.ka' },
  'lurinchanka': { en: 'lu.ɾin.ˈtʃaŋ.ka', es: 'lu.ɾin.ˈtʃaŋ.ka' },
  'qarwarasu': { en: 'kaɾ.wa.ˈɾa.su', es: 'kaɾ.wa.ˈɾa.su' },
  'pongo de manseriche': { en: 'ˈpoŋ.ɡo de man.se.ˈɾi.tʃe', es: 'ˈpoŋ.ɡo de man.se.ˈɾi.tʃe' },
  'llapanku ayqirqanku': { en: 'ja.ˈpaŋ.ku aj.kiɾ.ˈkaŋ.ku', es: 'ʎa.ˈpaŋ.ku aj.kiɾ.ˈkaŋ.ku' },
  'ama llakikuychu, churiy': { en: 'ˈa.ma ja.ki.ˈkuj.tʃu ˈtʃu.ɾij', es: 'ˈa.ma ʎa.ki.ˈkuj.tʃu ˈtʃu.ɾij' },
  'alli kachkanchik': { en: 'ˈa.ji katʃ.ˈkaŋ.tʃik', es: 'ˈa.ʎi katʃ.ˈkaŋ.tʃik' },
  'allinllachu': { en: 'a.jin.ˈja.tʃu', es: 'a.ʎin.ˈʎa.tʃu' },
  'kunanmanta': { en: 'ku.nan.ˈman.ta', es: 'ku.nan.ˈman.ta' },
  'rikcharispa': { en: 'ɾik.tʃa.ˈɾis.pa', es: 'ɾik.tʃa.ˈɾis.pa' },
  'tinkunakusun': { en: 'tiŋ.ku.na.ˈku.sun', es: 'tiŋ.ku.na.ˈku.sun' },
  'haykuychik': { en: 'haj.ˈkuj.tʃik', es: 'haj.ˈkuj.tʃik' },
  'hatun tata': { en: 'ˈha.tun ˈta.ta', es: 'ˈha.tun ˈta.ta' },
  'huchuy kancha': { en: 'ˈhu.tʃuj ˈkan.tʃa', es: 'ˈhu.tʃuj ˈkan.tʃa' },
  'waru waru': { en: 'ˈwa.ɾu ˈwa.ɾu', es: 'ˈwa.ɾu ˈwa.ɾu' },
  'caballito de totora': { en: 'ka.ba.ˈji.to de to.ˈto.ɾa', es: 'ka.ba.ˈʎi.to de to.ˈto.ɾa' },
  "pirca-kamayuq": { en: 'ˈpiɾ.ka ka.ˈma.juk', es: 'ˈpiɾ.ka ka.ˈma.juk' },
  'quipucamayoc': { en: 'ki.pu.ka.ˈma.jok', es: 'ki.pu.ka.ˈma.jok' },
  'cumbicamayoc': { en: 'kum.bi.ka.ˈma.jok', es: 'kum.bi.ka.ˈma.jok' },

  // --- Additional glossary words (Phase 7.5 expansion) ---

  // Words with apostrophes (glottal stops -- not pronounced in Hispanicized Quechua)
  "ch'uspa":           { en: 'ˈtʃus.pa',              es: 'ˈtʃus.pa' },
  "ch'arki":           { en: 'ˈtʃaɾ.ki',              es: 'ˈtʃaɾ.ki' },
  "ch'akchay":         { en: 'ˈtʃak.tʃaj',            es: 'ˈtʃak.tʃaj' },
  "mask'ay":           { en: 'ˈmas.kaj',               es: 'ˈmas.kaj' },
  "warak'a":           { en: 'wa.ˈɾa.ka',              es: 'wa.ˈɾa.ka' },
  "llank'ay":          { en: 'ˈjaŋ.kaj',               es: 'ˈʎaŋ.kaj' },

  // Glossary words that need explicit IPA (algorithmic mapper misbehaves)
  'watia':             { en: 'ˈwa.tja',                es: 'ˈwa.tja' },
  'chicha':            { en: 'ˈtʃi.tʃa',              es: 'ˈtʃi.tʃa' },
  'wawqiy':            { en: 'ˈwaw.kij',               es: 'ˈwaw.kij' },
  'wayra':             { en: 'ˈwaj.ɾa',                es: 'ˈwaj.ɾa' },
  'huancas':           { en: 'ˈwaŋ.kas',               es: 'ˈwaŋ.kas' },
  'huanca':            { en: 'ˈwaŋ.ka',                es: 'ˈwaŋ.ka' },
  'huaco':             { en: 'ˈwa.ko',                  es: 'ˈwa.ko' },
  'ciquic':            { en: 'ˈsi.kik',                 es: 'ˈsi.kik' },
  'achiote':           { en: 'a.tʃi.ˈo.te',            es: 'a.tʃi.ˈo.te' },
  'ishanga':           { en: 'i.ˈʃaŋ.ɡa',              es: 'i.ˈʃaŋ.ɡa' },
  'barbasco':          { en: 'baɾ.ˈbas.ko',             es: 'baɾ.ˈbas.ko' },
  'maloca':            { en: 'ma.ˈlo.ka',               es: 'ma.ˈlo.ka' },
  'sachavaca':         { en: 'sa.tʃa.ˈβa.ka',           es: 'sa.tʃa.ˈβa.ka' },
  'Lanzon':            { en: 'lan.ˈson',                 es: 'lan.ˈson' },
  'lanzon':            { en: 'lan.ˈson',                 es: 'lan.ˈson' },
  'purunmachu':        { en: 'pu.ɾun.ˈma.tʃu',         es: 'pu.ɾun.ˈma.tʃu' },
  'apu rimaq':         { en: 'ˈa.pu ˈɾi.mak',          es: 'ˈa.pu ˈɾi.mak' },
  'hatun tata':        { en: 'ˈha.tun ˈta.ta',          es: 'ˈha.tun ˈta.ta' },
  'huchuy kancha':     { en: 'ˈhu.tʃuj ˈkan.tʃa',      es: 'ˈhu.tʃuj ˈkan.tʃa' },
  'qollqa':            { en: 'ˈkoʎ.ka',                 es: 'ˈkoʎ.ka' },
  'lliclla':           { en: 'ˈjitʃ.ja',                es: 'ˈʎitʃ.ʎa' },
  'llipta':            { en: 'ˈjip.ta',                 es: 'ˈʎip.ta' },
  'callhua':           { en: 'ˈkaʎ.wa',                 es: 'ˈkaʎ.wa' },
  'ucayali':           { en: 'u.ka.ˈja.li',             es: 'u.ka.ˈja.li' },
  'maranon':           { en: 'ma.ɾa.ˈɲon',             es: 'ma.ɾa.ˈɲon' },
  'utcubamba':         { en: 'ut.ku.ˈbam.ba',           es: 'ut.ku.ˈbam.ba' },
  'waman karpa':       { en: 'wa.ˈman ˈkaɾ.pa',        es: 'wa.ˈman ˈkaɾ.pa' },
  'pongo de manseriche': { en: 'ˈpoŋ.ɡo de man.se.ˈɾi.tʃe', es: 'ˈpoŋ.ɡo de man.se.ˈɾi.tʃe' },
  'quechua':           { en: 'ˈke.tʃwa',                es: 'ˈke.tʃwa' },
  'pachamanca':        { en: 'pa.tʃa.ˈmaŋ.ka',         es: 'pa.tʃa.ˈmaŋ.ka' },
  'masato':            { en: 'ma.ˈsa.to',               es: 'ma.ˈsa.to' },
  'totora':            { en: 'to.ˈto.ɾa',               es: 'to.ˈto.ɾa' },
  'vicuna':            { en: 'bi.ˈku.ɲa',               es: 'bi.ˈku.ɲa' },
  'ushuta':            { en: 'u.ˈʃu.ta',                es: 'u.ˈʃu.ta' },
  'suruchiku':         { en: 'su.ɾu.ˈtʃi.ku',          es: 'su.ɾu.ˈtʃi.ku' },

  // --- Bug fixes: diphthong handling, v mapping, h restoration ---
  'amauta':            { en: 'a.ˈmaw.ta',               es: 'a.ˈmaw.ta' },           // Fix: au is diphthong, not separate syllables
  'chavin':            { en: 'tʃa.ˈβin',                es: 'tʃa.ˈβin' },            // Fix: v→β, final stress (Spanish loanword)
  'auqui':             { en: 'ˈaw.ki',                  es: 'ˈaw.ki' },              // Fix: au is diphthong, penultimate stress
  'aqha':              { en: 'ˈak.ha',                  es: 'ˈak.ha' },              // Fix: h after uvular is aspiration, not silent
  'hampiq':            { en: 'ham.ˈpik',                es: 'ham.ˈpik' },            // Fix: h is real phoneme, not silent
  'hatun':             { en: 'ˈha.tun',                 es: 'ˈha.tun' },             // Fix: h is real phoneme
  'hurin qosqo':       { en: 'ˈhu.ɾin ˈkos.ko',        es: 'ˈhu.ɾin ˈkos.ko' },    // Fix: h is real phoneme
}

/**
 * Get IPA for a word, preferring manual override, falling back to algorithmic.
 */
function getIPA(word: string, lang: 'en' | 'es' = 'es'): string {
  const key = word.toLowerCase().replace(/['''\u2018\u2019]/g, "'")
  if (IPA_OVERRIDES[key]) {
    return IPA_OVERRIDES[key][lang]
  }
  return toIPA(word, lang)
}

// ---------------------------------------------------------------------------
// Source Scanners
// ---------------------------------------------------------------------------

/**
 * Extract Quechua words from PACHACUTI-BIBLE.md
 */
function scanBible(): Map<string, Set<string>> {
  const words = new Map<string, Set<string>>()
  if (!existsSync(BIBLE_PATH)) {
    console.warn('  [WARN] Bible not found at', BIBLE_PATH)
    return words
  }

  const content = readFileSync(BIBLE_PATH, 'utf-8')

  // Extract bold names: **NAME** (short, 1-3 words only)
  const boldNames = content.matchAll(/\*\*([A-Z][A-Za-z\s']{1,30}?)\*\*/g)
  for (const m of boldNames) {
    const name = m[1].trim()
    // Only accept 1-3 word names, skip long phrases
    if (name.split(/\s+/).length <= 3 && isQuechuaWord(name)) {
      addWord(words, name, 'bible')
    }
  }

  // Extract character names from headings like: ### CUSI YUPANQUI -- The Champion
  const headings = content.matchAll(/^#{1,4}\s+(.+)$/gm)
  for (const m of headings) {
    // Take only the first part before em-dash or long description
    const parts = m[1].split(/\s*[—–]\s*/)
    const firstPart = parts[0].trim().replace(/[*#]/g, '')
    // Only short names (1-3 words), not section titles like "ACT 5: ..."
    if (firstPart.split(/\s+/).length <= 3 && !firstPart.includes(':') && isQuechuaWord(firstPart)) {
      addWord(words, firstPart, 'bible')
    }
  }

  // Known Quechua terms that appear in the bible text
  const knownTerms = [
    'Pachacuti', 'Tawantinsuyu', 'Cusi Yupanqui', 'Qosqo', 'Sacsayhuaman',
    'Inti Raymi', 'Willaq Umu', 'Naymlap', 'Rumi', 'Mama Ocllo',
    'Pururaucas', 'Wiracocha', 'Supay', 'Urqu', 'Uscovilca', 'Ancovilca',
    'Asto Huaraca', 'Tomay Huaraca', 'Chukillanto', 'Supay Willka',
    'Viracocha Inca', 'Qoricancha', 'Huacaypata', 'Sapa Inca',
    'Hanan Pacha', 'Kay Pacha', 'Ukhu Pacha', 'Nawpa Pacha',
    'Pachamama', 'Inti', 'Apu', 'Yahuar Pampa', 'Kuelap',
    'Choquequirao', 'Machu Picchu', 'Titicaca', 'Tiahuanaco',
    'Ollantay', 'Tupaq', 'Rimaq', 'Ayar', 'Vinay',
    'Qori Oqllo', 'Kiatari', 'Koriki', 'Ania', 'Intiqa',
    'Auqui', 'Kullac', 'Gatel', 'Chavin de Huantar',
    'Huayna Picchu', 'Chincheros', 'Sipan', 'Paracas', 'Nazca',
    'Moche', 'Lambayeque', 'Chachapoyas', 'Utcubamba',
    'Pongo de Manseriche', 'gayado', 'chiuku', 'cumbi', 'abasca',
    'quipu', 'ceque', 'ayllu', 'mita', 'ayni', 'unku',
    'Qhapaq Nan', 'tambo', 'chasqui', 'mascapaycha',
    'Warachikuy', 'coca', 'ayahuasca', 'wachuma',
    'Manco Capac', 'huaca', 'pachamanca', 'makana',
    'chicha', 'barbasco', 'ishanga', 'maloca', 'sachavaca',
    'masato', 'Ucayali', 'Maranon', 'Utcubamba', 'vicuna',
    "Sut'i", "ch'uspa", "warak'a", "ch'arki", "ch'akchay",
    "mask'ay", "llank'ay", 'Lanzon', 'suruchiku', 'ushuta',
  ]

  for (const term of knownTerms) {
    if (content.includes(term)) {
      addWord(words, term, 'bible')
    }
  }

  return words
}

/**
 * Extract words from glossary.ts
 */
function scanGlossary(): Map<string, Set<string>> {
  const words = new Map<string, Set<string>>()
  if (!existsSync(GLOSSARY_PATH)) {
    console.warn('  [WARN] Glossary not found at', GLOSSARY_PATH)
    return words
  }

  const content = readFileSync(GLOSSARY_PATH, 'utf-8')

  // Extract word fields
  const wordMatches = content.matchAll(/word:\s*"([^"]+)"/g)
  for (const m of wordMatches) {
    addWord(words, m[1], 'glossary')
  }

  return words
}

/**
 * Extract words from characters.ts
 */
function scanCharacters(): Map<string, Set<string>> {
  const words = new Map<string, Set<string>>()
  if (!existsSync(CHARACTERS_PATH)) {
    console.warn('  [WARN] Characters not found at', CHARACTERS_PATH)
    return words
  }

  const content = readFileSync(CHARACTERS_PATH, 'utf-8')

  // Extract name fields
  const nameMatches = content.matchAll(/name:\s*"([^"]+)"/g)
  for (const m of nameMatches) {
    addWord(words, m[1], 'characters')
  }

  // Extract faction Quechua words
  const factionMatches = content.matchAll(/faction:\s*"([^"]+)"/g)
  for (const m of factionMatches) {
    const parts = m[1].split(/\s*[\/—–-]\s*/)
    for (const part of parts) {
      const trimmed = part.trim()
      if (isQuechuaWord(trimmed)) {
        addWord(words, trimmed, 'characters')
      }
    }
  }

  // Extract title Quechua words
  const titleMatches = content.matchAll(/title:\s*"([^"]+)"/g)
  for (const m of titleMatches) {
    const title = m[1].trim()
    if (isQuechuaWord(title)) {
      addWord(words, title, 'characters')
    }
  }

  // Extract quechuaMeaning names
  const meaningMatches = content.matchAll(/quechuaMeaning:\s*"([^"]+)"/g)
  for (const m of meaningMatches) {
    // Extract the word before = sign
    const eqMatch = m[1].match(/^(\w[\w'\s]*?)\s*[=:]/)
    if (eqMatch && isQuechuaWord(eqMatch[1])) {
      addWord(words, eqMatch[1].trim(), 'characters')
    }
  }

  return words
}

/**
 * Extract Quechua words from chapter titles in chapters.ts
 */
function scanChapterTitles(): Map<string, Set<string>> {
  const words = new Map<string, Set<string>>()
  if (!existsSync(CHAPTERS_PATH)) {
    console.warn('  [WARN] Chapters not found at', CHAPTERS_PATH)
    return words
  }

  const content = readFileSync(CHAPTERS_PATH, 'utf-8')

  // Extract title fields
  const titleMatches = content.matchAll(/title(?:En)?:\s*"([^"]+)"/g)
  for (const m of titleMatches) {
    const titleWords = m[1].split(/[\s,—–-]+/)
    for (const w of titleWords) {
      const cleaned = w.replace(/[^a-zA-Z']/g, '')
      if (cleaned && isQuechuaWord(cleaned)) {
        addWord(words, cleaned, 'chapters')
      }
    }
  }

  return words
}

/**
 * Scan chapter markdown files for Quechua words not captured elsewhere.
 * Only picks up words already in glossary/characters/bible OR italicized in text.
 */
function scanChapterMarkdown(knownWords: Set<string>): Map<string, Set<string>> {
  const words = new Map<string, Set<string>>()

  const scanDir = (dir: string) => {
    if (!existsSync(dir)) return
    const files = readdirSync(dir).filter(f => f.endsWith('.md'))
    for (const file of files) {
      // Only process ch00-ch19 (skip ch20-23 placeholders)
      const chMatch = file.match(/^(\d{2})/)
      if (chMatch) {
        const chNum = parseInt(chMatch[1])
        if (chNum > 19) continue
      }

      const filepath = join(dir, file)
      const content = readFileSync(filepath, 'utf-8')

      // Skip very short placeholder files
      if (content.length < 500) continue

      // Only pick up words that are ALREADY known from other sources
      // This ensures chapter scanning adds "chapters" as a source without false positives
      const tokenMatches = content.matchAll(/\b([A-Za-z']{3,})\b/g)
      for (const m of tokenMatches) {
        const w = m[1]
        if (knownWords.has(w.toLowerCase())) {
          addWord(words, w, 'chapters')
        }
      }

      // Find italicized Quechua words (often marked with *word* in chapter text)
      // Only pick up if already known or strongly matches Quechua patterns
      const italicMatches = content.matchAll(/(?<!\*)\*([A-Za-z']{2,30}?)\*(?!\*)/g)
      for (const m of italicMatches) {
        const phrase = m[1].trim()
        if (phrase.split(/\s+/).length === 1 && !isCommonSpanishOrEnglish(phrase)) {
          if (knownWords.has(phrase.toLowerCase()) || isStrictQuechua(phrase)) {
            addWord(words, phrase, 'chapters')
          }
        }
      }
    }
  }

  scanDir(CHAPTERS_ES_DIR)
  scanDir(CHAPTERS_EN_DIR)

  return words
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strict Quechua word detection -- for italics in chapter text only */
function isStrictQuechua(word: string): boolean {
  const w = word.toLowerCase()
  // Must have at least one strongly Quechua pattern
  const strongPatterns = [
    /qu[aeiou]/i, /hua/i, /yll/i, /cch/i, /nku/i,
    /^q[aeiou]/i, /^k[aeiou]/i, /^w[aeiou]/i,
    /suyu/i, /pach/i, /auca/i, /llaq/i, /nch[aeiou]/i,
  ]
  return strongPatterns.some(p => p.test(w)) && w.length >= 4
}

/** Quechua word detection heuristic */
function isQuechuaWord(word: string): boolean {
  const w = word.toLowerCase().trim()
  if (w.length < 2) return false

  // Check for Quechua-characteristic patterns
  const quechuaPatterns = [
    /qu[aeiou]/i,    // qu + vowel
    /hua/i,          // hua
    /chu/i,          // chu
    /yll/i,          // yll
    /cch/i,          // cch
    /llk/i,          // llk
    /nku/i,          // nku
    /yqu/i,          // yqu
    /ñ/i,            // ñ
    /qo/i,           // qo (Qosqo)
    /aym/i,          // aym
    /pach/i,         // pach
    /suyu/i,         // suyu
    /auca/i,         // auca
    /inqa/i,         // inqa
    /anq/i,          // anq
    /nch/i,          // nch
    /waw/i,          // waw
    /llaq/i,         // llaq
    /rik/i,          // rik
    /^k[aeiou]/i,    // starts with k + vowel
    /^q[aeiou]/i,    // starts with q + vowel
    /^w[aeiou]/i,    // starts with w + vowel
  ]

  // Check against known character/place names (case-insensitive)
  const knownNames = new Set([
    'cusi', 'rumi', 'naymlap', 'ollantay', 'tupaq', 'vinay', 'koriki',
    'ania', 'kiatari', 'anarwarki', 'amaru', 'killa', 'urqu', 'supay',
    'inti', 'uscovilca', 'ancovilca', 'chukillanto', 'pachamama',
    'tawantinsuyu', 'pachacuti', 'qosqo', 'cusco', 'sipan', 'paracas',
    'nazca', 'moche', 'chavin', 'kuelap', 'titicaca', 'tiahuanaco',
    'sacsayhuaman', 'qoricancha', 'huacaypata', 'choquequirao',
    'pururaucas', 'wiracocha', 'mayu', 'willka', 'ayllu', 'mita',
    'ayni', 'aqha', 'coca', 'sara', 'papa', 'cuy', 'ichu', 'tambo',
    'quipu', 'cumbi', 'unku', 'pirca', 'cancha', 'huanca', 'chiuku',
    'ceque', 'huaca', 'pututo', 'quena', 'tinya', 'siku', 'taki',
    'tocapu', 'gayado', 'makana', 'tumi', 'mullu', 'llama', 'alpaka',
    'masato', 'ishanga', 'barbasco', 'maloca', 'sachavaca', 'totora',
    'charqui', 'chunu', 'chunhu', 'watia', 'pachamanca', 'mote',
    'molle', 'achiote', 'tumbo', 'jora', 'llipta', 'apichu',
    'callhua', 'awana', 'pallay', 'kene', 'chaquira',
    'pukllay', 'tinkuy', 'tinku', 'wankara', 'usnu', 'cantuta',
    'quero', 'qollqa', 'lliclla', 'muna', 'hampiq', 'minka',
    'suruchiku', 'vicuna', 'ushuta', 'puna', 'chaki', 'chaka',
    'saywa', 'api', 'tuku', 'uywa', 'topo', 'sonqo', 'munay',
    'yachay', 'kallpa', 'rikra', 'ayahuasca', 'wachuma',
    'lanzon', 'purunmachu', 'quechua', 'chasqui', 'amauta',
    'yanakuna', 'panaca', 'kuraka', 'acllas', 'kamaq', 'pacariq',
    'willaq', 'umu', 'runa', 'runakuna', 'coya', 'hatun',
    'andenes', 'saphy', 'tullumayo', 'punchao', 'tupu', 'maskay',
    'warak', 'huaco', 'chicha', 'barbasco', 'ishanga', 'maloca',
    'sachavaca', 'masato', 'ucayali', 'maranon', 'utcubamba',
    'ciquic', 'lanzon',
  ])

  if (knownNames.has(w) || knownNames.has(w.replace(/s$/, ''))) {
    return true
  }

  // Check against patterns
  for (const pat of quechuaPatterns) {
    if (pat.test(w)) return true
  }

  // Words ending in typical Quechua suffixes
  if (/(?:kuy|nku|sqa|chik|yman|llaq|riy|nay|yoq|yoc|mayoc)$/i.test(w)) {
    return true
  }

  return false
}

/** Filter out common Spanish/English words that might match Quechua heuristics */
function isCommonSpanishOrEnglish(word: string): boolean {
  const common = new Set([
    'the', 'and', 'for', 'that', 'with', 'this', 'from', 'which', 'have',
    'not', 'but', 'all', 'can', 'her', 'was', 'one', 'our', 'out',
    'are', 'were', 'been', 'has', 'had', 'who', 'will', 'each', 'she',
    'how', 'their', 'than', 'them', 'then', 'what', 'when', 'where',
    'its', 'also', 'back', 'after', 'much', 'other', 'into', 'just',
    'those', 'only', 'come', 'over', 'such', 'take', 'long', 'make',
    'del', 'las', 'los', 'que', 'por', 'con', 'una', 'como', 'mas',
    'pero', 'para', 'hay', 'fue', 'ser', 'sin', 'sus', 'entre', 'este',
    'todo', 'esta', 'son', 'dos', 'ese', 'era', 'tan', 'bien', 'muy',
    'cada', 'donde', 'cuando', 'quien', 'algo', 'nadie', 'nada',
    'aqui', 'alla', 'hoy', 'hombre', 'mujer', 'noche', 'dia',
    'ciudad', 'guerra', 'mundo', 'pueblo', 'piedra', 'sangre',
    'nombre', 'tiempo', 'lugar', 'historia', 'parte', 'forma',
    'primer', 'nuevo', 'grande', 'mejor', 'mismo', 'otro',
    'chapter', 'section', 'note', 'which', 'about', 'more',
    'them', 'through', 'before', 'because', 'under',
    // words that trigger heuristics but aren't Quechua:
    'church', 'much', 'such', 'touch', 'reach', 'teach',
    'machine', 'technique', 'unique', 'antique', 'rique',
    'quality', 'quantity', 'quarter', 'queen', 'quest', 'question',
    'quick', 'quite', 'quote', 'require', 'acquire',
    'architecture', 'consequence', 'frequency', 'sequence',
    'marcha', 'lucha', 'noche', 'leche', 'derecho', 'hecho',
    'dicho', 'ocho', 'mucho', 'muchos', 'anchos', 'escuchar',
    'quiere', 'quiero', 'quince', 'quinientos',
    // English words with w-/qu-/k- starts or ch/hua patterns
    'wait', 'wakes', 'walked', 'walking', 'wanted', 'wants', 'warm',
    'watch', 'weapon', 'weight', 'welcome', 'within', 'woodpecker', 'world',
    'kindled', 'kingdom', 'king', 'knight', 'know', 'knew',
    'equal', 'fate', 'friend', 'bigger', 'builds', 'built',
    'india', 'integration', 'liquefied', 'preparation',
    'antiquity', 'ancient', 'sacred', 'between', 'enemies',
    'pattern', 'patterns',
    // Spanish words that pass heuristics
    'arquitectura', 'nombra', 'porque', 'queria', 'quieta',
    'quimico', 'quisieron', 'reino', 'pequenos', 'pequeno',
    'quinoa', 'quinua', 'quemaba',
  ])
  return common.has(word.toLowerCase())
}

function addWord(map: Map<string, Set<string>>, word: string, source: string): void {
  // Normalize: trim, title case for consistency
  const normalized = normalizeWord(word)
  if (!normalized || normalized.length < 2) return

  if (!map.has(normalized)) {
    map.set(normalized, new Set())
  }
  map.get(normalized)!.add(source)
}

function normalizeWord(word: string): string {
  return word
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\\u2019|\\u2018/g, "'") // handle literal escaped Unicode (e.g. from source files)
    .replace(/['''\u2018\u2019]/g, "'") // normalize all apostrophe variants to ASCII
    // Remove ALL CAPS -- convert to title case
    .replace(/^[A-Z][A-Z\s']+$/, (s) =>
      s.split(' ').map(w =>
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join(' ')
    )
}

// ---------------------------------------------------------------------------
// PLS XML Generator
// ---------------------------------------------------------------------------

/**
 * Filter out junk entries that are clearly English phrases or descriptions,
 * not Quechua words. These leak in from chapter descriptions in the Bible.
 */
function filterJunkEntries(entries: QuechuaWord[]): QuechuaWord[] {
  // Common English words that should NEVER appear in a Quechua lexicon entry
  const englishIndicators = new Set([
    'the', 'of', 'and', 'a', 'to', 'in', 'is', 'it', 'that', 'was',
    'for', 'on', 'are', 'with', 'as', 'at', 'be', 'this', 'from',
    'or', 'an', 'by', 'not', 'but', 'what', 'all', 'were', 'when',
    'we', 'there', 'can', 'been', 'has', 'more', 'who', 'will',
    'no', 'if', 'out', 'so', 'up', 'about', 'than', 'into',
    'builds', 'constructs', 'bigger', 'hawks', 'preparation',
    'warriors', 'warrior', 'water', 'friend', 'india', 'fate',
    'sacred', 'ancient', 'golden', 'hidden', 'keeper', 'dreams',
    'stone', 'fire', 'death', 'end', 'news', 'threads', 'awaken',
    'sleeps', 'bones', 'bone', 'bridge', 'between', 'enemies',
    'children', 'jungle', 'cave', 'caves', 'knife', 'city',
    'clouds', 'machine', 'brothers', 'temple',
    "'s",  // possessives
  ])

  return entries.filter(entry => {
    const w = entry.word.toLowerCase()
    const normalizedKey = w.replace(/['''\u2018\u2019]/g, "'")

    // Always keep entries that have a manual IPA override (trusted)
    if (IPA_OVERRIDES[normalizedKey]) return true

    // Reject entries longer than 25 chars (likely descriptions, not words)
    if (w.length > 25) return false

    // Reject entries with more than 3 words (Quechua phrases are short)
    const wordCount = w.split(/\s+/).length
    if (wordCount > 3) return false

    // Check if any word in the entry is a clear English indicator
    const words = w.split(/\s+/)
    for (const part of words) {
      const cleaned = part.replace(/['''\u2018\u2019]/g, '').toLowerCase()
      if (englishIndicators.has(cleaned)) return false
    }

    // Reject entries containing possessives ('s)
    if (w.includes("'s")) return false

    // Reject entries where majority of words fail isQuechuaWord and are >1 word
    if (wordCount >= 2) {
      const quechuaCount = words.filter(part => {
        const cleaned = part.replace(/[^a-zA-Z']/g, '')
        return cleaned.length >= 2 && (isQuechuaWord(cleaned) || IPA_OVERRIDES[cleaned])
      }).length
      // If less than half the words are Quechua, reject
      if (quechuaCount < Math.ceil(wordCount / 2)) return false
    }

    return true
  })
}

function generatePLS(entries: QuechuaWord[], lang: 'en' | 'es'): string {
  const xmlLang = lang === 'en' ? 'en-US' : 'es-ES'
  const date = new Date().toISOString().split('T')[0]

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<!-- Quechua Pronunciation Lexicon for ${xmlLang} -->\n`
  xml += `<!-- Generated: ${date} | Words: ${entries.length} -->\n`
  xml += `<!-- Source: Pachacuti audiobook (PACHACUTI-BIBLE.md, glossary.ts, characters.ts, chapters) -->\n`
  xml += `<lexicon version="1.0"\n`
  xml += `    xmlns="http://www.w3.org/2005/01/pronunciation-lexicon"\n`
  xml += `    alphabet="ipa" xml:lang="${xmlLang}">\n`

  for (const entry of entries) {
    const ipa = getIPA(entry.word, lang)
    const grapheme = escapeXml(entry.word)

    xml += `  <lexeme>\n`
    xml += `    <grapheme>${grapheme}</grapheme>\n`
    xml += `    <phoneme>${ipa}</phoneme>\n`
    xml += `  </lexeme>\n`

    // Add lowercase variant if the word starts with uppercase
    if (entry.word[0] !== entry.word[0].toLowerCase()) {
      const lower = entry.word.toLowerCase()
      xml += `  <lexeme>\n`
      xml += `    <grapheme>${escapeXml(lower)}</grapheme>\n`
      xml += `    <phoneme>${ipa}</phoneme>\n`
      xml += `  </lexeme>\n`
    }
  }

  xml += `</lexicon>\n`
  return xml
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log('=== Quechua Pronunciation Dictionary Builder ===\n')

  // Phase 1: Scan all sources
  console.log('Scanning sources...')

  console.log('  [1/5] PACHACUTI-BIBLE.md')
  const bibleWords = scanBible()
  console.log(`        Found ${bibleWords.size} words`)

  console.log('  [2/5] glossary.ts')
  const glossaryWords = scanGlossary()
  console.log(`        Found ${glossaryWords.size} words`)

  console.log('  [3/5] characters.ts')
  const characterWords = scanCharacters()
  console.log(`        Found ${characterWords.size} words`)

  console.log('  [4/5] chapters.ts')
  const chapterTitleWords = scanChapterTitles()
  console.log(`        Found ${chapterTitleWords.size} words`)

  console.log('  [5/5] Chapter markdown files (ch00-19)')
  // Build set of known Quechua words for chapter scanning
  // Only add words that are genuinely Quechua (from glossary/bible/characters/chapter titles)
  const allKnownWords = new Set<string>()
  for (const source of [bibleWords, glossaryWords, characterWords, chapterTitleWords]) {
    for (const [word] of source) {
      allKnownWords.add(word.toLowerCase())
      // Also add individual words from multi-word entries, but only if they're Quechua
      for (const part of word.toLowerCase().split(/\s+/)) {
        if (part.length >= 3 && !isCommonSpanishOrEnglish(part)) {
          allKnownWords.add(part)
        }
      }
    }
  }
  // Remove Spanish/English words that leaked in through character fields
  const spanishLeaks = [
    'aclara', 'sombra', 'guardian', 'heredera', 'fundador', 'muro',
    'silencioso', 'curioso', 'pintora', 'cosmos', 'eterno', 'flor',
    'oro', 'hierro', 'piedra', 'fuego', 'agua', 'sol', 'luna',
    'mujer', 'hombre', 'rey', 'reina', 'guerra', 'muerte',
    'puerta', 'templo', 'trono', 'camino', 'selva', 'costa',
    'nube', 'nubes', 'mano', 'voz', 'hueso', 'sangre',
    'the', 'stone', 'dreams', 'keeper', 'door', 'iron', 'queen',
    'prince', 'hidden', 'warrior', 'silent', 'golden', 'tree',
    'wise', 'king', 'shadow', 'throne', 'road', 'coast',
    'fire', 'cave', 'caves', 'knife', 'children', 'jungle',
    'warriors', 'warrior', 'clouds', 'machine', 'brothers', 'city', 'news',
    'temple', 'water', 'death', 'end', 'puma', 'threads',
    'awaken', 'sleeps', 'bone', 'bones', 'sacred', 'ancient',
    'bridge', 'between', 'enemies', 'pattern', 'patterns',
  ]
  for (const leak of spanishLeaks) {
    allKnownWords.delete(leak)
  }
  const chapterWords = scanChapterMarkdown(allKnownWords)
  console.log(`        Found ${chapterWords.size} words`)

  // Phase 2: Merge and deduplicate
  console.log('\nMerging and deduplicating...')
  const merged = new Map<string, Set<string>>()

  for (const source of [bibleWords, glossaryWords, characterWords, chapterTitleWords, chapterWords]) {
    for (const [word, sources] of source) {
      const key = word.toLowerCase()
      // Keep the best-cased version (prefer title case)
      if (!merged.has(key)) {
        merged.set(key, new Set())
      }
      for (const s of sources) {
        merged.get(key)!.add(s)
      }
    }
  }

  // Build final entries with best-cased words
  const bestCase = new Map<string, string>()
  for (const source of [bibleWords, glossaryWords, characterWords, chapterTitleWords, chapterWords]) {
    for (const [word] of source) {
      const key = word.toLowerCase()
      const existing = bestCase.get(key)
      // Prefer title case (starts with uppercase)
      if (!existing || (word[0] === word[0].toUpperCase() && existing[0] !== existing[0].toUpperCase())) {
        bestCase.set(key, word)
      }
    }
  }

  const entries: QuechuaWord[] = []
  for (const [key, sources] of merged) {
    const word = bestCase.get(key) || key
    entries.push({
      word,
      sources: Array.from(sources).sort(),
      suggestedIPA: getIPA(word, 'es'),
    })
  }

  // Sort alphabetically
  entries.sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()))

  console.log(`\nTotal unique words: ${entries.length}`)

  // Phase 3: Verify required words exist
  const requiredWords = [
    'Pachacuti', 'Tawantinsuyu', 'Cusi Yupanqui', 'Qosqo', 'Sacsayhuaman',
    'Inti Raymi', 'Willaq Umu', 'Naymlap', 'Rumi', 'Mama Ocllo',
  ]
  const missingRequired: string[] = []
  for (const req of requiredWords) {
    if (!merged.has(req.toLowerCase())) {
      missingRequired.push(req)
    }
  }
  if (missingRequired.length > 0) {
    console.warn(`\n[WARN] Missing required words: ${missingRequired.join(', ')}`)
  } else {
    console.log('\nAll 10 required words present.')
  }

  // Show source distribution
  const sourceCounts: Record<string, number> = {}
  for (const entry of entries) {
    for (const s of entry.sources) {
      sourceCounts[s] = (sourceCounts[s] || 0) + 1
    }
  }
  console.log('\nSource distribution:')
  for (const [source, count] of Object.entries(sourceCounts).sort()) {
    console.log(`  ${source}: ${count} words`)
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would write', entries.length, 'entries to', OUTPUT_JSON)
    if (GENERATE_PLS) {
      console.log('[DRY RUN] Would generate PLS XML files')
    }
    console.log('\nSample entries:')
    for (const entry of entries.slice(0, 10)) {
      console.log(`  ${entry.word} -> ${entry.suggestedIPA} (${entry.sources.join(', ')})`)
    }
    return
  }

  // Phase 4: Write JSON
  writeFileSync(OUTPUT_JSON, JSON.stringify(entries, null, 2), 'utf-8')
  console.log(`\nWrote ${entries.length} entries to ${OUTPUT_JSON}`)

  // Phase 5: Generate PLS XML if requested
  if (GENERATE_PLS) {
    console.log('\nGenerating PLS XML files...')

    if (!existsSync(OUTPUT_PLS_DIR)) {
      mkdirSync(OUTPUT_PLS_DIR, { recursive: true })
    }

    // Filter out junk English entries before generating PLS
    const cleanEntries = filterJunkEntries(entries)
    const removed = entries.length - cleanEntries.length
    if (removed > 0) {
      console.log(`  Filtered out ${removed} junk/English entries`)
    }

    const plsEn = generatePLS(cleanEntries, 'en')
    const plsEs = generatePLS(cleanEntries, 'es')

    writeFileSync(OUTPUT_PLS_EN, plsEn, 'utf-8')
    writeFileSync(OUTPUT_PLS_ES, plsEs, 'utf-8')

    const enSize = Buffer.byteLength(plsEn)
    const esSize = Buffer.byteLength(plsEs)

    console.log(`  en-US: ${OUTPUT_PLS_EN} (${(enSize / 1024).toFixed(1)} KB)`)
    console.log(`  es-ES: ${OUTPUT_PLS_ES} (${(esSize / 1024).toFixed(1)} KB)`)

    if (enSize > 102400 || esSize > 102400) {
      console.warn('\n[WARN] PLS file exceeds 100KB Azure limit!')
    } else {
      console.log('  Both files under 100KB limit.')
    }

    // Count lexeme elements
    const enLexemes = (plsEn.match(/<lexeme>/g) || []).length
    const esLexemes = (plsEs.match(/<lexeme>/g) || []).length
    console.log(`  en-US lexemes: ${enLexemes}`)
    console.log(`  es-ES lexemes: ${esLexemes}`)
  }

  console.log('\nDone.')
}

main()
