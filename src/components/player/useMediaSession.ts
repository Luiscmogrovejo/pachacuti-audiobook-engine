// src/components/player/useMediaSession.ts -- Media Session API integration
// Sets lock screen metadata and registers play/pause/seek/skip handlers

import { useEffect } from 'react'
import { usePlayerStore } from './player-store'
import { CHAPTER_BY_SLUG } from '../../lib/data/chapters'
import { THEME_BY_SLUG } from '../../lib/data/themes'
import { getNextChapterSlug, getPrevChapterSlug } from '../../lib/data/timing'
import type { AudioEngine } from './AudioEngine'

/**
 * React hook that integrates with the Media Session API for lock screen
 * and Bluetooth headset controls.
 *
 * Sets metadata (title, artist, album, artwork) when chapter changes.
 * Registers action handlers for play, pause, seek, skip.
 * Updates position state on play/pause/seek/speed change.
 *
 * Guards against SSR with navigator checks.
 */
export function useMediaSession(engine: AudioEngine | null): void {
  const currentChapterSlug = usePlayerStore((s) => s.currentChapterSlug)
  const language = usePlayerStore((s) => s.language)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const duration = usePlayerStore((s) => s.duration)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const speed = usePlayerStore((s) => s.speed)
  const play = usePlayerStore((s) => s.play)
  const pause = usePlayerStore((s) => s.pause)
  const setChapter = usePlayerStore((s) => s.setChapter)

  // Set MediaMetadata when chapter or language changes
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    if (!('mediaSession' in navigator)) return
    if (!currentChapterSlug) return

    const chapter = CHAPTER_BY_SLUG.get(currentChapterSlug)
    if (!chapter) return

    const title =
      language === 'en' ? chapter.titleEn : chapter.title
    const theme = THEME_BY_SLUG.get(currentChapterSlug)

    // Use chapter background as artwork, fallback to prologue background
    const artworkSrc = theme?.bg ?? '/art/backgrounds/prologue-v2.webp'

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: 'Pachacuti',
      album: 'Book 1 - El Que Estremece la Tierra',
      artwork: [
        {
          src: artworkSrc,
          sizes: '512x512',
          type: 'image/webp',
        },
      ],
    })
  }, [currentChapterSlug, language])

  // Register action handlers
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    if (!('mediaSession' in navigator)) return
    if (!engine) return

    const handlers: Array<
      [MediaSessionAction, MediaSessionActionHandler]
    > = [
      ['play', () => play()],
      ['pause', () => pause()],
      [
        'seekbackward',
        (details) => {
          engine.skipBack(
            (details as MediaSessionActionDetails & { seekOffset?: number })
              .seekOffset ?? 15,
          )
        },
      ],
      [
        'seekforward',
        (details) => {
          engine.skipForward(
            (details as MediaSessionActionDetails & { seekOffset?: number })
              .seekOffset ?? 30,
          )
        },
      ],
      [
        'seekto',
        (details) => {
          const seekTime = (
            details as MediaSessionActionDetails & { seekTime?: number }
          ).seekTime
          if (seekTime != null) {
            engine.seek(seekTime)
          }
        },
      ],
      [
        'previoustrack',
        () => {
          if (!currentChapterSlug) return
          const prevSlug = getPrevChapterSlug(currentChapterSlug)
          if (prevSlug) {
            setChapter(prevSlug)
            window.history.replaceState(null, '', `/listen/${prevSlug}`)
          }
        },
      ],
      [
        'nexttrack',
        () => {
          if (!currentChapterSlug) return
          const nextSlug = getNextChapterSlug(currentChapterSlug)
          if (nextSlug) {
            setChapter(nextSlug)
            window.history.replaceState(null, '', `/listen/${nextSlug}`)
          }
        },
      ],
    ]

    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
        // Some actions may not be supported on all platforms
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null)
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }, [engine, currentChapterSlug, play, pause, setChapter])

  // Update position state when playback state changes
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    if (!('mediaSession' in navigator)) return
    if (!duration || duration <= 0) return

    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: speed,
        position: Math.min(currentTime, duration),
      })
    } catch {
      // setPositionState may throw if values are invalid
    }
  }, [isPlaying, duration, currentTime, speed])

  // Update playback state (playing/paused)
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    if (!('mediaSession' in navigator)) return

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])
}
