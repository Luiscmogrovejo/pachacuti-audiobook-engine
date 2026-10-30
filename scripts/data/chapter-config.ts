/**
 * Chapter Configuration -- per-chapter metadata for art generation pipeline
 *
 * Scene counts are variable based on chapter length and story complexity,
 * NOT a fixed 10 per chapter. Derived from 03-RESEARCH.md word count analysis
 * and PACHACUTI-BIBLE.md story beat analysis.
 *
 * `hasText: false` flags chapters where the source text does not exist yet
 * (ch20-23 are placeholders with ~23 words). These chapters use Bible-sourced
 * prompts only, flagged for review when text is written.
 */

export interface ChapterConfig {
  /** Chapter number (0-23) */
  chapter: number
  /** URL-safe slug */
  slug: string
  /** Chapter title (Spanish) */
  title: string
  /** Approximate word count (Spanish text) */
  wordCount: number
  /** Number of scene images to generate */
  sceneCount: number
  /** ARCH bank keys used in this chapter */
  regions: string[]
  /** Whether chapter text exists (false for ch20-23 placeholders) */
  hasText: boolean
  /** Environment to character scene ratio (0.7 = 70% environment, 30% character) */
  envRatio: number
}

export const CHAPTER_CONFIG: ChapterConfig[] = [
  // === ACT 1: CUSCO (ch00-04) ===
  {
    chapter: 0,
    slug: 'prologo',
    title: 'Prologo: Rumi Nawpa Pacha',
    wordCount: 4735,
    sceneCount: 10,
    regions: ['cave', 'mountainRoad'],
    hasText: true,
    envRatio: 0.7,
  },
  {
    chapter: 1,
    slug: 'la-ciudad-del-puma',
    title: 'Qosqo: La Ciudad del Puma',
    wordCount: 9221,
    sceneCount: 10,
    regions: ['cuscoStreet', 'qorikancha', 'market', 'courtyard'],
    hasText: true,
    envRatio: 0.7,
  },
  {
    chapter: 2,
    slug: 'las-cuevas-de-sacsayhuaman',
    title: 'Las Cuevas de Sacsayhuaman',
    wordCount: 8074,
    sceneCount: 10,
    regions: ['sacsayhuaman', 'cave'],
    hasText: true,
    envRatio: 0.7,
  },
  {
    chapter: 3,
    slug: 'inti-raymi',
    title: 'El Fuego del Inti Raymi',
    wordCount: 16012,
    sceneCount: 12,
    regions: ['cuscoStreet', 'qorikancha', 'courtyard', 'sacsayhuaman'],
    hasText: true,
    envRatio: 0.7,
  },
  {
    chapter: 4,
    slug: 'la-silla-del-trueno',
    title: 'La Sombra del Trono',
    wordCount: 13573,
    sceneCount: 10,
    regions: ['palace', 'cuscoStreet', 'courtyard'],
    hasText: true,
    envRatio: 0.7,
  },

  // === ACT 2: THE COAST (ch05-08) ===
  {
    chapter: 5,
    slug: 'la-costa',
    title: 'El Camino a la Costa',
    wordCount: 15328,
    sceneCount: 10,
    regions: ['mountainRoad', 'tambo', 'paracas'],
    hasText: true,
    envRatio: 0.7,
  },
  {
    chapter: 6,
    slug: 'los-hilos-de-paracas',
    title: 'Los Hilos de Paracas',
    wordCount: 15894,
    sceneCount: 10,
    regions: ['paracas', 'nazcaLines'],
    hasText: true,
    envRatio: 0.7,
  },
  {
    chapter: 7,
    slug: 'el-rey-de-sipan',
    title: 'El Rey de Sipan',
    wordCount: 17880,
    sceneCount: 12,
    regions: ['sipan', 'tambo'],
    hasText: true,
    envRatio: 0.7,
  },
  {
    chapter: 8,
    slug: 'inti-duerme',
    title: 'Donde Inti Duerme',
    wordCount: 12067,
    sceneCount: 10,
    regions: ['sipan', 'mountainRoad', 'cordilleraBlanca'],
    hasText: true,
    envRatio: 0.7,
  },

  // === ACT 3: THE HEIGHTS (ch09-10) ===
  {
    chapter: 9,
    slug: 'los-hijos-de-la-piedra',
    title: 'Los Hijos de la Piedra',
    wordCount: 17916,
    sceneCount: 12,
    regions: ['chavin', 'cordilleraBlanca', 'huascaran'],
    hasText: true,
    envRatio: 0.7,
  },
  {
    chapter: 10,
    slug: 'la-sombra-del-cuchillo',
    title: 'El Cuchillo en la Sombra',
    wordCount: 15726,
    sceneCount: 10,
    regions: ['chavin', 'mountainRoad', 'chancaCamp'],
    hasText: true,
    envRatio: 0.7,
  },

  // === ACT 4: THE JUNGLE (ch11-12) ===
  {
    chapter: 11,
    slug: 'los-hijos-de-la-selva',
    title: 'Los Hijos de la Selva',
    wordCount: 26882,
    sceneCount: 14,
    regions: ['jungle', 'jungleVillage', 'pongo'],
    hasText: true,
    envRatio: 0.7,
  },
  {
    chapter: 12,
    slug: 'los-guerreros-de-las-nubes',
    title: 'Los Guerreros de las Nubes',
    wordCount: 22908,
    sceneCount: 14,
    regions: ['cloudForest', 'kuelap', 'karajia'],
    hasText: true,
    envRatio: 0.7,
  },

  // === ACT 5: THE RETURN (ch13-19) ===
  {
    chapter: 13,
    slug: 'la-maquina-del-hermano',
    title: 'La Maquina del Hermano',
    wordCount: 16970,
    sceneCount: 10,
    regions: ['cuscoStreet', 'palace'],
    hasText: true,
    envRatio: 0.7,
  },
  {
    chapter: 14,
    slug: 'la-ciudad-oculta',
    title: 'La Ciudad Oculta',
    wordCount: 19685,
    sceneCount: 12,
    regions: ['choquequirao', 'jungle'],
    hasText: true,
    envRatio: 0.7,
  },
  {
    chapter: 15,
    slug: 'el-arbol-de-oro',
    title: 'El Arbol de Oro',
    wordCount: 20205,
    sceneCount: 14,
    regions: ['machuPicchu', 'cloudForest'],
    hasText: true,
    envRatio: 0.7,
  },
  {
    chapter: 16,
    slug: 'noticias-de-aguas-calientes',
    title: 'Las Noticias de Aguas Calientes',
    wordCount: 14532,
    sceneCount: 10,
    regions: ['tambo', 'machuPicchu'],
    hasText: true,
    envRatio: 0.7,
  },
  {
    chapter: 17,
    slug: 'el-templo-bajo-el-agua',
    title: 'El Templo Bajo el Agua',
    wordCount: 17374,
    sceneCount: 12,
    regions: ['titicaca', 'underwaterTemple', 'doorOfSun'],
    hasText: true,
    envRatio: 0.7,
  },
  {
    chapter: 18,
    slug: 'la-muerte-del-inca',
    title: 'La Muerte del Inca',
    wordCount: 17253,
    sceneCount: 14,
    regions: ['titicaca', 'qorikancha', 'yahuarPampa'],
    hasText: true,
    envRatio: 0.7,
  },
  {
    chapter: 19,
    slug: 'la-puerta-del-sol',
    title: 'La Puerta del Sol',
    wordCount: 17915,
    sceneCount: 12,
    regions: ['doorOfSun', 'titicaca'],
    hasText: true,
    envRatio: 0.7,
  },

  // === ACT 6: THE WAR (ch20-23) -- Bible-sourced, no chapter text ===
  {
    chapter: 20,
    slug: 'la-coya-de-hierro',
    title: 'La Coya de Hierro',
    wordCount: 23,
    sceneCount: 8,
    regions: ['wamanKarpa', 'cuscoUnderSiege'],
    hasText: false,
    envRatio: 0.7,
  },
  {
    chapter: 21,
    slug: 'yahuar-pampa',
    title: 'Yahuar Pampa',
    wordCount: 23,
    sceneCount: 8,
    regions: ['yahuarPampa', 'chancaCamp', 'battlefield'],
    hasText: false,
    envRatio: 0.7,
  },
  {
    chapter: 22,
    slug: 'rikchariy',
    title: 'Rikchariy',
    wordCount: 23,
    sceneCount: 8,
    regions: ['yahuarPampa', 'battlefield'],
    hasText: false,
    envRatio: 0.7,
  },
  {
    chapter: 23,
    slug: 'el-final',
    title: 'El Final',
    wordCount: 23,
    sceneCount: 8,
    regions: ['coronationPlaza', 'cuscoStreet', 'mountainRoad'],
    hasText: false,
    envRatio: 0.7,
  },
]
