// src/components/player/ChapterContext.tsx -- collapsible chapter info panel
// Shows POV character, region, mood, chapter title over the scene layer.
// Top-right on desktop, full-width bottom on mobile (above controls).

import React, { useState, useEffect } from 'react'
import { CHAPTER_BY_SLUG } from '../../lib/data/chapters'
import { CHARACTERS } from '../../lib/data/characters'
import { THEME_BY_SLUG } from '../../lib/data/themes'

/** Format region slug to display name: "coast-paracas" -> "Coast Paracas" */
function formatRegion(region: string): string {
  return region
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Mood badge color map */
const MOOD_COLORS: Record<string, string> = {
  volcanic: 'rgba(232,82,42,0.3)',
  warm: 'rgba(212,168,67,0.3)',
  dark: 'rgba(40,40,80,0.4)',
  fire: 'rgba(255,120,30,0.3)',
  cold: 'rgba(100,140,200,0.3)',
  coastal: 'rgba(60,120,180,0.3)',
  golden: 'rgba(220,160,40,0.3)',
  mountain: 'rgba(180,200,220,0.3)',
  stone: 'rgba(100,90,75,0.3)',
  tropical: 'rgba(45,122,58,0.3)',
  fallback: 'rgba(100,100,100,0.3)',
}

interface ChapterContextProps {
  chapterSlug: string
}

export function ChapterContext({ chapterSlug }: ChapterContextProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Auto-collapse on chapter change
  useEffect(() => {
    setIsExpanded(false)
  }, [chapterSlug])

  // Look up data
  const chapter = CHAPTER_BY_SLUG.get(chapterSlug)
  if (!chapter) return null

  const povCharacter = CHARACTERS.find((c) => c.id === chapter.pov)
  const theme = THEME_BY_SLUG.get(chapterSlug)
  const mood = theme?.mood ?? 'fallback'
  const moodColor = MOOD_COLORS[mood] ?? MOOD_COLORS.fallback

  const chapterLabel =
    chapter.chapter === 0
      ? 'Prologue'
      : `Chapter ${chapter.chapter}`

  return (
    <div className="absolute top-4 right-4 z-20 md:top-4 md:right-4">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-label="Chapter information"
        className="flex items-center justify-center w-7 h-7 rounded-full
          bg-black/50 backdrop-blur-sm border border-white/10
          text-text-secondary hover:text-text-primary hover:bg-black/70
          transition-colors duration-200"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Expandable panel */}
      <div
        className={`
          absolute top-10 right-0
          max-w-[240px] w-max
          bg-black/70 backdrop-blur-sm rounded-lg p-4
          border border-white/10
          transition-all duration-300 origin-top-right
          ${isExpanded ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
        `}
      >
        {/* Chapter label */}
        <p className="text-gold text-xs uppercase tracking-wider font-heading">
          {chapterLabel}
        </p>

        {/* Chapter title */}
        <p className="font-heading text-sm text-text-primary mt-1 leading-tight">
          {chapter.title}
        </p>

        {/* Divider */}
        <div className="h-px bg-gold/20 my-3" />

        {/* POV Character */}
        {povCharacter && (
          <div className="flex items-center gap-2 mb-2">
            {/* Portrait circle or initial fallback */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border"
              style={{
                borderColor: povCharacter.accent,
                backgroundColor: `${povCharacter.accent}20`,
                color: povCharacter.accent,
              }}
            >
              {povCharacter.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-text-secondary text-[10px] uppercase tracking-wider">
                Narrado por
              </p>
              <p className="text-text-primary text-xs truncate">
                {povCharacter.name.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
              </p>
            </div>
          </div>
        )}

        {/* Multi-POV fallback */}
        {chapter.pov === 'multi' && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border border-gold/40 bg-gold/10 text-gold">
              M
            </div>
            <div className="min-w-0">
              <p className="text-text-secondary text-[10px] uppercase tracking-wider">
                Narrado por
              </p>
              <p className="text-text-primary text-xs">
                Multiple POVs
              </p>
            </div>
          </div>
        )}

        {/* Region */}
        <div className="mb-2">
          <p className="text-text-secondary text-[10px] uppercase tracking-wider">
            Region
          </p>
          <p className="text-text-primary text-xs">
            {formatRegion(chapter.region)}
          </p>
        </div>

        {/* Mood badge */}
        <div>
          <span
            className="inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider text-text-primary"
            style={{ backgroundColor: moodColor }}
          >
            {mood}
          </span>
        </div>
      </div>
    </div>
  )
}
