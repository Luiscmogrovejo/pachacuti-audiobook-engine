// src/components/player/player-store.ts -- Zustand store for audio player state
// Persist middleware saves chapter/language/speed/position/bookmarks to localStorage

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SentenceData } from '../../lib/data/timing'

/** Valid playback speed values (PLAY-02) */
export const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0] as const
export type PlaybackSpeed = (typeof SPEED_OPTIONS)[number]

/** A saved bookmark at a specific position within a chapter (BOOK-01) */
export interface Bookmark {
  id: string
  chapterSlug: string
  time: number // seconds into chapter
  language: 'es' | 'en'
  label: string // Auto-generated: "Chapter X at MM:SS" or user-provided
  createdAt: number // Unix timestamp
}

export interface PlayerState {
  // Playback
  isPlaying: boolean
  currentTime: number
  duration: number
  speed: PlaybackSpeed

  // Chapter
  currentChapterSlug: string | null
  language: 'es' | 'en'
  voice: 'female' | 'male'

  // Sync
  currentSentenceIndex: number
  sentences: SentenceData[]

  // UI
  isChapterDrawerOpen: boolean

  // Sleep timer (SLEP-01)
  sleepTimerEndTime: number | null // Unix timestamp when timer expires, -1 = end-of-chapter sentinel
  sleepTimerMode: 'minutes' | 'end-of-chapter' | null

  // Bookmarks (BOOK-01, BOOK-02)
  bookmarks: Bookmark[]

  // Pending seek for bookmark navigation (seek after chapter load)
  pendingSeekTime: number | null

  // Encryption state
  encryptedTextLoaded: boolean

  // Actions
  play: () => void
  pause: () => void
  togglePlay: () => void
  seek: (time: number) => void
  setSpeed: (speed: PlaybackSpeed) => void
  setChapter: (slug: string) => void
  setLanguage: (lang: 'es' | 'en') => void
  setVoice: (voice: 'female' | 'male') => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setSentences: (sentences: SentenceData[]) => void
  setCurrentSentenceIndex: (index: number) => void
  toggleChapterDrawer: () => void

  // Sleep timer actions
  setSleepTimer: (minutes: number) => void
  setSleepTimerEndOfChapter: () => void
  clearSleepTimer: () => void

  // Bookmark actions
  addBookmark: (label?: string) => void
  removeBookmark: (id: string) => void

  // Pending seek action
  setPendingSeek: (time: number | null) => void

  // Encryption actions
  setEncryptedTextLoaded: (loaded: boolean) => void
  loadEncryptedText: (slug: string, lang: 'es' | 'en') => Promise<void>
}

/**
 * Player store with localStorage persistence.
 * Persists: currentChapterSlug, language, speed, currentTime, bookmarks
 * Does NOT persist: isPlaying, sentences, duration, sleepTimerEndTime (transient state)
 */
