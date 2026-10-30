// src/lib/data/quiz.ts -- 120 educational quiz questions about the Inca world of Pachacuti
// Categories: historia, personajes, geografia, quechua, cultura, mitologia

export type QuizCategory = 'historia' | 'personajes' | 'geografia' | 'quechua' | 'cultura' | 'mitologia'
export type QuizDifficulty = 'facil' | 'medio' | 'dificil'

export interface QuizQuestion {
  id: number
  question: string
  options: [string, string, string, string]
  correctIndex: number  // 0-3
  category: QuizCategory
  difficulty: QuizDifficulty
  explanation: string
}

export const QUIZ_CATEGORIES: { key: QuizCategory; label: string; color: string }[] = [
  { key: 'historia', label: 'Historia', color: '#d4a843' },
  { key: 'personajes', label: 'Personajes', color: '#b87070' },
  { key: 'geografia', label: 'Geografia', color: '#5a8c6e' },
  { key: 'quechua', label: 'Quechua', color: '#4a6a8a' },
  { key: 'cultura', label: 'Cultura', color: '#7a5a8a' },
  { key: 'mitologia', label: 'Mitologia', color: '#8a7a4a' },
]

export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  // PUBLIC SAMPLE: 3 of the project's quiz questions, chosen so that none
  // reveal unpublished plot. The full 120-question bank is private.
  {
    id: 1,
    question: "Que significa el titulo 'Pachacuti'?",
    options: [
      "El hijo del Sol",
      "El que estremece la Tierra",
      "El guerrero dorado",
      "El primer Inca",
    ],
    correctIndex: 1,
    category: "historia",
    difficulty: "facil",
    explanation: "Pachacuti viene de Pacha (tierra/tiempo/mundo) y Cuti (vuelco, transformacion). Significa 'El que voltea el mundo'.",
  },
  {
    id: 2,
    question: "Cual fue el nombre real de Pachacuti antes de convertirse en Inca?",
    options: [
      "Tupaq Yupanqui",
      "Manco Capac",
      "Cusi Yupanqui",
      "Sinchi Roca",
    ],
    correctIndex: 2,
    category: "historia",
    difficulty: "facil",
    explanation: "Cusi Yupanqui fue su nombre de nacimiento. Tomo el titulo Pachacuti tras derrotar a los Chanca.",
  },
  {
    id: 3,
    question: "Que batalla marco el nacimiento del Imperio Inca?",
    options: [
      "La Batalla de Cajamarca",
      "La Batalla de Yahuar Pampa",
      "La Batalla de Vilcashuaman",
      "La Batalla del Rio Apurimac",
    ],
    correctIndex: 1,
    category: "historia",
    difficulty: "facil",
    explanation: "En Yahuar Pampa (Llanura de Sangre), los Incas derrotaron a los Chanca, transformando una ciudad-estado en un imperio.",
  },
] as const

/* ── Shuffle utility ───────────────────────────────────────────── */

/** Fisher-Yates shuffle (returns new array) */
export function shuffleArray<T>(arr: readonly T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Shuffle options within a question (adjusts correctIndex) */
export function shuffleQuestion(q: QuizQuestion): QuizQuestion {
  const indices = [0, 1, 2, 3]
  const shuffled = shuffleArray(indices)
  const newOptions = shuffled.map((i) => q.options[i]) as [string, string, string, string]
  const newCorrectIndex = shuffled.indexOf(q.correctIndex)
  return { ...q, options: newOptions, correctIndex: newCorrectIndex }
}
