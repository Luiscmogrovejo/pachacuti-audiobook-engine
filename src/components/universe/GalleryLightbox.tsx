// src/components/universe/GalleryLightbox.tsx -- Fullscreen lightbox for gallery page
// Opens on 'gallery:open' CustomEvent, navigates with arrow keys, closes on Escape/backdrop.
// Copy protection: blocks context menu and drag on lightbox images.

import React, { useEffect, useState, useCallback } from 'react'

interface LightboxScene {
  id: string
  chapter: number
  imagePath: string
  description: string
}

interface GalleryLightboxProps {
  scenes: LightboxScene[]
}

export function GalleryLightbox({ scenes }: GalleryLightboxProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const isOpen = openIndex !== null

  const close = useCallback(() => setOpenIndex(null), [])

  const goNext = useCallback(() => {
    setOpenIndex(prev => {
      if (prev === null) return null
      return prev < scenes.length - 1 ? prev + 1 : prev
    })
  }, [scenes.length])

  const goPrev = useCallback(() => {
    setOpenIndex(prev => {
      if (prev === null) return null
      return prev > 0 ? prev - 1 : prev
    })
  }, [])

  // Listen for gallery:open custom event from Astro page
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (typeof detail?.index === 'number') {
        setOpenIndex(detail.index)
      }
    }
    document.addEventListener('gallery:open', handler)
    return () => document.removeEventListener('gallery:open', handler)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          close()
          break
        case 'ArrowLeft':
          e.preventDefault()
          goPrev()
          break
        case 'ArrowRight':
          e.preventDefault()
          goNext()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close, goNext, goPrev])

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen || openIndex === null) return null

  const scene = scenes[openIndex]
  if (!scene) return null

  return (
    <div
      data-testid="gallery-lightbox"
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={(e) => {
        // Close on backdrop click (not on image or controls)
        if (e.target === e.currentTarget) close()
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Close button */}
      <button
        onClick={close}
        className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl z-10 w-12 h-12 flex items-center justify-center"
        aria-label="Close lightbox"
      >
        &times;
      </button>

      {/* Previous arrow */}
      {openIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            goPrev()
          }}
          className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-4xl md:text-5xl z-10 w-12 h-12 flex items-center justify-center"
          aria-label="Previous image"
        >
          &#8249;
        </button>
      )}

      {/* Next arrow */}
      {openIndex < scenes.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            goNext()
          }}
          className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-4xl md:text-5xl z-10 w-12 h-12 flex items-center justify-center"
          aria-label="Next image"
        >
          &#8250;
        </button>
      )}

      {/* Image with diagonal watermark */}
      <div className="max-w-4xl max-h-[80vh] mx-4 flex flex-col items-center">
        <div className="relative">
          <img
            data-testid="gallery-lightbox-image"
            src={scene.imagePath}
            alt={scene.description}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            className="max-w-full max-h-[75vh] object-contain rounded-lg select-none pointer-events-none"
            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
          />
          {/* Diagonal watermark overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            style={{ zIndex: 10 }}
          >
            <span
              style={{
                transform: 'rotate(-35deg)',
                fontFamily: "'Cinzel Decorative', serif",
                fontSize: 'clamp(2rem, 6vw, 4rem)',
                color: 'rgba(212, 168, 67, 0.15)',
                letterSpacing: '0.3em',
                textTransform: 'uppercase' as const,
                whiteSpace: 'nowrap' as const,
                userSelect: 'none' as const,
              }}
            >
              PACHACUTI
            </span>
          </div>
          {/* Click-blocking overlay */}
          <div className="absolute inset-0 z-20" onContextMenu={(e) => e.preventDefault()} />
        </div>

        {/* Scene description */}
        <p
          className="text-text-secondary/80 text-sm mt-3 text-center max-w-xl"
          style={{ fontFamily: "'Crimson Text', serif" }}
        >
          {scene.description}
        </p>

        {/* Copyright notice */}
        <p
          className="text-text-dim/40 text-xs mt-2 select-none"
          style={{ fontFamily: "'Crimson Text', serif" }}
        >
          Pachacuti &mdash; All rights reserved
        </p>

        {/* Counter */}
        <p className="text-text-dim/30 text-xs mt-1">
          {openIndex + 1} / {scenes.length}
        </p>
      </div>
    </div>
  )
}
