// src/components/player/PlayerIsland.tsx -- Root React island for the audio player
// Owns AudioEngine, wires store<->engine, delegates rAF sync to useAudioSync
// Full player: atmospheric zone (KaraokeDisplay) + control zone (PlayerControls)
// Mini player: MiniPlayer bar on non-listen pages
// Placed in BaseLayout with transition:persist so audio survives page navigations

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { usePlayerStore } from './player-store'
import { AudioEngine } from './AudioEngine'
// EncryptedAudioEngine loaded dynamically only when encryption is enabled
// Static import was causing "Cannot read properties of undefined (reading 'call')" when CONTENT_MASTER_KEY not set
import { PlayerControls } from './PlayerControls'
import { MiniPlayer } from './MiniPlayer'
import { KaraokeDisplay } from './KaraokeDisplay'
import { useMediaSession } from './useMediaSession'
import { useAudioSync } from './useAudioSync'
import { useEncryption } from './useEncryption'
import {
  loadTimingData,
  findSentenceIndex,
  getChapterNumberFromSlug,
  getNextChapterSlug,
} from '../../lib/data/timing'
import { CHAPTERS, CHAPTER_BY_SLUG } from '../../lib/data/chapters'
import { THEME_BY_SLUG, FALLBACK_THEME } from '../../lib/data/themes'
import { ChapterDrawer } from './ChapterDrawer'
import { BookmarkList } from './BookmarkList'
import { SceneCycler } from './SceneCycler'
import { ChapterContext } from './ChapterContext'
import { useSession } from '../../lib/auth/client'

/** Mood-based color grading tints (very subtle, 3-8% opacity) */
const MOOD_TINTS: Record<string, string> = {
  volcanic: 'rgba(232,82,42,0.05)',
  warm: 'rgba(212,168,67,0.05)',
  dark: 'rgba(20,20,40,0.08)',
  fire: 'rgba(255,120,30,0.06)',
  cold: 'rgba(100,140,200,0.05)',
  coastal: 'rgba(60,120,100,0.05)',
  golden: 'rgba(200,160,50,0.06)',
  mountain: 'rgba(180,200,220,0.04)',
  stone: 'rgba(100,90,75,0.05)',
  tropical: 'rgba(45,122,58,0.05)',
  fallback: 'rgba(100,100,100,0.04)',
}

/** Context recovery: rewind 7 seconds on resume for listener to regain context (PROG-02) */
const CONTEXT_REWIND_SECONDS = 7

interface PlayerIslandProps {
  /** Current page path from Astro.url.pathname -- used to determine render mode */
  currentPath?: string
}

