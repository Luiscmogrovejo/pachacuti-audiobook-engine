// src/components/player/BookmarkButton.tsx -- One-tap bookmark at current position (BOOK-01)
// Gold flash feedback on save, 44px touch target

import React, { useState, useCallback } from 'react'
import { usePlayerStore } from './player-store'

function BookmarkIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export function BookmarkButton() {
  const [flash, setFlash] = useState(false)
  const addBookmark = usePlayerStore((s) => s.addBookmark)
  const currentChapterSlug = usePlayerStore((s) => s.currentChapterSlug)

  const handleClick = useCallback(() => {
    if (!currentChapterSlug) return

    addBookmark()

    // Gold flash feedback for 300ms
    setFlash(true)
    setTimeout(() => setFlash(false), 300)
  }, [addBookmark, currentChapterSlug])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center justify-center w-11 h-11 min-h-[44px] rounded-lg transition-colors ${
        flash
          ? 'text-gold scale-110'
          : 'text-text-secondary hover:text-text-primary'
      }`}
      style={{
        transition: 'color 0.15s, transform 0.15s',
      }}
      aria-label="Add bookmark"
    >
      <BookmarkIcon filled={flash} />
    </button>
  )
}
