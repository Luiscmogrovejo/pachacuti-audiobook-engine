/**
 * Architecture Bank -- pre-written location descriptions for prompt injection.
 *
 * Every scene prompt references one or more ARCH keys via template literals, so
 * the same location always renders with the same architecture. This is the
 * single source of truth for location description in generation prompts.
 *
 * Rules that make the bank work:
 * - Entries are POSITIVE-ONLY (describe what IS, never what IS NOT -- negations
 *   leak into diffusion output).
 * - Each entry ends with a lighting / atmospheric cue.
 * - Stay in the 80-240 character range; longer entries dilute the subject.
 * - Use period vocabulary as implicit style anchors.
 *
 * PUBLIC SAMPLE: 3 of the project's location entries are included to show the
 * shape and the register. The full bank (27 entries) is private, as it is
 * derived from unpublished manuscript locations.
 */

export const ARCH: Record<string, string> = {
  sacsayhuaman:
    'Massive zigzag cyclopean walls of Sacsayhuaman fortress, each stone fitted perfectly without mortar, some taller than three men. Ichu grass thatch roofs on barracks beyond.',

  qorikancha:
    'Interior walls covered entirely in hammered gold sheets. Trapezoidal niches holding gold figures. Stone floor polished to mirror finish. Torchlight reflecting off gold surfaces creating warm amber glow.',

  mountainRoad:
    'Qhapaq Nan royal road -- stone-paved path 3-4 meters wide, stepping stones over streams, stone retaining walls along cliff edges. Terraced hillsides, snow-capped peaks above.',

  /** Sentinel for scenes with no architectural context (pure geology, interiors of nothing). */
  none: '',
}
