// src/components/player/ProgressBadge.tsx -- "Chapter X of 24" progress visualization (PROG-04)
// Shows overall listening progress as a compact badge with a horizontal progress bar

import React from 'react'
import { usePlayerStore } from './player-store'
import { CHAPTER_BY_SLUG, CHAPTERS } from '../../lib/data/chapters'

/**
 * ProgressBadge shows the listener's overall journey progress.
 * Displays "Chapter X of 24" with a thin gold progress bar underneath.
 * Returns "Start your journey" with a 0% bar for first-time visitors.
 */
export function ProgressBadge() {
  const currentChapterSlug = usePlayerStore((s) => s.currentChapterSlug)

  let progressText: string
  let progressPercent: number

  if (currentChapterSlug) {
    const chapter = CHAPTER_BY_SLUG.get(currentChapterSlug)
    if (chapter) {
      const label =
        chapter.chapter === 0 ? 'Prologue' : `Chapter ${chapter.chapter}`
      progressText = `${label} of ${CHAPTERS.length}`
      progressPercent = ((chapter.chapter + 1) / CHAPTERS.length) * 100
    } else {
      progressText = 'Start your journey'
      progressPercent = 0
    }
  } else {
    progressText = 'Start your journey'
    progressPercent = 0
  }

  return (
    <div className="w-full max-w-md mx-auto mt-3">
      <p className="text-xs font-heading text-text-secondary text-center tracking-wide">
        {progressText}
      </p>
      {/* Progress bar track */}
      <div className="mt-2 h-1 w-full rounded-full bg-stone/50 overflow-hidden">
        {/* Gold fill */}
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}
