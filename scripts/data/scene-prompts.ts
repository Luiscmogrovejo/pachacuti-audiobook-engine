/**
 * Scene Prompts -- per-scene generation prompts for the art pipeline.
 *
 * Prompt structure follows a fixed 3-block pattern so that style, location and
 * subject are controlled independently:
 *
 *   STYLE_ANCHOR + ARCH[archKey] + sceneDescription (+ WARM_PALETTE)
 *
 * and, for scenes with a named character, the locked identity block from
 * `character-identities.ts` is prepended ahead of all three.
 *
 * PUBLIC SAMPLE: the committed bank holds 2 entries -- one environment shot and
 * one character shot -- plus one background prompt, which is enough to run
 * `generate-scenes.ts` end to end. The project's full bank (~230 prompts
 * derived from unpublished manuscript scenes) is private.
 */

import { WARM_PALETTE } from './style-anchor.js'

export interface ScenePrompt {
  /** Unique scene identifier, e.g. "ch01-scene-03" */
  id: string
  /** Human-readable description of the scene */
  description: string
  /** The generation prompt (WITHOUT style anchor -- that is prepended at generation time) */
  prompt: string
  /** ARCH bank key for location context */
  archKey: string
  /** Whether this is an environment-only shot or includes a named character */
  type: 'environment' | 'character'
  /** Character IDs appearing in this scene (for the identity-block prefix) */
  characterRefs: string[]
  /** Source of the prompt content -- 'text' for chapter-sourced, 'bible' for reference-only */
  source?: 'text' | 'bible'
}

export interface BackgroundPrompt {
  /** Background identifier, e.g. "ch00-bg" */
  id: string
  /** Human-readable description */
  description: string
  /** The generation prompt (WITHOUT style anchor) */
  prompt: string
  /** ARCH bank key */
  archKey: string
}

/**
 * Generate a standardized scene prompt ID.
 * @param chapter Chapter number (0-23)
 * @param sceneNum Scene number within chapter (1-based)
 * @returns Scene ID string, e.g. "ch01-scene-03"
 */
export function generateScenePromptId(chapter: number, sceneNum: number): string {
  return `ch${String(chapter).padStart(2, '0')}-scene-${String(sceneNum).padStart(2, '0')}`
}

/**
 * Scene prompts by chapter key (e.g. "ch00", "ch13").
 * Chapters with no committed prompts resolve to an empty array; the generator
 * skips them rather than failing.
 */
export const SCENE_PROMPTS: Record<string, ScenePrompt[]> = {
  ch00: [
    {
      id: 'ch00-scene-01',
      description: 'SAMPLE environment shot -- empty high-altitude puna strewn with boulders',
      prompt: `Landscape view of the Peruvian altiplano puna at 4000 metres. A flat golden-brown grassland running to the horizon in every direction. Thousands of boulders of different sizes scattered across the ichu tussock grass: dark grey andesite, black obsidian catching the light, pink granite with crystal inclusions, flat grey slate. The rocks are natural geological forms, irregular and weathered, casting long shadows. Snow-capped Andean peaks line the far horizon under a deep blue sky. Harsh warm late-afternoon high-altitude sunlight painting the rocks amber. Complete emptiness: only rock, grass, mountain and sky. Wide aerial perspective across the plain.\n\n${WARM_PALETTE}\n\nAltiplano puna, scattered boulders in ichu grassland, snow-capped peaks, golden afternoon light, no figures. Painterly, dramatic, detailed.`,
      archKey: 'mountainRoad',
      type: 'environment',
      characterRefs: [],
      source: 'text',
    },
    {
      id: 'ch00-scene-02',
      description: 'SAMPLE character shot -- identity block drives the subject, ARCH drives the room',
      prompt: `A single figure stands inside a chamber of fitted megalithic stonework, one hand resting flat against the wall. Warm amber light enters from a trapezoidal doorway at the lower right, where a smaller silhouetted figure provides scale. Dust hangs in the light shaft. Cool stone greys against the warm doorway light. Medium shot, low angle.\n\n${WARM_PALETTE}\n\nFigure in cyclopean stone chamber, trapezoidal doorway, amber light shaft, dust in air. Painterly, dramatic, detailed.`,
      archKey: 'sacsayhuaman',
      type: 'character',
      characterRefs: ['rumi'],
      source: 'text',
    },
  ],
}

/**
 * Background prompts by chapter key.
 * One wide panoramic atmospheric image per chapter, generated at 4:3 landscape.
 */
export const BACKGROUND_PROMPTS: Record<string, BackgroundPrompt> = {
  ch00: {
    id: 'ch00-bg',
    description: 'SAMPLE background -- primordial Andean dawn, no figures',
    prompt: `Ultra-wide panoramic landscape. A primordial Andean mountain range at dawn. The sky burns red-gold. Columns of light fall onto raw peaks of exposed granite and basalt. No vegetation, no paths, no human marks: only raw geology. Snow-capped summits catch the crimson light and glow like heated metal. Dark valleys fill with golden mist rising from warm earth. Range upon range stretching to infinity. Extremely wide panoramic composition, no figures, atmospheric depth with hazy distant ranges.\n\n${WARM_PALETTE}\n\nPrimordial Andean range, red-gold dawn, raw granite peaks, golden mist, no human presence. Painterly, dramatic, atmospheric.`,
    archKey: 'mountainRoad',
  },
}