export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      // Playback defaults
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      speed: 1.0,

      // Chapter defaults
      currentChapterSlug: null,
      language: 'es',
      voice: 'female',

      // Sync defaults
      currentSentenceIndex: -1,
      sentences: [],

      // UI defaults
      isChapterDrawerOpen: false,

      // Sleep timer defaults
      sleepTimerEndTime: null,
      sleepTimerMode: null,

      // Bookmark defaults
      bookmarks: [],

      // Pending seek default
      pendingSeekTime: null,

      // Encryption defaults
      encryptedTextLoaded: false,

      // Actions
      play: () => set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      seek: (time) => set({ currentTime: time }),
      setSpeed: (speed) => set({ speed }),
      setChapter: (slug) =>
        set({
          currentChapterSlug: slug,
          currentTime: 0,
          currentSentenceIndex: -1,
          sentences: [],
          isPlaying: false,
        }),
      setLanguage: (lang) => set({ language: lang }),
      setVoice: (voice) => set({ voice }),
      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),
      setSentences: (sentences) => set({ sentences }),
      setCurrentSentenceIndex: (index) => set({ currentSentenceIndex: index }),
      toggleChapterDrawer: () =>
        set((state) => ({ isChapterDrawerOpen: !state.isChapterDrawerOpen })),

      // Sleep timer actions
      setSleepTimer: (minutes) =>
        set({
          sleepTimerEndTime: Date.now() + minutes * 60 * 1000,
          sleepTimerMode: 'minutes',
        }),
      setSleepTimerEndOfChapter: () =>
        set({
          sleepTimerEndTime: -1,
          sleepTimerMode: 'end-of-chapter',
        }),
      clearSleepTimer: () =>
        set({
          sleepTimerEndTime: null,
          sleepTimerMode: null,
        }),

      // Bookmark actions
      addBookmark: (label) => {
        const state = get()
        if (!state.currentChapterSlug) return

        const chapterNum = state.currentChapterSlug === 'prologue'
          ? 0
          : parseInt(state.currentChapterSlug.replace('chapter-', ''), 10)
        const chapterLabel = chapterNum === 0 ? 'Prologue' : `Chapter ${chapterNum}`

        const totalSeconds = Math.floor(state.currentTime)
        const m = Math.floor(totalSeconds / 60)
        const s = totalSeconds % 60
        const timeStr = `${m}:${String(s).padStart(2, '0')}`

        const autoLabel = label || `${chapterLabel} at ${timeStr}`

        const bookmark: Bookmark = {
          id: Date.now().toString(),
          chapterSlug: state.currentChapterSlug,
          time: state.currentTime,
          language: state.language,
          label: autoLabel,
          createdAt: Date.now(),
        }

        set({ bookmarks: [...state.bookmarks, bookmark] })
      },
      removeBookmark: (id) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
        })),

      // Pending seek action
      setPendingSeek: (time) => set({ pendingSeekTime: time }),

      // Encryption actions
      setEncryptedTextLoaded: (loaded) => set({ encryptedTextLoaded: loaded }),
      loadEncryptedText: async (slug, lang) => {
        try {
          set({ encryptedTextLoaded: false })

          const { loadTimingData } = await import('../../lib/data/timing')

          // 1. Fetch server-decrypted text (server handles decryption with master key)
          const response = await fetch(`/api/text/${slug}?lang=${lang}`)
          if (!response.ok) throw new Error(`Text fetch failed: ${response.status}`)
          const data = await response.json()
          const paragraphs: string[] = data.paragraphs

          // 2. Load timing data for sentence sync
          const chapterNumber = slug === 'prologue' ? 0 : parseInt(slug.replace('chapter-', ''), 10)
          const voice = get().voice
          const timingData = await loadTimingData(chapterNumber, lang, voice)

          // If we have timing data, use it; decrypted paragraphs serve as the text source
          // The sentences from timing data already have the text, so just use timing data directly
          if (timingData.length > 0) {
            set({ sentences: timingData, encryptedTextLoaded: true })
          } else {
            // No timing data -- create sentences from decrypted paragraphs without timing
            const sentences = paragraphs.map((text: string, i: number) => ({
              text: text.trim(),
              start: 0,
              end: 0,
              index: i,
            }))
            set({ sentences, encryptedTextLoaded: true })
          }
        } catch {
          // Fall back to non-encrypted text loading
          set({ encryptedTextLoaded: false })
        }
      },
    }),
    {
      name: 'pachacuti-player',
      partialize: (state) => ({
        currentChapterSlug: state.currentChapterSlug,
        language: state.language,
        voice: state.voice,
        speed: state.speed,
        currentTime: state.currentTime,
        bookmarks: state.bookmarks,
      }),
    },
  ),
)

// Sync language to cookie for Astro SSR bilingual support
// Cookie is read by Astro pages to render headings in the correct language
if (typeof document !== 'undefined') {
  let prevLang: string | undefined
  usePlayerStore.subscribe((state) => {
    if (state.language !== prevLang) {
      prevLang = state.language
      document.cookie = `pachacuti-lang=${state.language};path=/;max-age=31536000;SameSite=Lax`
    }
  })
  // Set initial cookie
  const initialLang = usePlayerStore.getState().language
  document.cookie = `pachacuti-lang=${initialLang};path=/;max-age=31536000;SameSite=Lax`

  // Sync voice to cookie for potential SSR use
  let prevVoice: string | undefined
  usePlayerStore.subscribe((state) => {
    if (state.voice !== prevVoice) {
      prevVoice = state.voice
      document.cookie = `pachacuti-voice=${state.voice};path=/;max-age=31536000;SameSite=Lax`
    }
  })
}
