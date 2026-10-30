// src/components/player/KaraokeDisplay.tsx -- 3-line karaoke text sync display
// Shows previous / CURRENT / next sentence with CSS transitions
// Flexbox 3-slot layout (NOT scroll-snap) centered in the atmospheric zone
// Tap any sentence to seek audio to that position (SYNC-04)

import React from 'react'
import { usePlayerStore } from './player-store'
import type { ChapterTheme } from '../../lib/data/themes'

interface KaraokeDisplayProps {
  /** Per-chapter theme for text colors */
  theme: ChapterTheme
  /** Callback to seek audio to a given time in seconds */
  onSeek: (time: number) => void
}

export function KaraokeDisplay({ theme, onSeek }: KaraokeDisplayProps) {
  const sentences = usePlayerStore((s) => s.sentences)
  const currentSentenceIndex = usePlayerStore((s) => s.currentSentenceIndex)

  // --- No timing data fallback ---
  if (sentences.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-full px-4">
        <p
          className="text-base font-body italic text-center select-none"
          style={{ color: theme.textPrev, opacity: 0.5 }}
        >
          Timing data unavailable
        </p>
      </div>
    )
  }

  // Resolve the effective index: if between sentences (-1), keep last known
  // For initial state before playback starts, show first sentence as current
  const effectiveIndex =
    currentSentenceIndex >= 0 ? currentSentenceIndex : 0

  const prevSentence =
    effectiveIndex > 0 ? sentences[effectiveIndex - 1] : null
  const currentSentence = sentences[effectiveIndex] ?? null
  const nextSentence =
    effectiveIndex < sentences.length - 1
      ? sentences[effectiveIndex + 1]
      : null

  const handleSeek = (startTime: number) => {
    onSeek(startTime)
  }

  return (
    <div
      className="flex flex-col justify-center items-center h-full gap-6 overflow-hidden px-4 select-none"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      } as React.CSSProperties}
      data-testid="karaoke-text"
    >
      {/* Slot 1: Previous sentence */}
      <button
        type="button"
        className="text-center max-w-[85%] font-body text-base leading-relaxed cursor-pointer select-none transition-all duration-400 ease-in-out hover:opacity-40 focus:outline-none"
        style={{
          color: theme.textPrev,
          opacity: prevSentence ? 0.25 : 0,
          transform: prevSentence
            ? 'translateY(-0.5rem)'
            : 'translateY(-1rem)',
          transition: 'opacity 400ms ease, transform 400ms ease',
          minHeight: '1.5em',
        }}
        onClick={() => prevSentence && handleSeek(prevSentence.start)}
        data-start-time={prevSentence?.start}
        aria-label={
          prevSentence ? `Seek to: ${prevSentence.text}` : undefined
        }
        disabled={!prevSentence}
      >
        {prevSentence?.text ?? '\u00A0'}
      </button>

      {/* Slot 2: Current sentence (highlighted, aria-live for screen readers) */}
      <button
        type="button"
        className="text-center max-w-[85%] font-body text-xl font-semibold leading-relaxed cursor-pointer select-none transition-all duration-400 ease-in-out hover:opacity-80 focus:outline-none"
        aria-live="polite"
        style={{
          color: theme.textActive,
          opacity: currentSentence ? 1 : 0,
          textShadow: '0 2px 8px rgba(0,0,0,0.6)',
          letterSpacing: '0.02em',
          transition: 'opacity 400ms ease, transform 400ms ease',
        }}
        onClick={() => currentSentence && handleSeek(currentSentence.start)}
        data-start-time={currentSentence?.start}
        aria-label={
          currentSentence
            ? `Current: ${currentSentence.text}`
            : undefined
        }
        disabled={!currentSentence}
      >
        {currentSentence?.text ?? '\u00A0'}
      </button>

      {/* Slot 3: Next sentence */}
      <button
        type="button"
        className="text-center max-w-[85%] font-body text-base leading-relaxed cursor-pointer select-none transition-all duration-400 ease-in-out hover:opacity-30 focus:outline-none"
        style={{
          color: theme.textNext,
          opacity: nextSentence ? 0.15 : 0,
          transform: nextSentence
            ? 'translateY(0.5rem)'
            : 'translateY(1rem)',
          transition: 'opacity 400ms ease, transform 400ms ease',
          minHeight: '1.5em',
        }}
        onClick={() => nextSentence && handleSeek(nextSentence.start)}
        data-start-time={nextSentence?.start}
        aria-label={
          nextSentence ? `Seek to: ${nextSentence.text}` : undefined
        }
        disabled={!nextSentence}
      >
        {nextSentence?.text ?? '\u00A0'}
      </button>
    </div>
  )
}
