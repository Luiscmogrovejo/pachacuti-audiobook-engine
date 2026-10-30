// src/components/player/PlayerControls.tsx -- Main control zone (~35% of viewport)
// Play/pause/skip/speed + progress bar + chapter info (all in thumb zone)

import React, { useCallback } from 'react'
import { usePlayerStore } from './player-store'
import { CHAPTER_BY_SLUG, CHAPTERS } from '../../lib/data/chapters'
import { getNextChapterSlug, getPrevChapterSlug } from '../../lib/data/timing'
import { ProgressBar } from './ProgressBar'
import { SpeedButton } from './SpeedButton'
import { LanguageToggle } from './LanguageToggle'
import { VoiceToggle } from './VoiceToggle'
import { SleepTimer } from './SleepTimer'
import { BookmarkButton } from './BookmarkButton'
import { CopyrightNotice } from './CopyrightNotice'
import type { AudioEngine } from './AudioEngine'

interface PlayerControlsProps {
  engine: AudioEngine | null
  onToggleBookmarks?: () => void
}

// --- Inline SVG Icons (no icon library dependency) ---

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-8 h-8 ml-1"
      aria-hidden="true"
    >
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-8 h-8"
      aria-hidden="true"
    >
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  )
}

function SkipBackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-6 h-6"
      aria-hidden="true"
    >
      <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="bold"
        fill="currentColor"
      >
        15
      </text>
    </svg>
  )
}

function SkipForwardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-6 h-6"
      aria-hidden="true"
    >
      <path d="M12.01 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="bold"
        fill="currentColor"
      >
        30
      </text>
    </svg>
  )
}

// --- Chapter navigation icons ---

function PrevChapterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
    </svg>
  )
}

function NextChapterIcon() {
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

function ChapterListIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
    </svg>
  )
}

function BookmarkListIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      <path d="M9 10h6M9 14h4" />
    </svg>
  )
}

export function PlayerControls({ engine, onToggleBookmarks }: PlayerControlsProps) {
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentChapterSlug = usePlayerStore((s) => s.currentChapterSlug)
  const language = usePlayerStore((s) => s.language)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const setChapter = usePlayerStore((s) => s.setChapter)
  const toggleChapterDrawer = usePlayerStore((s) => s.toggleChapterDrawer)

  const chapter = currentChapterSlug
    ? CHAPTER_BY_SLUG.get(currentChapterSlug)
    : null

  const chapterLabel = chapter
    ? chapter.chapter === 0
      ? 'PROLOGUE'
      : `CHAPTER ${chapter.chapter}`
    : ''

  const chapterTitle = chapter
    ? language === 'en'
      ? chapter.titleEn
      : chapter.title
    : ''

  // Chapter navigation availability
  const prevSlug = currentChapterSlug
    ? getPrevChapterSlug(currentChapterSlug)
    : null
  const nextSlug = currentChapterSlug
    ? getNextChapterSlug(currentChapterSlug)
    : null

  const handleSkipBack = useCallback(() => {
    engine?.skipBack(15)
  }, [engine])

  const handleSkipForward = useCallback(() => {
    engine?.skipForward(30)
  }, [engine])

  const handlePrevChapter = useCallback(() => {
    if (prevSlug) {
      setChapter(prevSlug)
      window.history.replaceState(null, '', `/listen/${prevSlug}`)
    }
  }, [prevSlug, setChapter])

  const handleNextChapter = useCallback(() => {
    if (nextSlug) {
      setChapter(nextSlug)
      window.history.replaceState(null, '', `/listen/${nextSlug}`)
    }
  }, [nextSlug, setChapter])

  return (
    <div className="flex flex-col items-center w-full">
      {/* Chapter info bar -- tappable to open drawer */}
      <button
        type="button"
        onClick={toggleChapterDrawer}
        className="text-center mb-3 px-4 min-h-[44px] flex flex-col items-center justify-center cursor-pointer group"
        aria-label="Open chapter list"
      >
        <div className="flex items-center gap-1.5">
          <ChapterListIcon />
          <p className="text-xs font-heading text-text-dim uppercase tracking-widest group-hover:text-gold transition-colors">
            {chapterLabel} / {CHAPTERS.length}
          </p>
        </div>
        <h2 className="text-sm font-heading text-text-primary mt-0.5 truncate max-w-[280px] sm:max-w-[400px] group-hover:text-gold transition-colors">
          {chapterTitle}
        </h2>
      </button>

      {/* Progress bar / scrubber */}
      <ProgressBar engine={engine} />

      {/* Primary controls row */}
      <div className="flex items-center justify-center gap-4 mt-4">
        {/* Previous chapter */}
        {prevSlug ? (
          <button
            type="button"
            onClick={handlePrevChapter}
            className="w-11 h-11 flex items-center justify-center rounded-full text-text-secondary hover:text-gold transition-colors"
            aria-label="Previous chapter"
          >
            <PrevChapterIcon />
          </button>
        ) : (
          <div className="w-11 h-11" />
        )}

        {/* Skip back 15s */}
        <button
          type="button"
          onClick={handleSkipBack}
          className="w-11 h-11 flex items-center justify-center rounded-full text-text-secondary hover:text-gold transition-colors"
          aria-label="Skip back 15 seconds"
        >
          <SkipBackIcon />
        </button>

        {/* Play/Pause */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-16 h-16 flex items-center justify-center rounded-full transition-all ${
            isPlaying
              ? 'bg-gold text-volcanic hover:bg-gold-light'
              : 'bg-gold text-volcanic hover:bg-gold-light'
          }`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Skip forward 30s */}
        <button
          type="button"
          onClick={handleSkipForward}
          className="w-11 h-11 flex items-center justify-center rounded-full text-text-secondary hover:text-gold transition-colors"
          aria-label="Skip forward 30 seconds"
        >
          <SkipForwardIcon />
        </button>

        {/* Next chapter */}
        {nextSlug ? (
          <button
            type="button"
            onClick={handleNextChapter}
            className="w-11 h-11 flex items-center justify-center rounded-full text-text-secondary hover:text-gold transition-colors"
            aria-label="Next chapter"
          >
            <NextChapterIcon />
          </button>
        ) : (
          <div className="w-11 h-11" />
        )}
      </div>

      {/* Secondary controls row */}
      <div className="flex items-center justify-between w-full px-6 mt-4">
        <SpeedButton engine={engine} />
        <SleepTimer />
        <BookmarkButton />
        {onToggleBookmarks && (
          <button
            type="button"
            onClick={onToggleBookmarks}
            className="flex items-center justify-center w-11 h-11 min-h-[44px] rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Open bookmarks"
          >
            <BookmarkListIcon />
          </button>
        )}
        <VoiceToggle />
        <LanguageToggle />
      </div>

      {/* Copyright notice */}
      <CopyrightNotice />
    </div>
  )
}
