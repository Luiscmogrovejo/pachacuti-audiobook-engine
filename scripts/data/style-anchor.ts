/**
 * Style Anchor -- appended to EVERY generation prompt for visual consistency
 *
 * This is the EXACT style that produced the approved character portraits.
 * Verified working with Flux 2 Pro at 1536x2048.
 * DO NOT change without regenerating test images.
 */

export const STYLE_ANCHOR = `Dramatic fantasy illustration in the style of official Dungeons and Dragons 5th Edition artwork (Player's Handbook, Monster Manual). Oil-painting realism with visible brushwork and rich texture. Strong directional lighting with deep chiaroscuro shadows. Warm earthy color palette: burnt sienna, raw umber, deep crimson, hammered gold, forest green, with strategic pops of saturated magical color. Material realism: stone has weight and moss, metal has patina, textiles have visible weave patterns. Atmospheric depth with hazy distant mountains. Pre-Columbian Inca Tawantinsuyu aesthetic: cyclopean polygonal stone walls fitted without mortar, hammered gold sheet accents, ichu grass thatch roofs, trapezoidal doorways, tocapu geometric textile patterns, quilted cotton armor, champi war clubs. 1438 Cusco. Painterly, dramatic, detailed.`

/**
 * Warm palette block -- used in every prompt to prevent cool/blue drift
 */
export const WARM_PALETTE = `WARM COLOR PALETTE: Dominant golden amber, burnt orange, deep crimson, hammered gold highlights. Copper and gold tones on skin and metal. Rich warm shadows in umber and sienna, NOT cool blues or grays. The overall feeling should be WARM, GOLDEN, CEREMONIAL.`

/**
 * Shorter style suffix for Kontext Pro prompts.
 */
export const KONTEXT_STYLE_SUFFIX = `Oil-painting realism, D&D 5th Edition quality, dramatic chiaroscuro, warm earth tones. Pre-Columbian Inca Peru 1438 CE. Cyclopean polygonal stonework, trapezoidal doorways, ichu grass thatch. Indigenous South American copper-bronze skin. Painterly, dramatic, detailed.`
