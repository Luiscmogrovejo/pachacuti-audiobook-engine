/**
 * Character Identity Blocks -- prepended to scene prompts for visual consistency.
 *
 * Diffusion models drift: the same character comes back with different clothing,
 * a different face, a different silhouette. The fix used here is a locked
 * identity block per character, emitted verbatim at the head of every prompt
 * that features them, so build/skin/hair/face/clothing/accessories are restated
 * on every single generation instead of being inferred.
 *
 * Multi-character scenes concatenate the blocks with an explicit separator (see
 * buildCharacterIdentityPrefix) rather than describing the group, which keeps
 * each subject's attributes attached to that subject.
 *
 * PUBLIC SAMPLE: 2 identity blocks are included to show the register and the
 * level of detail that actually holds a character stable. The full bank is
 * private.
 */

export interface CharacterIdentity {
  /** Character slug matching characterRefs in scene prompts */
  slug: string
  /** Full identity block text to prepend to scene prompts */
  identity: string
  /** Optional clothing block (some characters have separate clothing descriptions) */
  clothing?: string
}

/**
 * Map of character slug -> identity prompt text.
 * Used by generate-scenes.ts to build character-consistent scene prompts.
 */
export const CHARACTER_IDENTITIES: Record<string, CharacterIdentity> = {
  cusi: {
    slug: 'cusi',
    identity: `Cusi Yupanqui, 21-year-old MALE Inca prince and hidden heir. MALE with STRONG ANGULAR JAW and masculine features, broad shoulders tapering to lean athletic waist. Copper-bronze skin weathered by Andean sun, warm tone from mixed Sipan-Highland heritage with a slightly broader nose. Straight black hair past shoulders tied back warrior-style with a simple cotton band, masculine hairline. Athletic lean muscular build from years of gayado ball-game training, like a soccer midfielder, defined forearms and strong hands. Gold ear spools marking Inca royalty visible at both ears. Wearing a plain brown unku tunic in earth tones with minimal tocapu geometric border at the hem, deliberately humble clothing for a prince content to remain invisible. Leather belt with a distinctive tumi ceremonial knife always visible at the belt. Determined dark brown eyes that read situations with natural intelligence, looking slightly upward with quiet confidence. Expression: brave, curious, confident but humble, the natural leader who inspires without trying, stubborn masculine jaw set with determination.`,
  },

  rumi: {
    slug: 'rumi',
    identity: `Rumi, ageless massive humanoid STONE being in humanoid form. Towering imposing build, taller and broader than any man, with the proportions of a giant. Body made of actual grey granite with white quartz veins running visibly across temples, along jaw, over knuckles and forearms, like rivers of petrified mineral embedded in living rock. Actual geological mineral texture on all exposed skin: rough granite grain, crystalline quartz striations, stone dust clinging to surface permanently. Deep-set obsidian-black eyes that hold millennia of memory, expressive and emotional despite the stone face. Prominent heavy stone-textured brow ridge creating deep shadows over the eyes. Smooth unbroken granite across the entire lower face, continuous stone surface below the nose with only geological texture visible, mouthless stone face. Wild uncombed black hair shot through with grey-white streaks like quartz veins running through basalt. Wearing a deliberately plain rough-woven abasca tunic draped over the stone body, coarse fabric contrasting with the smooth mineral surface. Expression of ancient weariness conveyed entirely through those deep obsidian eyes and the heavy stone brow.`,
  },
}

/**
 * Get the full identity prompt text for a character, combining identity + clothing blocks.
 * @param slug Character slug (e.g., 'cusi', 'rumi', 'uscovilca')
 * @returns Full identity text or empty string if character not found
 */
export function getCharacterIdentityPrompt(slug: string): string {
  const char = CHARACTER_IDENTITIES[slug]
  if (!char) return ''
  if (char.clothing) {
    return `${char.identity} ${char.clothing}`
  }
  return char.identity
}

/**
 * Build a combined identity prefix for one or more characters.
 * For single characters: just the identity block.
 * For multiple characters: concatenated with "Also in the scene:" separator.
 * @param slugs Array of character slugs
 * @returns Combined identity prompt text
 */
export function buildCharacterIdentityPrefix(slugs: string[]): string {
  if (slugs.length === 0) return ''

  const blocks: string[] = []
  for (const slug of slugs) {
    const text = getCharacterIdentityPrompt(slug)
    if (text) {
      blocks.push(text)
    } else {
      console.warn(`  WARNING: No identity block found for character "${slug}"`)
    }
  }

  if (blocks.length === 0) return ''
  if (blocks.length === 1) return blocks[0]

  // For multi-character scenes, join with clear separator
  return blocks.join('\n\nAlso in the scene: ')
}
