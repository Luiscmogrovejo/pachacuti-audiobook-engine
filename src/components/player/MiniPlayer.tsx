// src/components/player/MiniPlayer.tsx -- Compact bottom bar for non-listen pages
// Shows chapter title, play/pause, next chapter, and a thin progress line
// Tapping the bar navigates back to the full player at /listen/{slug}

import React from 'react'
import { usePlayerStore } from './player-store'
import { CHAPTER_BY_SLUG, CHAPTERS } from '../../lib/data/chapters'
import { THEME_BY_SLUG } from '../../lib/data/themes'
import type { AudioEngine } from './AudioEngine'

interface MiniPlayerProps {
  engine: AudioEngine | null
}

// --- Inline SVG Icons (same style as PlayerControls) ---

function MiniPlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5 ml-0.5"
      aria-hidden="true"
    >
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  )
}

function MiniPauseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  )
}

function MiniNextIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  )
}

export function MiniPlayer({ engine }: MiniPlayerProps) {
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentChapterSlug = usePlayerStore((s) => s.currentChapterSlug)
  const language = usePlayerStore((s) => s.language)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const setChapter = usePlayerStore((s) => s.setChapter)

  // Don't render if no chapter has been played
  if (!currentChapterSlug) return null

  const chapter = CHAPTER_BY_SLUG.get(currentChapterSlug)
  if (!chapter) return null

  const theme = THEME_BY_SLUG.get(currentChapterSlug)
  const chapterTitle = language === 'en' ? chapter.titleEn : chapter.title
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Scene thumbnail: use first scene image from theme, or null
  const thumbnailSrc = theme?.scenes?.[0] ?? null

  // Next chapter logic
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    const idx = CHAPTERS.findIndex((ch) => ch.slug === currentChapterSlug)
    if (idx >= 0 && idx < CHAPTERS.length - 1) {
      const next = CHAPTERS[idx + 1]
      const hasAudio = language === 'es' ? next.audioFileEs : next.audioFileEn
      if (hasAudio) {
        setChapter(next.slug)
      }
    }
  }

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    togglePlay()
  }

  const handleBarClick = () => {
    window.location.href = `/listen/${currentChapterSlug}`
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 cursor-pointer"
      onClick={handleBarClick}
      role="complementary"
      aria-label="Mini player"
    >
      {/* Progress line at top of bar */}
      <div className="w-full h-[3px] bg-stone/30">
        <div
          className="h-full bg-gold transition-[width] duration-150 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main bar content */}
      <div className="flex items-center gap-3 px-3 py-2 bg-volcanic/95 backdrop-blur-sm pb-safe"
        style={{ minHeight: '64px' }}
      >
        {/* Chapter thumbnail */}
        <div className="w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-gradient-to-br from-gold/30 to-gold/10">
          {thumbnailSrc ? (
            <img
              src={thumbnailSrc}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gold/40 to-gold/10" />
          )}
        </div>

        {/* Chapter info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-heading text-text-primary truncate">
            {chapterTitle}
          </p>
          <p className="text-xs font-body text-text-dim truncate">
            Pachacuti
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Play/Pause */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className="w-11 h-11 flex items-center justify-center rounded-full text-text-primary hover:text-gold transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <MiniPauseIcon /> : <MiniPlayIcon />}
          </button>

          {/* Next chapter */}
          <button
            type="button"
            onClick={handleNext}
            className="w-11 h-11 flex items-center justify-center rounded-full text-text-secondary hover:text-gold transition-colors"
            aria-label="Next chapter"
          >
            <MiniNextIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
