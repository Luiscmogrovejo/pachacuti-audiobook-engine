// src/components/player/ChapterDrawer.tsx -- Slide-up drawer showing all 24 chapters
// Gold border + NOW PLAYING badge on current chapter, scene thumbnails, first-line previews
// Chapters without audio show "Coming soon" and are non-playable

import React, { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from './player-store'
import { CHAPTERS } from '../../lib/data/chapters'
import { CHAPTER_THEMES } from '../../lib/data/themes'
import {
  getChapterFirstLine,
  getChapterNumberFromSlug,
  estimateDuration,
  loadTimingData,
} from '../../lib/data/timing'
import { useSession } from '../../lib/auth/client'

interface ChapterDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSelectChapter: (slug: string) => void
}

/** Format seconds into MM:SS */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// --- Inline SVG Icons ---

function CloseIcon() {
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
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-3.5 h-3.5"
      aria-hidden="true"
    >
      <path d="M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm3 10H9V7c0-1.66 1.34-3 3-3s3 1.34 3 3v5z" />
    </svg>
  )
}

function CrownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="#d4a843"
      className="w-3.5 h-3.5"
      aria-hidden="true"
    >
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
    </svg>
  )
}

interface ChapterPreview {
  firstLine: string | null
  duration: number
}

export function ChapterDrawer({
  isOpen,
  onClose,
  onSelectChapter,
}: ChapterDrawerProps) {
  const currentChapterSlug = usePlayerStore((s) => s.currentChapterSlug)
  const language = usePlayerStore((s) => s.language)
  const currentRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const { data: sessionData } = useSession()
  const isAuthenticated = !!sessionData?.session
  const [previews, setPreviews] = useState<Map<string, ChapterPreview>>(
    new Map(),
  )

  // Load first-line previews + durations for all chapters with audio
  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    async function loadPreviews() {
      const entries: Array<[string, ChapterPreview]> = []

      for (const ch of CHAPTERS) {
        const hasAudio =
          language === 'es' ? ch.audioFileEs : ch.audioFileEn
        if (!hasAudio) continue

        const chNum = getChapterNumberFromSlug(ch.slug)
        const [firstLine, sentences] = await Promise.all([
          getChapterFirstLine(chNum, language),
          loadTimingData(chNum, language),
        ])

        if (cancelled) return

        entries.push([
          ch.slug,
          {
            firstLine,
            duration: estimateDuration(sentences),
          },
        ])
      }

      if (!cancelled) {
        setPreviews(new Map(entries))
      }
    }

    loadPreviews()

    return () => {
      cancelled = true
    }
  }, [isOpen, language])

  // Auto-scroll to current chapter on open
  useEffect(() => {
    if (isOpen && currentRef.current) {
      // Small delay to let the transition start before scrolling
      const timer = setTimeout(() => {
        currentRef.current?.scrollIntoView({
          block: 'center',
          behavior: 'smooth',
        })
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isOpen, currentChapterSlug])

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-[59] transition-opacity duration-300 ${
          isOpen
            ? 'bg-black/60 pointer-events-auto'
            : 'bg-black/0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-60 flex flex-col rounded-t-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          height: '75vh',
          background:
            'linear-gradient(180deg, rgba(18,12,8,0.98) 0%, rgba(10,6,4,0.99) 100%)',
          backdropFilter: 'blur(20px)',
        }}
        role="dialog"
        aria-label="Chapter list"
        aria-modal={isOpen}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-0">
          <div className="w-10 h-1 rounded-full bg-stone/40" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-stone/20">
          <div>
            <h2 className="text-lg font-heading text-text-primary">
              Chapters
            </h2>
            <p className="text-xs text-text-dim mt-0.5">
              {CHAPTERS.length} Chapters
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close chapter list"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Scrollable chapter list */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto overscroll-contain pb-safe"
        >
          {CHAPTERS.map((ch, idx) => {
            const isCurrent = ch.slug === currentChapterSlug
            const hasAudio =
              language === 'es' ? ch.audioFileEs : ch.audioFileEn
            const theme = CHAPTER_THEMES[idx]
            const thumbnailSrc = theme?.scenes?.[0] ?? null
            const preview = previews.get(ch.slug)
            const chapterTitle =
              language === 'en' ? ch.titleEn : ch.title
            const chapterLabel =
              ch.chapter === 0
                ? 'PROLOGUE'
                : `CHAPTER ${ch.chapter}`

            return (
              <button
                key={ch.slug}
                ref={isCurrent ? currentRef : undefined}
                type="button"
                onClick={() => {
                  if (hasAudio) {
                    onSelectChapter(ch.slug)
                  }
                }}
                disabled={!hasAudio}
                className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                  isCurrent
                    ? 'border-l-4 border-gold bg-gold/5'
                    : 'border-l-4 border-transparent'
                } ${
                  hasAudio
                    ? 'hover:bg-stone/10 cursor-pointer'
                    : 'opacity-50 cursor-default'
                }`}
                aria-current={isCurrent ? 'true' : undefined}
              >
                {/* Scene thumbnail */}
                <div className="w-10 h-10 flex-shrink-0 rounded-md overflow-hidden bg-gradient-to-br from-gold/20 to-gold/5">
                  {thumbnailSrc ? (
                    <img
                      src={thumbnailSrc}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-stone/30 to-stone/10" />
                  )}
                </div>

                {/* Chapter info (center) */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-heading text-text-dim uppercase tracking-widest">
                      {chapterLabel}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-gold text-volcanic">
                        NOW PLAYING
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm truncate mt-0.5 ${
                      isCurrent
                        ? 'font-bold text-text-primary'
                        : 'text-text-primary'
                    }`}
                  >
                    {chapterTitle}
                  </p>
                  {preview?.firstLine && hasAudio && (
                    <p className="text-xs text-text-dim italic truncate mt-0.5">
                      {preview.firstLine}
                    </p>
                  )}
                </div>

                {/* Right: tier badge + duration or Coming soon */}
                <div className="flex-shrink-0 text-right flex flex-col items-end gap-0.5">
                  {/* Tier badges for gated chapters */}
                  {ch.tier === 'signup' && !isAuthenticated && (
                    <span className="flex items-center gap-1 text-[10px] text-text-dim">
                      <LockIcon />
                      <span>Sign up</span>
                    </span>
                  )}
                  {ch.tier === 'paid' && (
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: '#d4a843' }}>
                      <CrownIcon />
                      <span>Premium</span>
                    </span>
                  )}
                  {/* Duration or Coming soon */}
                  {hasAudio ? (
                    preview && preview.duration > 0 ? (
                      <span className="text-xs text-text-dim tabular-nums">
                        {formatDuration(preview.duration)}
                      </span>
                    ) : null
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-text-dim">
                      <LockIcon />
                      <span>Coming soon</span>
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
