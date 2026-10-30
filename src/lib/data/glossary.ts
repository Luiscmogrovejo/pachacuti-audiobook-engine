// src/lib/data/glossary.ts -- Quechua glossary entries
// PUBLIC SAMPLE: 12 of 186 entries. Context sentences here are neutral usage
// examples written for this public copy, not quotations from the book.

export interface GlossaryEntry {
  word: string
  pronunciation: string
  translation: string
  category: 'persona' | 'lugar' | 'objeto' | 'concepto' | 'expresion'
  culturalNote: string
  firstChapter: number
  chapterSlug: string
  contextSentence: string
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  // PUBLIC SAMPLE: 12 of the project's glossary entries. The full glossary is private.
  {
    word: "Tawantinsuyu",
    pronunciation: "ta-wan-tin-SU-yu",
    translation: "El Imperio de las Cuatro Regiones",
    category: "concepto",
    culturalNote: "Las cuatro regiones del mundo gobernadas por los Incas: Chinchaysuyu (norte), Antisuyu (este), Qollasuyu (sur), Kuntisuyu (oeste). No era un 'imperio' en el sentido clasico — era una confederacion que integro culturas.",
    firstChapter: 0,
    chapterSlug: "prologue",
    contextSentence: "El Tawantinsuyu se extendia desde el actual Ecuador hasta Chile.",
  },
  {
    word: "Hanan Pacha",
    pronunciation: "HA-nan PA-cha",
    translation: "Mundo de Arriba",
    category: "concepto",
    culturalNote: "El mundo celestial andino. Dominio de Inti (el Sol), el condor, y la luz. Una de las tres dimensiones del cosmos quechua.",
    firstChapter: 0,
    chapterSlug: "prologue",
    contextSentence: "El Hanan Pacha es el mundo de arriba en la cosmovision andina.",
  },
  {
    word: "Kay Pacha",
    pronunciation: "KAI PA-cha",
    translation: "Este Mundo",
    category: "concepto",
    culturalNote: "El mundo de los vivos, los humanos, el presente. Dominio del puma. El espacio donde ocurre la historia de Pachacuti.",
    firstChapter: 0,
    chapterSlug: "prologue",
    contextSentence: "El Kay Pacha es el mundo de los vivos, el aqui y el ahora.",
  },
  {
    word: "Ukhu Pacha",
    pronunciation: "UK-hu PA-cha",
    translation: "Mundo de Adentro",
    category: "concepto",
    culturalNote: "El inframundo andino. No es un infierno — es el mundo de los ancestros, las semillas, lo que germina. Dominio de la serpiente y Supay.",
    firstChapter: 0,
    chapterSlug: "prologue",
    contextSentence: "El Ukhu Pacha es el mundo interior, debajo de la tierra.",
  },
  {
    word: "Pachacuti",
    pronunciation: "pa-cha-KU-ti",
    translation: "El Que Estremece la Tierra / El Que Voltea el Mundo",
    category: "concepto",
    culturalNote: "Titulo historico del noveno Sapa Inca (Cusi Yupanqui). Pacha = tierra/tiempo/mundo. Cuti = vuelco, transformacion. El que cambia el curso del mundo.",
    firstChapter: 0,
    chapterSlug: "prologue",
    contextSentence: "Pachacuti nombra el vuelco del mundo, el cambio de era.",
  },
  {
    word: "ayllu",
    pronunciation: "AI-llu",
    translation: "comunidad familiar / clan",
    category: "concepto",
    culturalNote: "La unidad social fundamental del Tawantinsuyu. No solo familia: una red de obligaciones reciprocas, tierra compartida, identidad colectiva. Sin ayllu eras nadie.",
    firstChapter: 1,
    chapterSlug: "chapter-01",
    contextSentence: "El ayllu era la unidad social y productiva basica del mundo andino.",
  },
  {
    word: "mita",
    pronunciation: "MI-ta",
    translation: "trabajo comunal por turnos",
    category: "concepto",
    culturalNote: "Sistema de trabajo rotativo en el que cada ayllu contribuia con labor al estado Inca. No era esclavitud — era reciprocidad: el estado proveia comida, ropa y proteccion.",
    firstChapter: 1,
    chapterSlug: "chapter-01",
    contextSentence: "La mita organizaba el trabajo por turnos para obras del estado.",
  },
  {
    word: "yachay",
    pronunciation: "ya-CHAI",
    translation: "el saber profundo",
    category: "concepto",
    culturalNote: "Conocimiento que vive en el cuerpo antes de llegar a la cabeza. No es aprendizaje intelectual — es comprension encarnada, el tipo de saber que guia a Cusi en el campo de gayado.",
    firstChapter: 1,
    chapterSlug: "chapter-01",
    contextSentence: "Yachay nombra el saber que se adquiere haciendo.",
  },
  {
    word: "Mayu",
    pronunciation: "MA-yu",
    translation: "Rio Celestial / Via Lactea",
    category: "concepto",
    culturalNote: "La Via Lactea vista como un rio en el cosmos andino. Los Incas navegaban el tiempo por sus estrellas oscuras (constelaciones negras), no solo por las luminosas.",
    firstChapter: 1,
    chapterSlug: "chapter-01",
    contextSentence: "Los andinos llamaban Mayu a la Via Lactea, el rio celeste.",
  },
  {
    word: "Pururaucas",
    pronunciation: "pu-ru-RAU-cas",
    translation: "las piedras que combaten",
    category: "concepto",
    culturalNote: "Segun la leyenda andina, Wiracocha transformo las piedras en guerreros para defender Cusco. En el libro, Rumi es uno de ellos. El evento historico que marca el nacimiento del Imperio Inca.",
    firstChapter: 0,
    chapterSlug: "prologue",
    contextSentence: "Los Pururaucas aparecen en las cronicas como piedras hechas guerreros.",
  },
  {
    word: "ayahuasca",
    pronunciation: "a-ya-WAS-ka",
    translation: "liana del alma / bejuco de los muertos",
    category: "concepto",
    culturalNote: "Planta sagrada amazonica usada en rituales de vision. Aya = muerto/alma, huasca = soga/bejuco. En el libro Rumi declina tomarla — un momento pivotal.",
    firstChapter: 3,
    chapterSlug: "chapter-03",
    contextSentence: "La ayahuasca se usa en ceremonias rituales amazonicas.",
  },
  {
    word: "Inti",
    pronunciation: "IN-ti",
    translation: "El Sol / Dios del Sol",
    category: "concepto",
    culturalNote: "La deidad principal del estado Inca. No solo un dios — la fuente de vida, autoridad y legitimidad. El Sapa Inca era su hijo. Cusi escucha su voz desde nino.",
    firstChapter: 0,
    chapterSlug: "prologue",
    contextSentence: "Inti, el sol, era la divinidad principal del culto estatal inca.",
  },
] as const

/* ── Helper functions ─────────────────────────────────────────── */

export function getGlossaryByCategory(cat: GlossaryEntry["category"]): GlossaryEntry[] {
  return GLOSSARY.filter((e) => e.category === cat)
}

export function getGlossaryByChapter(chapterSlug: string): GlossaryEntry[] {
  return GLOSSARY.filter((e) => e.chapterSlug === chapterSlug)
}

export function searchGlossary(query: string): GlossaryEntry[] {
  const q = query.toLowerCase()
  return GLOSSARY.filter(
    (e) =>
      e.word.toLowerCase().includes(q) ||
      e.translation.toLowerCase().includes(q)
  )
}
