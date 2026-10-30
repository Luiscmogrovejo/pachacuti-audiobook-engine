// src/lib/data/scenes.ts -- scene image registry, keyed by chapter.
//
// PUBLIC SAMPLE: the project registry holds ~119 scenes across 24 chapters.
// Three neutral sample rows are committed here so /gallery and the player's
// SceneCycler render; the full registry describes unpublished scenes and is
// private, as are the generated images themselves.

export interface SceneImage {
  /** Scene identifier, e.g. "ch01-scene-03" */
  id: string
  /** Chapter number (0-23) */
  chapter: number
  /** Path to WebP image in public/art/scenes/ */
  imagePath: string
  /** Alt text / description of the scene */
  description: string
  /** Character IDs appearing in the scene */
  characters: string[]
  /** Key narrative moment */
  moment: string
  /** Geographic/cultural region */
  region: string
}

/**
 * Map from chapter number to ordered array of scenes.
 * Scene order follows story progression within each chapter.
 */
export const CHAPTER_SCENES: Record<number, SceneImage[]> = {
  0: [
    {
      id: 'ch00-scene-01',
      chapter: 0,
      imagePath: '/art/scenes/ch00/ch00-scene-01.webp',
      description: 'Sample scene: high-altitude puna strewn with boulders at golden hour',
      characters: [],
      moment: 'Sample scene: empty landscape establishing shot',
      region: 'primordial',
    },
    {
      id: 'ch00-scene-02',
      chapter: 0,
      imagePath: '/art/scenes/ch00/ch00-scene-02.webp',
      description: 'Sample scene: a figure inside a chamber of fitted megalithic stone',
      characters: ['rumi'],
      moment: 'Sample scene: character shot driven by a locked identity block',
      region: 'primordial',
    },
  ],
  1: [
    {
      id: 'ch01-scene-01',
      chapter: 1,
      imagePath: '/art/scenes/ch01/ch01-scene-01.webp',
      description: 'Sample scene: stone-paved avenue in Cusco at golden hour',
      characters: ['cusi'],
      moment: 'Sample scene: city establishing shot',
      region: 'cusco',
    },
  ],
}
