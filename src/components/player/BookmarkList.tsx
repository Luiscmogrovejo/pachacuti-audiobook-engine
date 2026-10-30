// src/components/player/BookmarkList.tsx -- Browsable bookmark list overlay (BOOK-02)
// Modal/drawer overlay similar to ChapterDrawer, shows all bookmarks sorted newest-first

import React, { useCallback } from 'react'
import { usePlayerStore } from './player-store'
import { CHAPTER_BY_SLUG } from '../../lib/data/chapters'
import { formatTime } from './ProgressBar'

interface BookmarkListProps {
  isOpen: boolean
  onClose: () => void
}

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

function DeleteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

export function BookmarkList({ isOpen, onClose }: BookmarkListProps) {
  const bookmarks = usePlayerStore((s) => s.bookmarks)
  const removeBookmark = usePlayerStore((s) => s.removeBookmark)
  const setChapter = usePlayerStore((s) => s.setChapter)
  const setLanguage = usePlayerStore((s) => s.setLanguage)
  const setPendingSeek = usePlayerStore((s) => s.setPendingSeek)
  const currentChapterSlug = usePlayerStore((s) => s.currentChapterSlug)

  // Sort bookmarks by createdAt descending (newest first)
  const sorted = [...bookmarks].sort((a, b) => b.createdAt - a.createdAt)

  const handleNavigate = useCallback(
    (chapterSlug: string, language: 'es' | 'en', time: number) => {
      // If same chapter, just set pending seek
      if (chapterSlug === currentChapterSlug) {
        setPendingSeek(time)
      } else {
        // Set language and chapter, then pending seek (engine loads after chapter change)
        setLanguage(language)
        setChapter(chapterSlug)
        setPendingSeek(time)
        // Update URL
        window.history.replaceState(null, '', `/listen/${chapterSlug}`)
      }
      onClose()
    },
    [currentChapterSlug, setChapter, setLanguage, setPendingSeek, onClose],
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation() // prevent navigation
      removeBookmark(id)
    },
    [removeBookmark],
  )

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

      {/* Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-60 flex flex-col rounded-t-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          height: '60vh',
          background:
            'linear-gradient(180deg, rgba(18,12,8,0.98) 0%, rgba(10,6,4,0.99) 100%)',
          backdropFilter: 'blur(20px)',
        }}
        role="dialog"
        aria-label="Bookmarks"
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
              Bookmarks
            </h2>
            <p className="text-xs text-text-dim mt-0.5">
              {bookmarks.length} saved
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close bookmarks"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Scrollable bookmark list */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-8 text-center">
              <p className="text-sm text-text-dim">
                No bookmarks yet. Tap the bookmark icon while listening to save
                your place.
              </p>
            </div>
          ) : (
            sorted.map((bm) => {
              const chapter = CHAPTER_BY_SLUG.get(bm.chapterSlug)
              const chapterTitle = chapter
                ? bm.language === 'en'
                  ? chapter.titleEn
                  : chapter.title
                : bm.chapterSlug

              return (
                <button
                  key={bm.id}
                  type="button"
                  onClick={() =>
                    handleNavigate(bm.chapterSlug, bm.language, bm.time)
                  }
                  className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-stone/10 transition-colors"
                >
                  {/* Bookmark info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">
                      {chapterTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-text-dim tabular-nums">
                        {formatTime(bm.time)}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-stone/30 text-text-dim">
                        {bm.language.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-text-dim italic mt-0.5 truncate">
                      {bm.label}
                    </p>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, bm.id)}
                    className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-text-dim hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    aria-label={`Delete bookmark: ${bm.label}`}
                  >
                    <DeleteIcon />
                  </button>
                </button>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
