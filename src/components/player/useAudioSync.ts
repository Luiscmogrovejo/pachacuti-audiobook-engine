// src/components/player/useAudioSync.ts -- rAF-based sentence tracking for karaoke display
// Runs a requestAnimationFrame loop at 60Hz while audio is playing.
// Reads audio.currentTime directly from the HTMLAudioElement for precision.
// Updates store.currentSentenceIndex when the active sentence changes.
// Throttles store.currentTime updates to ~15Hz to avoid React render churn.

import { useEffect, useRef, useCallback } from 'react'
import { usePlayerStore } from './player-store'
import { findSentenceIndex } from '../../lib/data/timing'

/** Minimum delta (ms) between currentTime store updates (~15Hz = 66ms) */
const TIME_UPDATE_THROTTLE_MS = 66

/**
 * Hook that runs a requestAnimationFrame loop while audio is playing,
 * keeping the store's currentSentenceIndex and currentTime in sync
 * with the HTMLAudioElement's actual playback position.
 *
 * @param audioElement - The raw HTMLAudioElement (null if not yet created)
 */
export function useAudioSync(audioElement: HTMLAudioElement | null): void {
  const rafIdRef = useRef<number | null>(null)
  const lastTimeUpdateRef = useRef<number>(0)
  /** Track last known non-negative sentence index to avoid snapping to -1 during gaps */
  const lastKnownIdxRef = useRef<number>(0)

  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const setCurrentSentenceIndex = usePlayerStore(
    (s) => s.setCurrentSentenceIndex,
  )
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime)

  const syncLoop = useCallback(() => {
    // Guard: skip frame if audio element is null (not loaded yet)
    if (!audioElement) {
      rafIdRef.current = requestAnimationFrame(syncLoop)
      return
    }

    const currentTime = audioElement.currentTime
    const now = performance.now()

    // Update sentence index on every frame (O(log n) binary search is negligible)
    const sentences = usePlayerStore.getState().sentences
    if (sentences.length > 0) {
      const rawIdx = findSentenceIndex(sentences, currentTime)
      let idx: number

      if (rawIdx >= 0) {
        // Valid sentence found -- update last known index
        lastKnownIdxRef.current = rawIdx
        idx = rawIdx
      } else if (currentTime > 0) {
        // In a gap between sentences (or past last sentence) -- keep last known
        idx = lastKnownIdxRef.current
      } else {
        // Truly before playback (currentTime <= 0) -- show first sentence
        idx = 0
      }

      const currentIdx = usePlayerStore.getState().currentSentenceIndex
      if (idx !== currentIdx) {
        setCurrentSentenceIndex(idx)
      }
    }

    // Throttle currentTime updates to ~15Hz to avoid React render churn
    if (now - lastTimeUpdateRef.current > TIME_UPDATE_THROTTLE_MS) {
      setCurrentTime(currentTime)
      lastTimeUpdateRef.current = now
    }

    rafIdRef.current = requestAnimationFrame(syncLoop)
  }, [audioElement, setCurrentSentenceIndex, setCurrentTime])

  // Start/stop rAF loop based on isPlaying
  useEffect(() => {
    if (isPlaying) {
      lastTimeUpdateRef.current = performance.now()
      rafIdRef.current = requestAnimationFrame(syncLoop)
    } else {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [isPlaying, syncLoop])
}
