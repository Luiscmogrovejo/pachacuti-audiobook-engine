// src/lib/data/chapters.ts -- 24 chapter definitions for Pachacuti (Prologue + 23 chapters)
// 3-tier access model: free (prologue + ch01-04), signup (ch05-10), paid (ch11-23)

/** Access tier determines what authentication level is needed to play a chapter */
export type AccessTier = 'free' | 'signup' | 'paid'

export interface ChapterConfig {
  slug: string
  title: string
  titleEn: string
  chapter: number
  tier: AccessTier
  region: string
  pov: string
  audioFileEs: string | null
  audioFileEn: string | null
}

/**
 * Add new chapters by appending to CHAPTERS array only.
 * No components need modification -- chapter selector reads this array.
 */
export const CHAPTERS: readonly ChapterConfig[] = [
  // --- FREE TIER: Prologue + Chapter 01-04 (no signup required, 5 chapters) ---
  { slug: "prologue", chapter: 0, title: "Prologo -- Nawpa Pacha", titleEn: "Prologue -- Nawpa Pacha", tier: "free", region: "primordial", pov: "rumi", audioFileEs: "00-prologo-rumi-nawpa-pacha.mp3", audioFileEn: "00-prologue-rumi-nawpa-pacha-EN.mp3" },
  { slug: "chapter-01", chapter: 1, title: "Qosqo, la Ciudad del Puma", titleEn: "Qosqo, City of the Puma", tier: "free", region: "cusco", pov: "cusi", audioFileEs: "01-qosqo-la-ciudad-del-puma.mp3", audioFileEn: "01-qosqo-city-of-the-puma-EN.mp3" },
  { slug: "chapter-02", chapter: 2, title: "Las Cuevas de Sacsayhuaman", titleEn: "The Caves of Sacsayhuaman", tier: "free", region: "cave", pov: "cusi", audioFileEs: "02-las-cuevas-de-sacsayhuaman.mp3", audioFileEn: "02-the-caves-of-sacsayhuaman-EN.mp3" },
  { slug: "chapter-03", chapter: 3, title: "El Fuego del Inti Raymi", titleEn: "The Fire of Inti Raymi", tier: "free", region: "cusco", pov: "cusi", audioFileEs: "03-el-fuego-del-inti-raymi.mp3", audioFileEn: "03-the-fire-of-inti-raymi-EN.mp3" },
  { slug: "chapter-04", chapter: 4, title: "La Sombra del Trono", titleEn: "The Shadow of the Throne", tier: "free", region: "cusco-palace", pov: "urqu", audioFileEs: "04-la-sombra-del-trono.mp3", audioFileEn: "04-the-shadow-of-the-throne-EN.mp3" },
  // --- SIGNUP TIER: Chapter 05-10 (email magic link required, 6 chapters) ---
  { slug: "chapter-05", chapter: 5, title: "El Camino a la Costa", titleEn: "The Road to the Coast", tier: "signup", region: "coast-road", pov: "cusi", audioFileEs: "05-el-camino-a-la-costa.mp3", audioFileEn: "05-the-road-to-the-coast-EN.mp3" },
  { slug: "chapter-06", chapter: 6, title: "Los Hilos de Paracas", titleEn: "The Threads of Paracas", tier: "signup", region: "coast-paracas", pov: "cusi", audioFileEs: "06-los-hilos-de-paracas.mp3", audioFileEn: "06-the-threads-of-paracas-EN.mp3" },
  { slug: "chapter-07", chapter: 7, title: "El Rey de Sipan", titleEn: "The King of Sipan", tier: "signup", region: "coast-sipan", pov: "cusi", audioFileEs: "07-el-rey-de-sipan.mp3", audioFileEn: "07-the-king-of-sipan-EN.mp3" },
  { slug: "chapter-08", chapter: 8, title: "Donde Inti Duerme", titleEn: "Where Inti Sleeps", tier: "signup", region: "heights", pov: "cusi", audioFileEs: "08-donde-inti-duerme.mp3", audioFileEn: "08-where-inti-sleeps-EN.mp3" },
  { slug: "chapter-09", chapter: 9, title: "Los Hijos de la Piedra", titleEn: "Children of Stone", tier: "signup", region: "chavin", pov: "cusi", audioFileEs: "09-los-hijos-de-la-piedra.mp3", audioFileEn: "09-children-of-stone-EN.mp3" },
  { slug: "chapter-10", chapter: 10, title: "El Cuchillo en la Sombra", titleEn: "The Knife in the Shadow", tier: "signup", region: "chanca", pov: "uscovilca", audioFileEs: "10-el-cuchillo-en-la-sombra.mp3", audioFileEn: "10-the-knife-in-the-shadow-EN.mp3" },
  // --- PAID TIER: Chapter 11-23 (premium access -- Stripe Checkout) ---
  { slug: "chapter-11", chapter: 11, title: "Los Hijos de la Selva", titleEn: "Children of the Jungle", tier: "paid", region: "jungle", pov: "cusi", audioFileEs: "11-los-hijos-de-la-selva.mp3", audioFileEn: "11-children-of-the-jungle-EN.mp3" },
  { slug: "chapter-12", chapter: 12, title: "Los Guerreros de las Nubes", titleEn: "Warriors of the Clouds", tier: "paid", region: "kuelap", pov: "cusi", audioFileEs: "12-los-guerreros-de-las-nubes.mp3", audioFileEn: "12-warriors-of-the-clouds-EN.mp3" },
  // Chapters 13-19: audio available
  { slug: "chapter-13", chapter: 13, title: "La Maquina del Hermano", titleEn: "The Brothers Machine", tier: "paid", region: "jungle", pov: "cusi", audioFileEs: "13-la-maquina-del-hermano.mp3", audioFileEn: "13-the-brothers-machine-EN.mp3" },
  { slug: "chapter-14", chapter: 14, title: "La Ciudad Oculta", titleEn: "The Hidden City", tier: "paid", region: "choquequirao", pov: "naymlap", audioFileEs: "14-la-ciudad-oculta.mp3", audioFileEn: "14-the-hidden-city-EN.mp3" },
  { slug: "chapter-15", chapter: 15, title: "El Arbol de Oro", titleEn: "The Golden Tree", tier: "paid", region: "machu-picchu", pov: "cusi", audioFileEs: "15-el-arbol-de-oro.mp3", audioFileEn: "15-the-golden-tree-EN.mp3" },
  { slug: "chapter-16", chapter: 16, title: "Las Noticias de Aguas Calientes", titleEn: "The News from Aguas Calientes", tier: "paid", region: "aguas-calientes", pov: "cusi", audioFileEs: "16-las-noticias-de-aguas-calientes.mp3", audioFileEn: "16-the-news-from-aguas-calientes-EN.mp3" },
  { slug: "chapter-17", chapter: 17, title: "El Templo Bajo el Agua", titleEn: "The Temple Beneath the Water", tier: "paid", region: "titicaca", pov: "cusi", audioFileEs: "17-el-templo-bajo-el-agua.mp3", audioFileEn: "17-the-temple-beneath-the-water-EN.mp3" },
  { slug: "chapter-18", chapter: 18, title: "La Muerte del Inca", titleEn: "The Death of the Inca", tier: "paid", region: "titicaca-cusco", pov: "multi", audioFileEs: "18-la-muerte-del-inca.mp3", audioFileEn: "18-the-death-of-the-inca-EN.mp3" },
  { slug: "chapter-19", chapter: 19, title: "La Puerta del Sol", titleEn: "The Door of the Sun", tier: "paid", region: "tiahuanaco", pov: "cusi", audioFileEs: "19-la-puerta-del-sol.mp3", audioFileEn: "19-the-door-of-the-sun-EN.mp3" },
  // Chapters 20-23: audio pending production
  { slug: "chapter-20", chapter: 20, title: "La Coya de Hierro", titleEn: "The Iron Queen", tier: "paid", region: "chanca", pov: "mama-ocllo", audioFileEs: null, audioFileEn: null },
  { slug: "chapter-21", chapter: 21, title: "Yahuar Pampa", titleEn: "Yahuar Pampa", tier: "paid", region: "cusco-plains", pov: "cusi", audioFileEs: null, audioFileEn: null },
  { slug: "chapter-22", chapter: 22, title: "Rikchariy -- Despierta", titleEn: "Rikchariy -- Awaken", tier: "paid", region: "yahuar-pampa", pov: "multi", audioFileEs: null, audioFileEn: null },
  { slug: "chapter-23", chapter: 23, title: "El Final", titleEn: "The End", tier: "paid", region: "cusco", pov: "cusi", audioFileEs: null, audioFileEn: null },
] as const

/** Map from URL slug to chapter config (fast lookup) */
export const CHAPTER_BY_SLUG = new Map<string, ChapterConfig>(
  CHAPTERS.map((ch) => [ch.slug, ch])
)

/** Set of valid slugs */
export const VALID_SLUGS = new Set(CHAPTERS.map((ch) => ch.slug))

/** Chapters that require no authentication */
export const FREE_SLUGS = new Set(
  CHAPTERS.filter((ch) => ch.tier === 'free').map((ch) => ch.slug)
)

/** Chapters that require signup (email auth) */
export const SIGNUP_SLUGS = new Set(
  CHAPTERS.filter((ch) => ch.tier === 'signup').map((ch) => ch.slug)
)

/** Chapters that require paid access */
export const PAID_SLUGS = new Set(
  CHAPTERS.filter((ch) => ch.tier === 'paid').map((ch) => ch.slug)
)

/** Check if a user can access a chapter based on their auth state */
export function canAccess(slug: string, isAuthenticated: boolean, isPaid: boolean): boolean {
  if (FREE_SLUGS.has(slug)) return true
  if (SIGNUP_SLUGS.has(slug)) return isAuthenticated
  if (PAID_SLUGS.has(slug)) return isPaid
  return false
}
