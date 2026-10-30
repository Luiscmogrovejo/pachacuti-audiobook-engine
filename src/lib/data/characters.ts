// src/lib/data/characters.ts -- character registry for the universe pages.
// PUBLIC SAMPLE: 2 of 32 records. The full cast (and the portraits it points
// at) is unpublished work and is not distributed in this public copy.

export interface CharacterRelationship {
  characterId: string
  label: string
}

export interface CharacterData {
  id: string
  slug: string
  name: string
  role: string
  full: string
  accent: string
  portrait: string
  title: string
  faction: string
  personality: string
  arc: string
  quechuaMeaning: string
  relationships: CharacterRelationship[]
  firstChapter: number
  spoilerChapter: number
}

export const CHARACTERS: readonly CharacterData[] = [
  // PUBLIC SAMPLE: 2 of the project's character records. The full cast is private.
  {
    id: "cusi",
    slug: "cusi",
    name: "CUSI YUPANQUI",
    role: "El hijo que el imperio no recuerda. El campe\u00f3n que los dioses no olvidan.",
    full: "Hay un pr\u00edncipe en Cusco al que nadie trata como pr\u00edncipe. Hijo del Sapa Inca por una concubina real de Sip\u00e1n \u2014 sangre real diluida en las venas de un muchacho que trabaja sirviendo a nobles y juega gayado al amanecer en la plaza de Huacaypata. Pero Wiracocha lo eligi\u00f3. Antes de que Cusi supiera lo que significaba temblar la tierra, los dioses ya hab\u00edan escrito su nombre en piedra.",
    accent: "#d4a843",
    portrait: "/art/characters/cusi.webp",
    title: "El Pr\u00edncipe Oculto",
    faction: "Inca / Tawantinsuyu",
    personality: "No teme al fracaso porque nunca lo ha visto como final \u2014 solo como otro punto de partida. Curioso hasta la imprudencia, terco hasta la sabidur\u00eda. L\u00edder natural que inspira sin propon\u00e9rselo, porque la gente sigue al que camina primero hacia el peligro. Practica el arete andino: excelencia en la pelea, en la danza, en el trato humano, en la risa que comparte con el vendedor de chicha y el general por igual.",
    arc: "Pr\u00edncipe invisible entre cien hijos del Inca \u2192 guerrero errante que esconde su sangre \u2192 libertador de ciudades que no le deben nada \u2192 campe\u00f3n en Yahuar Pampa donde la tierra tiembla por primera vez \u2192 Pachacuti coronado... y exiliado por su propia sangre antes de tocar el cetro.",
    quechuaMeaning: "Cusi = alegr\u00eda, felicidad. Yupanqui = el digno de ser contado, el que merece ser recordado.",
    relationships: [
      { characterId: "rumi", label: "Guardi\u00e1n / hermano" },
      { characterId: "naymlap", label: "Primo costero" },
      { characterId: "mama-ocllo", label: "Amor secreto / prometida" },
      { characterId: "willaq-umu", label: "Mentor / manipulador" },
      { characterId: "urqu", label: "Hermano traidor" },
      { characterId: "viracocha-inca", label: "Padre / rey" },
    ],
    firstChapter: 1,
    spoilerChapter: 3,
  },
  {
    id: "rumi",
    slug: "rumi",
    name: "RUMI",
    role: "La piedra que sue\u00f1a con ser hombre. El guardi\u00e1n sin memoria ni nombre.",
    full: "Hay un hombre en Cusco que no sangra como los dem\u00e1s. Sus nudillos oscurecen cuando pelea \u2014 no con moretones sino con algo m\u00e1s antiguo, algo que recuerda haber sido monta\u00f1a. Rumi no sabe lo que es. Solo sabe que lo encontraron en las cuevas bajo Sacsayhuam\u00e1n sin nombre ni pasado, y que las piedras temblaron cuando las toc\u00f3. Un Pururaucas enviado por Wiracocha para proteger al elegido \u2014 pero \u00e9l eligi\u00f3 olvidar, y ahora camina entre mortales como uno m\u00e1s, cargando un silencio geol\u00f3gico que catorce cap\u00edtulos de viaje no lograr\u00e1n romper hasta que el amor y el sacrificio lo quiebren en Yahuar Pampa.",
    accent: "#8ba8c4",
    portrait: "/art/characters/rumi.webp",
    title: "La Piedra que Sue\u00f1a",
    faction: "Pururaucas / Wiracocha",
    personality: "Introvertido hasta la geolog\u00eda \u2014 habla tan poco que sus silencios tienen peso f\u00edsico. No le gusta pelear. Pero cuando Cusi est\u00e1 en peligro, algo anterior al pensamiento toma sus manos y pelea con una habilidad que ning\u00fan humano deber\u00eda poseer. Despu\u00e9s se mira los nudillos oscurecidos y no entiende.",
    arc: "Guardi\u00e1n sin memoria encontrado en las cuevas \u2192 fragmentos que regresan como sue\u00f1os de cielos rojos y monta\u00f1as caminando \u2192 rechaza la cimora en Chav\u00edn y pierde la oportunidad de saber \u2192 el primer temblor en Kuelap \u2192 detonaci\u00f3n total en Yahuar Pampa: la piedra se quiebra, recuerda todo, y convoca a sus hermanos del fondo de la tierra.",
    quechuaMeaning: "Rumi = piedra, roca. En Quechua, tambi\u00e9n simboliza fortaleza, permanencia, lo que no cambia.",
    relationships: [
      { characterId: "cusi", label: "Hermano / protegido" },
      { characterId: "naymlap", label: "Compa\u00f1ero del tr\u00edo" },
    ],
    firstChapter: 0,
    spoilerChapter: 4,
  },
] as const

/** Lookup character by slug */
export function getCharacterBySlug(slug: string): CharacterData | undefined {
  return CHARACTERS.find(c => c.slug === slug)
}

/** Get all valid slugs */
export function getAllCharacterSlugs(): string[] {
  return CHARACTERS.map(c => c.slug)
}
