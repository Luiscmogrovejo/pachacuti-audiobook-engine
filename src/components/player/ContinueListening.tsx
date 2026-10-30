// src/components/player/ContinueListening.tsx -- "Continue Listening" CTA for return visitors
// Reads persisted chapter/position from Zustand store and links back to the player (PROG-03)
// Cross-device sync: also checks server progress when authenticated (PROG-05)

import React, { useEffect, useState } from 'react'
import { usePlayerStore } from './player-store'
import { CHAPTER_BY_SLUG } from '../../lib/data/chapters'
import { formatTime } from './ProgressBar'
import { useSession } from '../../lib/auth/client'
import { useLanguage } from '../../lib/i18n/useLanguage'

interface ServerProgress {
  chapterSlug: string
  language: string
  currentTime: number
  speed: string
  updatedAt: string
}

/**
 * ContinueListening renders a prominent CTA card when the listener has a saved position.
 * Returns null for first-time visitors (no saved chapter).
 * When authenticated, fetches server-side progress and uses whichever is more recent.
 * Rendered as a React island with client:load on the homepage.
 */
export function ContinueListening() {
  const currentChapterSlug = usePlayerStore((s) => s.currentChapterSlug)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const language = usePlayerStore((s) => s.language)
  const { data: sessionData } = useSession()
  const isAuthenticated = !!sessionData?.session
  const { t } = useLanguage()

  // Server-side progress (cross-device sync)
  const [serverProgress, setServerProgress] = useState<ServerProgress | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return

    fetch('/api/progress/load')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.progress?.length) return

        // Find the most recently updated entry
        const sorted = [...data.progress].sort(
          (a: ServerProgress, b: ServerProgress) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        setServerProgress(sorted[0])
      })
      .catch(() => {}) // Non-blocking
  }, [isAuthenticated])

  // Determine which progress to show: server or local (whichever has more progress)
  let displaySlug = currentChapterSlug
  let displayTime = currentTime
  let displayLanguage = language

  if (serverProgress && serverProgress.currentTime > 0) {
    // If server has a different chapter or more time in the same chapter, prefer server
    if (!currentChapterSlug || currentTime < 1) {
      // No local progress -- use server
      displaySlug = serverProgress.chapterSlug
      displayTime = serverProgress.currentTime
      displayLanguage = serverProgress.language as 'es' | 'en'
    } else if (
      serverProgress.chapterSlug === currentChapterSlug &&
      serverProgress.currentTime > currentTime
    ) {
      // Same chapter, server is further ahead
      displayTime = serverProgress.currentTime
    }
  }

  // Nothing to continue: first-time visitor or position at zero
  if (!displaySlug || displayTime < 1) return null

  const chapter = CHAPTER_BY_SLUG.get(displaySlug)
  if (!chapter) return null

  const chapterTitle = displayLanguage === 'en' ? chapter.titleEn : chapter.title
  const chapterLabel =
    chapter.chapter === 0 ? 'Prologue' : `Chapter ${chapter.chapter}`
  const timeFormatted = formatTime(displayTime)

  return (
    <div className="w-full max-w-md mx-auto rounded-xl border border-gold/30 bg-volcanic-light/60 backdrop-blur-sm p-5 shadow-lg shadow-gold/5">
      {/* Chapter info */}
      <p className="text-xs font-heading text-gold uppercase tracking-widest mb-1">
        {chapterLabel}
      </p>
      <h3 className="text-lg font-heading text-text-primary leading-snug truncate">
        {chapterTitle}
      </h3>
      <p className="text-sm text-text-secondary mt-1">
        {timeFormatted} {t('continue.into')} {chapterLabel}
      </p>

      {/* CTA button */}
      <a
        href={`/listen/${displaySlug}`}
        className="mt-4 flex items-center justify-center w-full h-12 min-h-[48px] rounded-lg bg-gold text-volcanic font-heading font-bold text-sm uppercase tracking-wider hover:bg-gold-light transition-colors"
      >
        {t('hero.cta.continue')}
      </a>
    </div>
  )
}