export function PlayerIsland({ currentPath: initialPath = '' }: PlayerIslandProps) {
  const engineRef = useRef<AudioEngine | null>(null)
  const encryption = useEncryption()
  // Track current path in state so that Astro View Transition navigations update render mode.
  // transition:persist means props won't re-render, so we listen for astro:page-load events.
  const [currentPath, setCurrentPath] = useState(initialPath)
  const pathRef = useRef(initialPath)

  // Context recovery: true on initial mount when store has a persisted slug.
  // Only applies rewind on the first chapter load (resume), not on manual navigation.
  const isResuming = useRef(!!usePlayerStore.getState().currentChapterSlug)

  // Store selectors
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentChapterSlug = usePlayerStore((s) => s.currentChapterSlug)
  const language = usePlayerStore((s) => s.language)
  const voice = usePlayerStore((s) => s.voice)
  const speed = usePlayerStore((s) => s.speed)
  const pause = usePlayerStore((s) => s.pause)
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime)
  const setDuration = usePlayerStore((s) => s.setDuration)
  const setChapter = usePlayerStore((s) => s.setChapter)
  const setSentences = usePlayerStore((s) => s.setSentences)
  const setCurrentSentenceIndex = usePlayerStore(
    (s) => s.setCurrentSentenceIndex,
  )
  const isChapterDrawerOpen = usePlayerStore((s) => s.isChapterDrawerOpen)
  const toggleChapterDrawer = usePlayerStore((s) => s.toggleChapterDrawer)
  const sleepTimerMode = usePlayerStore((s) => s.sleepTimerMode)
  const clearSleepTimer = usePlayerStore((s) => s.clearSleepTimer)
  const pendingSeekTime = usePlayerStore((s) => s.pendingSeekTime)
  const setPendingSeek = usePlayerStore((s) => s.setPendingSeek)

  // Bookmark list overlay state
  const [isBookmarkListOpen, setIsBookmarkListOpen] = useState(false)
  const toggleBookmarkList = useCallback(() => {
    setIsBookmarkListOpen((prev) => !prev)
  }, [])

  // --- Cross-device sync: server progress save throttle (PROG-05) ---
  const { data: sessionData } = useSession()
  const isAuthenticated = !!sessionData?.session
  const lastServerSaveRef = useRef(0)

  // Determine render mode from currentPath
  // On /listen/* pages: full player. On all other pages: mini player.
  const isListenPage = currentPath.startsWith('/listen/')
  const chapterSlugFromPath = isListenPage
    ? currentPath.replace('/listen/', '').replace(/\/$/, '')
    : null

  // Listen for Astro View Transition page loads to update current path.
  // transition:persist keeps this component mounted, so props won't update.
  // Instead, listen for astro:page-load to detect navigation.
  useEffect(() => {
    const handlePageLoad = () => {
      const newPath = window.location.pathname
      if (newPath !== pathRef.current) {
        pathRef.current = newPath
        setCurrentPath(newPath)
      }
    }

    // Update on initial mount
    handlePageLoad()

    // Listen for Astro View Transition navigations
    document.addEventListener('astro:page-load', handlePageLoad)
    // Also handle popstate for browser back/forward
    window.addEventListener('popstate', handlePageLoad)

    return () => {
      document.removeEventListener('astro:page-load', handlePageLoad)
      window.removeEventListener('popstate', handlePageLoad)
    }
  }, [])

  // --- Initialize AudioEngine on mount (persists across navigations via transition:persist) ---
  // Standard AudioEngine with signed URL delivery (token-based access control)
  // Text encryption uses separate decryption path in player-store
  // Scene images go through token-gated /api/image/ when encryption enabled
  useEffect(() => {
    const engine = new AudioEngine()

    engine.setCallbacks({
      onTimeUpdate: (time) => {
        setCurrentTime(time)
      },
      onLoadedMetadata: (duration) => {
        setDuration(duration)
      },
      onEnded: () => {
        // Sleep timer: end-of-chapter mode pauses instead of auto-advancing (SLEP-01)
        const state = usePlayerStore.getState()
        if (state.sleepTimerMode === 'end-of-chapter') {
          pause()
          usePlayerStore.getState().clearSleepTimer()
          return
        }

        // Auto-advance to next chapter with audio
        const current = state.currentChapterSlug
        if (current) {
          const nextSlug = getNextChapterSlug(current)
          if (nextSlug) {
            setChapter(nextSlug)
            // Update URL without creating history stack entries (replaceState)
            window.history.replaceState(null, '', `/listen/${nextSlug}`)
          } else {
            // End of book -- no more chapters with audio
            pause()
          }
        } else {
          pause()
        }
      },
      onError: () => {
        pause()
      },
    })

    engineRef.current = engine

    return () => {
      engine.destroy()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- beforeunload safety net: ensure currentTime is flushed to localStorage (PROG-01) ---
  // Zustand persist writes synchronously on every state change, so the value is typically
  // already current. This handler is a defensive safety net for edge cases (e.g., rapid
  // tab close during throttled updates) and documents the intent.
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Access latest state to ensure persist middleware has flushed
      const state = usePlayerStore.getState()
      // Force a no-op set to trigger persist write with latest currentTime
      if (state.currentChapterSlug && engineRef.current) {
        const engineTime = engineRef.current.getCurrentTime()
        if (Math.abs(engineTime - state.currentTime) > 0.5) {
          usePlayerStore.getState().setCurrentTime(engineTime)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // --- Cross-device sync: load server progress on mount when authenticated (PROG-05) ---
  useEffect(() => {
    if (!isAuthenticated) return

    fetch('/api/progress/load')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.progress?.length) return

        // Find the most recently updated server-side progress entry
        const sorted = [...data.progress].sort(
          (a: { updatedAt: string }, b: { updatedAt: string }) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        const latest = sorted[0]

        // Compare with localStorage state
        const localState = usePlayerStore.getState()
        const serverTime = new Date(latest.updatedAt).getTime()

        // Use server progress if it's newer than local (or if no local chapter)
        // Simple heuristic: if server has a different chapter or a more advanced position
        if (!localState.currentChapterSlug) {
          // No local progress -- use server
          usePlayerStore.getState().setChapter(latest.chapterSlug)
          usePlayerStore.getState().setLanguage(latest.language)
          usePlayerStore.getState().setCurrentTime(latest.currentTime ?? 0)
        }
        // If same chapter, take whichever has more progress (higher currentTime)
        // This is a simple merge strategy -- the user can always override
      })
      .catch(() => {}) // Non-blocking, ignore errors
  }, [isAuthenticated])

  // --- Cross-device sync: throttled server save during playback (PROG-05) ---
  useEffect(() => {
    if (!isAuthenticated || !isPlaying || !currentChapterSlug) return

    const intervalId = setInterval(() => {
      if (Date.now() - lastServerSaveRef.current < 10_000) return

      const state = usePlayerStore.getState()
      fetch('/api/progress/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterSlug: state.currentChapterSlug,
          language: state.language,
          currentTime: Math.floor(state.currentTime),
          speed: String(state.speed),
        }),
      }).catch(() => {}) // Non-blocking, ignore errors

      lastServerSaveRef.current = Date.now()
    }, 10_000)

    return () => clearInterval(intervalId)
  }, [isAuthenticated, isPlaying, currentChapterSlug])

  // --- Media Session hook ---
  useMediaSession(engineRef.current)

  // Track previous language/voice to detect language-only or voice-only changes for position preservation
  const prevLanguageRef = useRef(language)
  const prevVoiceRef = useRef(voice)

  // Track truly loaded chapter slug via ref (immune to stale closures)
  const loadedChapterRef = useRef<string | null>(currentChapterSlug)

  // --- Load chapter audio + timing when slug changes (resets position) ---
  useEffect(() => {
    const slug = currentChapterSlug
    if (!slug || !engineRef.current) return

    const engine = engineRef.current

    // Update loaded chapter ref
    loadedChapterRef.current = slug

    // Load audio for the current language and voice
    engine.loadChapter(slug, language, voice)

    // Context recovery rewind on resume (PROG-02):
    // If this is the initial page load resume (not drawer navigation or auto-advance),
    // seek to savedTime - CONTEXT_REWIND_SECONDS after audio loads.
    if (isResuming.current) {
      const savedTime = usePlayerStore.getState().currentTime
      const audioEl = engine.getAudioElement()
      if (audioEl && savedTime > 0) {
        const handleCanPlayResume = () => {
          audioEl.removeEventListener('canplay', handleCanPlayResume)
          const seekTarget = Math.max(0, savedTime - CONTEXT_REWIND_SECONDS)
          engine.seek(seekTarget)
          setCurrentTime(seekTarget)
        }
        audioEl.addEventListener('canplay', handleCanPlayResume)
      }
      isResuming.current = false
    }

    // Load timing data (or encrypted text when encryption enabled)
    if (encryption.enabled && encryption.sessionKey) {
      // Encrypted path: fetch encrypted text, decrypt, then load timing
      usePlayerStore.getState().loadEncryptedText(slug, language)
    } else {
      // Standard path: load timing data from public JSON
      const chapterNumber = getChapterNumberFromSlug(slug)
      loadTimingData(chapterNumber, language, voice).then((data) => {
        setSentences(data)
        setCurrentSentenceIndex(-1)
      })
    }

    // Apply current speed
    engine.setSpeed(speed)

    // Sync language and voice refs
    prevLanguageRef.current = language
    prevVoiceRef.current = voice
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChapterSlug])

  // --- Language switch with position preservation ---
  useEffect(() => {
    // Skip if language hasn't actually changed (initial mount or chapter change handled above)
    if (language === prevLanguageRef.current) return
    prevLanguageRef.current = language

    const slug = currentChapterSlug
    if (!slug || !engineRef.current) return

    const engine = engineRef.current

    // Check if target language audio exists
    const chapter = CHAPTER_BY_SLUG.get(slug)
    if (!chapter) return

    const targetAudioFile =
      language === 'es' ? chapter.audioFileEs : chapter.audioFileEn
    if (!targetAudioFile) {
      // Revert language -- target audio doesn't exist
      const revertLang = language === 'es' ? 'en' : 'es'
      usePlayerStore.getState().setLanguage(revertLang)
      return
    }

    // 1. Save current position and playing state
    const savedTime = engine.getCurrentTime()
    const wasPlaying = engine.isAudioPlaying()

    // 2. Pause while switching (avoid audio glitch)
    if (wasPlaying) {
      pause()
    }

    // 3. Load new audio source (same voice, different language)
    const currentVoice = usePlayerStore.getState().voice
    engine.loadChapter(slug, language, currentVoice)

    // 4. Wait for canplay, then seek to saved position
    const audioEl = engine.getAudioElement()
    if (audioEl) {
      const handleCanPlay = () => {
        audioEl.removeEventListener('canplay', handleCanPlay)

        // Clamp savedTime to new duration (different language may have different length)
        const clampedTime =
          audioEl.duration && savedTime > audioEl.duration
            ? 0
            : savedTime
        engine.seek(clampedTime)
        setCurrentTime(clampedTime)

        // Resume playback if it was playing before
        if (wasPlaying) {
          usePlayerStore.getState().play()
        }
      }
      audioEl.addEventListener('canplay', handleCanPlay)
    }

    // 5. Load new timing data for the new language
    const chapterNumber = getChapterNumberFromSlug(slug)
    loadTimingData(chapterNumber, language, currentVoice).then((newSentences) => {
      setSentences(newSentences)
      // Update sentence index to match saved position
      const idx = findSentenceIndex(newSentences, savedTime)
      setCurrentSentenceIndex(idx)
    })

    // Apply current speed
    engine.setSpeed(speed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  // --- Voice switch with position preservation ---
  useEffect(() => {
    // Skip if voice hasn't actually changed
    if (voice === prevVoiceRef.current) return
    prevVoiceRef.current = voice

    const slug = currentChapterSlug
    if (!slug || !engineRef.current) return

    const engine = engineRef.current

    // 1. Save current position and playing state
    const savedTime = engine.getCurrentTime()
    const wasPlaying = engine.isAudioPlaying()

    // 2. Pause while switching
    if (wasPlaying) {
      pause()
    }

    // 3. Load new audio (same chapter + language, different voice)
    engine.loadChapter(slug, language, voice)

    // 4. Wait for canplay, then seek to saved position
    const audioEl = engine.getAudioElement()
    if (audioEl) {
      const handleCanPlay = () => {
        audioEl.removeEventListener('canplay', handleCanPlay)

        // Clamp savedTime to new duration (voice versions may differ in length)
        const clampedTime =
          audioEl.duration && savedTime > audioEl.duration
            ? 0
            : savedTime
        engine.seek(clampedTime)
        setCurrentTime(clampedTime)

        // Resume if was playing
        if (wasPlaying) {
          usePlayerStore.getState().play()
          engine.fadeInAndPlay()
        }
      }
      audioEl.addEventListener('canplay', handleCanPlay)
    }

    // 5. Reload timing data for new voice
    const chapterNumber = getChapterNumberFromSlug(slug)
    loadTimingData(chapterNumber, language, voice).then((data) => {
      setSentences(data)
      setCurrentSentenceIndex(-1)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice])

  // --- If navigated to a listen page with a different slug, load it ---
  // Uses loadedChapterRef instead of currentChapterSlug to avoid stale closure issues
  // that caused audio restart on back-navigation to the same chapter.
  useEffect(() => {
    if (chapterSlugFromPath && chapterSlugFromPath !== loadedChapterRef.current) {
      setChapter(chapterSlugFromPath)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterSlugFromPath])

  // --- Play/Pause wiring: store.isPlaying -> engine fade ---
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    if (isPlaying) {
      // fadeInAndPlay returns false if browser rejects (autoplay policy).
      // Revert store to prevent desync where UI shows "playing" but audio is paused.
      engine.fadeInAndPlay().then((ok) => {
        if (!ok) {
          pause()
        }
      })
    } else {
      engine.fadeAndPause()
    }
  }, [isPlaying, pause])

  // --- Apply speed changes to engine ---
  useEffect(() => {
    engineRef.current?.setSpeed(speed)
  }, [speed])

  // --- Pending seek: bookmark navigation seeks after chapter loads (BOOK-02) ---
  useEffect(() => {
    if (pendingSeekTime === null) return
    const engine = engineRef.current
    if (!engine) return

    const audioEl = engine.getAudioElement()
    if (audioEl && audioEl.readyState >= 2) {
      // Audio already loaded -- seek immediately
      engine.seek(pendingSeekTime)
      setCurrentTime(pendingSeekTime)
      setPendingSeek(null)
    } else if (audioEl) {
      // Wait for canplay then seek
      const handleCanPlaySeek = () => {
        audioEl.removeEventListener('canplay', handleCanPlaySeek)
        engine.seek(pendingSeekTime)
        setCurrentTime(pendingSeekTime)
        setPendingSeek(null)
      }
      audioEl.addEventListener('canplay', handleCanPlaySeek)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSeekTime])

  // --- rAF sync loop for precise sentence tracking (delegated to useAudioSync) ---
  useAudioSync(engineRef.current?.getAudioElement() ?? null)

  // --- Render mode ---

  // Look up the chapter theme for karaoke colors
  const theme = currentChapterSlug
    ? THEME_BY_SLUG.get(currentChapterSlug) ?? FALLBACK_THEME
    : FALLBACK_THEME

  // Seek handler for KaraokeDisplay tap-to-seek (SYNC-04)
  const handleKaraokeSeek = useCallback(
    (time: number) => {
      const engine = engineRef.current
      if (!engine) return
      engine.seek(time)
      setCurrentTime(time)
    },
    [setCurrentTime],
  )

  // Chapter selection handler: set chapter, close drawer, update URL
  const handleSelectChapter = useCallback(
    (slug: string) => {
      setChapter(slug)
      toggleChapterDrawer()
      // Update URL to match selected chapter
      window.history.replaceState(null, '', `/listen/${slug}`)
    },
    [setChapter, toggleChapterDrawer],
  )

  if (isListenPage) {
    // Full player mode: atmospheric zone with karaoke + control zone
    return (
      <div className="fixed inset-0 z-30 flex flex-col">
        {/* Atmospheric zone (~65%): karaoke text over chapter background */}
        <div className="relative flex-1 min-h-0">
          {/* Layer 1: Background image (lowest) -- falls back to stone texture if no chapter bg */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('${theme.bg || '/art/backgrounds/ui/stone-texture.webp?v=3'}')` }}
          />
          {/* Layer 2: Scene cycling with Ken Burns (above bg, below gradient) */}
          <SceneCycler
            scenes={theme.scenes}
            mood={theme.mood}
            encryptionToken={encryption.token}
          />
          {/* Layer 3: Color grading overlay (subtle mood tint) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: MOOD_TINTS[theme.mood] ?? MOOD_TINTS.fallback,
              mixBlendMode: 'overlay',
            }}
          />
          {/* Layer 4: Gradient overlay (ensures text readability) */}
          <div
            className="absolute inset-0"
            style={{ background: theme.gradient }}
          />
          {/* Layer 5: Glow effect */}
          <div
            className="absolute inset-0"
            style={{ background: theme.glow }}
          />
          {/* Layer 6: Karaoke display */}
          <div className="relative z-10 h-full">
            <KaraokeDisplay theme={theme} onSeek={handleKaraokeSeek} />
          </div>
          {/* Layer 7: Chapter context panel (top-right info overlay) */}
          {currentChapterSlug && (
            <ChapterContext chapterSlug={currentChapterSlug} />
          )}
        </div>

        {/* Control zone (~35%): player controls with panel background */}
        <div
          className="relative z-20 flex-shrink-0 flex flex-col justify-end pb-8 pt-4"
          style={{
            background: theme.panelBg,
            backdropFilter: 'blur(20px)',
            minHeight: '35vh',
          }}
        >
          <PlayerControls engine={engineRef.current} onToggleBookmarks={toggleBookmarkList} />
        </div>

        {/* Chapter drawer overlay */}
        <ChapterDrawer
          isOpen={isChapterDrawerOpen}
          onClose={toggleChapterDrawer}
          onSelectChapter={handleSelectChapter}
        />

        {/* Bookmark list overlay */}
        <BookmarkList
          isOpen={isBookmarkListOpen}
          onClose={() => setIsBookmarkListOpen(false)}
        />
      </div>
    )
  }

  // Mini player mode: only show if a chapter has been played
  if (!currentChapterSlug) return null

  return <MiniPlayer engine={engineRef.current} />
}
