// src/components/universe/GalleryIsland.tsx -- Tiered gallery access control
// Non-paid (including signed-up): 1 image per chapter + 3 main trio portraits (Cusi, Rumi, Naymlap)
// Paid: ALL images + ALL 32 characters
// Access check is client-side via useSession + payment-status (UX incentive, not DRM -- images are in /public)

import React, { useEffect, useState } from 'react'
import { useSession } from '../../lib/auth/client'

interface LightboxScene {
  id: string
  chapter: number
  imagePath: string
  description: string
}

interface ChapterGroup {
  chapter: number
  title: string
  scenes: (LightboxScene & { flatIndex: number })[]
}

interface CharacterPortrait {
  id: string
  name: string
  portrait: string
  accent: string
}

interface GalleryIslandProps {
  chaptersWithIndices: ChapterGroup[]
  allScenes: LightboxScene[]
  totalScenes: number
  characterPortraits: CharacterPortrait[]
  lang: 'es' | 'en'
}

const MAIN_TRIO_IDS = ['cusi', 'rumi', 'naymlap']

export function GalleryIsland({
  chaptersWithIndices,
  totalScenes,
  characterPortraits,
  lang,
}: GalleryIslandProps) {
  const { data: sessionData, isPending } = useSession()
  const isAuthenticated = !!sessionData?.session
  const [isPaid, setIsPaid] = useState(false)
  const [checkingPayment, setCheckingPayment] = useState(true)

  // Check payment status for authenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      setCheckingPayment(false)
      return
    }

    fetch('/api/auth/payment-status')
      .then(res => res.json())
      .then((data: { isPaid: boolean }) => {
        setIsPaid(data.isPaid)
        setCheckingPayment(false)
      })
      .catch(() => {
        setCheckingPayment(false)
      })
  }, [isAuthenticated])

  // Paid users see all scenes; non-paid see only first scene per chapter
  const getUnlockedScenes = (scenes: (LightboxScene & { flatIndex: number })[]) => {
    if (isPaid) return scenes
    // Non-paid (including signed-up): only the first scene of each chapter
    return scenes.length > 0 ? [scenes[0]] : []
  }

  const mainTrioPortraits = characterPortraits.filter(c => MAIN_TRIO_IDS.includes(c.id))
  const otherPortraits = characterPortraits.filter(c => !MAIN_TRIO_IDS.includes(c.id))

  const handleImageClick = (flatIndex: number, locked: boolean) => {
    if (locked) return
    document.dispatchEvent(new CustomEvent('gallery:open', { detail: { index: flatIndex } }))
  }

  // Re-wire astro:page-load compat
  useEffect(() => {
    const rewire = () => {
      document.querySelectorAll('[data-gallery-index]').forEach(el => {
        if ((el as HTMLElement).dataset.galleryWired) return
        ;(el as HTMLElement).dataset.galleryWired = '1'
      })
    }
    rewire()
    document.addEventListener('astro:page-load', rewire)
    return () => document.removeEventListener('astro:page-load', rewire)
  }, [])

  // Determine CTA text based on auth + payment state
  const getCtaText = () => {
    if (!isAuthenticated) {
      return lang === 'en' ? 'Sign Up Free' : 'Registrate Gratis'
    }
    return lang === 'en' ? 'Unlock Premium' : 'Desbloquear Premium'
  }

  const getCtaHref = () => {
    if (!isAuthenticated) return '/auth/signin'
    return '/payment'
  }

  return (
    <div>
      {/* Character Portraits Section */}
      <section className="mb-12">
        <h2
          className="text-xl md:text-2xl text-center mb-6"
          style={{ color: '#d4a843', fontFamily: "'Cinzel', serif" }}
        >
          {lang === 'en' ? 'Character Portraits' : 'Retratos de Personajes'}
        </h2>

        {/* Main trio -- always visible */}
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-6">
          {mainTrioPortraits.map(char => (
            <a
              key={char.id}
              href={`/characters/${char.id}`}
              className="group relative aspect-[3/4] rounded-lg overflow-hidden border transition-all hover:scale-105"
              style={{ borderColor: `color-mix(in srgb, ${char.accent} 30%, transparent)` }}
            >
              <img
                src={char.portrait}
                alt={char.name}
                loading="lazy"
                draggable={false}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                <span
                  className="text-xs font-heading uppercase tracking-wider"
                  style={{ color: char.accent }}
                >
                  {char.name}
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* Other portraits -- locked for non-paid users */}
        {!isPaid && otherPortraits.length > 0 && (
          <div className="relative">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {otherPortraits.slice(0, 8).map(char => (
                <div
                  key={char.id}
                  className="relative aspect-[3/4] rounded-lg overflow-hidden bg-volcanic-light"
                >
                  <img
                    src={char.portrait}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover blur-md brightness-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(212,168,67,0.5)" strokeWidth={1.5} className="w-5 h-5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
            {otherPortraits.length > 8 && (
              <p className="text-center text-text-dim text-xs mt-2" style={{ fontFamily: "'Crimson Text', serif" }}>
                +{otherPortraits.length - 8} {lang === 'en' ? 'more portraits' : 'retratos mas'}
              </p>
            )}
          </div>
        )}

        {isPaid && otherPortraits.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {otherPortraits.map(char => (
              <a
                key={char.id}
                href={`/characters/${char.id}`}
                className="group relative aspect-[3/4] rounded-lg overflow-hidden border border-white/5 transition-all hover:scale-105"
              >
                <img
                  src={char.portrait}
                  alt={char.name}
                  loading="lazy"
                  draggable={false}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1">
                  <span className="text-[10px] font-heading uppercase tracking-wider text-text-primary/90 truncate px-1">
                    {char.name}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Unlock CTA for non-paid users (both anonymous and signed-up) */}
      {!isPaid && !isPending && !checkingPayment && (
        <div
          className="relative rounded-xl p-6 mb-12 text-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(212, 168, 67, 0.08) 0%, rgba(212, 168, 67, 0.02) 100%)',
            border: '1px solid rgba(212, 168, 67, 0.2)',
          }}
        >
          <h3
            className="text-lg font-heading mb-2"
            style={{ color: '#d4a843', fontFamily: "'Cinzel', serif" }}
          >
            {lang === 'en' ? 'Unlock the Full Gallery' : 'Desbloquea la Galeria Completa'}
          </h3>
          <p className="text-sm text-text-secondary mb-4" style={{ fontFamily: "'Crimson Text', serif" }}>
            {lang === 'en'
              ? `${isAuthenticated ? 'Upgrade to premium' : 'Sign up'} to explore all ${totalScenes} scenes and ${characterPortraits.length} character portraits`
              : `${isAuthenticated ? 'Actualiza a premium' : 'Registrate'} para explorar las ${totalScenes} escenas y ${characterPortraits.length} retratos de personajes`}
          </p>
          <a
            href={getCtaHref()}
            className="inline-block px-6 py-2.5 rounded-lg font-semibold text-volcanic text-sm transition-all hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, #d4a843, #b8922e)',
              fontFamily: "'Cinzel', serif",
              letterSpacing: '0.03em',
              boxShadow: '0 2px 8px rgba(212, 168, 67, 0.2)',
            }}
          >
            {getCtaText()}
          </a>
        </div>
      )}

      {/* Chapter scene sections */}
      {chaptersWithIndices.map((ch) => {
        const unlockedScenes = getUnlockedScenes(ch.scenes)
        const lockedScenes = ch.scenes.filter(s => !unlockedScenes.includes(s))
        const chapterLabel = ch.chapter === 0
          ? (lang === 'en' ? 'Prologue' : 'Prologo')
          : `${lang === 'en' ? 'Chapter' : 'Capitulo'} ${ch.chapter}`

        return (
          <section key={ch.chapter} className="mb-12" data-testid="gallery-chapter-section" data-chapter={ch.chapter}>
            {/* Chapter heading */}
            <h2
              className="text-xl md:text-2xl mb-4 border-b pb-2"
              style={{ color: '#d4a843', borderColor: 'rgba(212, 168, 67, 0.15)', fontFamily: "'Cinzel', serif" }}
            >
              <span className="text-sm uppercase tracking-wider mr-2" style={{ color: 'rgba(212, 168, 67, 0.5)' }}>
                {chapterLabel}
              </span>
              {ch.title}
            </h2>

            {/* Thumbnail grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {/* Unlocked images */}
              {unlockedScenes.map((scene) => (
                <div
                  key={scene.id}
                  className="gallery-watermark relative group cursor-pointer overflow-hidden rounded-lg aspect-[4/3] bg-volcanic-light"
                  data-testid="gallery-image"
                  data-chapter={ch.chapter}
                  data-scene={scene.id}
                  data-gallery-index={scene.flatIndex}
                  onClick={() => handleImageClick(scene.flatIndex, false)}
                >
                  <img
                    src={scene.imagePath}
                    alt={scene.description}
                    loading="lazy"
                    draggable={false}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
                  />
                  {/* Hover overlay with scene description */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
                    <p className="text-xs text-white/90 line-clamp-2" style={{ fontFamily: "'Crimson Text', serif" }}>
                      {scene.description}
                    </p>
                  </div>
                </div>
              ))}

              {/* Locked images (blurred with lock) */}
              {lockedScenes.map((scene) => (
                <div
                  key={scene.id}
                  className="relative overflow-hidden rounded-lg aspect-[4/3] bg-volcanic-light"
                  data-testid="gallery-image-locked"
                  data-chapter={ch.chapter}
                  data-scene={scene.id}
                >
                  <img
                    src={scene.imagePath}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover blur-md brightness-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="rgba(212,168,67,0.5)" strokeWidth={1.5} className="w-6 h-6">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(212, 168, 67, 0.5)', fontFamily: "'Cinzel', serif" }}>
                        Premium
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
