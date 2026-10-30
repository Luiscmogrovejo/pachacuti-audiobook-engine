// src/components/player/SceneCycler.tsx -- Ken Burns scene cycling layer
// Sits between the background image and gradient overlay in PlayerIsland.
// Cycles through chapter scene images with crossfade + Ken Burns zoom/pan.
// Uses stable refs (not key-based remounting) to avoid transition flashes.

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { ENABLE_ENCRYPTION } from '../../lib/config'

/** 4 Ken Burns transform presets -- cycled by scene index */
const KB_PRESETS = [
  { from: 'scale(1) translate(0%, 0%)', to: 'scale(1.1) translate(-2%, -1%)' },   // zoom-in-left
  { from: 'scale(1) translate(0%, 0%)', to: 'scale(1.1) translate(2%, 1%)' },    // zoom-in-right
  { from: 'scale(1.1) translate(0%, 0%)', to: 'scale(1) translate(0%, 0%)' },    // zoom-out-center
  { from: 'scale(1.05) translate(-2%, 0%)', to: 'scale(1.05) translate(2%, 0%)' }, // pan-left-to-right
] as const

/** Crossfade transition duration in ms -- must match CSS transition value */
const CROSSFADE_MS = 2000

interface SceneCyclerProps {
  /** Array of scene image paths (from theme.scenes) */
  scenes: string[]
  /** Interval between scene transitions in ms (default 15000) */
  intervalMs?: number
  /** Chapter mood for potential mood-specific effects */
  mood: string
  /** Session token for encrypted image delivery (from useEncryption) */
  encryptionToken?: string | null
}

/**
 * Transform a scene path to use the token-gated /api/image/ endpoint.
 * Input:  "/art/scenes/ch00/ch00-scene-01.webp"
 * Output: "/api/image/scenes/ch00/ch00-scene-01.webp?token=..."
 */
function toEncryptedImagePath(scenePath: string, token: string): string {
  // Strip leading /art/ prefix to get the relative path
  const relativePath = scenePath.replace(/^\/art\//, '')
  return `/api/image/${relativePath}?token=${encodeURIComponent(token)}`
}

export function SceneCycler({ scenes, intervalMs = 15_000, mood, encryptionToken }: SceneCyclerProps) {
  // Transform scene paths when encryption is enabled
  const effectiveScenes = useMemo(() => {
    if (!ENABLE_ENCRYPTION || !encryptionToken) return scenes
    return scenes.map((s) => toEncryptedImagePath(s, encryptionToken))
  }, [scenes, encryptionToken])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showSecond, setShowSecond] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isVisibleRef = useRef(true)

  // Stable refs for both image slots (no key-based remounting)
  const slotARef = useRef<HTMLImageElement>(null)
  const slotBRef = useRef<HTMLImageElement>(null)
  // Track active Web Animations so we can cancel them on new transitions
  const animARef = useRef<Animation | null>(null)
  const animBRef = useRef<Animation | null>(null)

  const nextIndex = effectiveScenes.length > 0 ? (currentIndex + 1) % effectiveScenes.length : 0

  // Preload next image
  useEffect(() => {
    if (effectiveScenes.length <= 1) return
    const img = new Image()
    img.src = effectiveScenes[nextIndex]
  }, [effectiveScenes, nextIndex])

  // Apply Ken Burns animation to a slot via Web Animations API
  const applyKenBurns = useCallback((
    el: HTMLImageElement | null,
    presetIndex: number,
    animRef: React.MutableRefObject<Animation | null>,
  ) => {
    if (!el) return
    // Cancel previous animation on this slot
    if (animRef.current) {
      animRef.current.cancel()
    }
    const kb = KB_PRESETS[presetIndex % KB_PRESETS.length]
    animRef.current = el.animate(
      [
        { transform: kb.from },
        { transform: kb.to },
      ],
      {
        duration: intervalMs,
        fill: 'forwards',
        easing: 'linear',
      },
    )
  }, [intervalMs])

  // Apply Ken Burns to slot A whenever currentIndex changes
  useEffect(() => {
    if (effectiveScenes.length === 0) return
    const el = slotARef.current
    if (el) {
      el.src = effectiveScenes[currentIndex]
      applyKenBurns(el, currentIndex, animARef)
    }
  }, [currentIndex, effectiveScenes, applyKenBurns])

  // Apply Ken Burns to slot B whenever nextIndex changes
  useEffect(() => {
    if (effectiveScenes.length <= 1) return
    const el = slotBRef.current
    if (el) {
      el.src = effectiveScenes[nextIndex]
      applyKenBurns(el, nextIndex, animBRef)
    }
  }, [nextIndex, effectiveScenes, applyKenBurns])

  // Advance scene on interval
  const advanceScene = useCallback(() => {
    if (!isVisibleRef.current) return
    if (effectiveScenes.length <= 1) return

    setShowSecond((prev) => !prev)
    // After the crossfade completes, update the index for the now-hidden slot
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % effectiveScenes.length)
    }, CROSSFADE_MS)
  }, [effectiveScenes.length])

  // Set up interval timer
  useEffect(() => {
    if (effectiveScenes.length <= 1) return

    intervalRef.current = setInterval(advanceScene, intervalMs)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [advanceScene, intervalMs, effectiveScenes.length])

  // Page Visibility API -- pause cycling when tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // Nothing to render if no scenes
  if (effectiveScenes.length === 0) return null

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Slot A */}
      <img
        ref={slotARef}
        src={effectiveScenes[currentIndex]}
        alt=""
        role="presentation"
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{
          opacity: showSecond ? 0 : 1,
          transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
          willChange: 'opacity, transform',
          WebkitUserDrag: 'none',
        } as React.CSSProperties}
        onError={(e) => {
          // Hide broken images with opacity to maintain layout
          ;(e.target as HTMLImageElement).style.opacity = '0'
        }}
      />

      {/* Slot B (only if more than 1 scene) */}
      {effectiveScenes.length > 1 && (
        <img
          ref={slotBRef}
          src={effectiveScenes[nextIndex]}
          alt=""
          role="presentation"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          style={{
            opacity: showSecond ? 1 : 0,
            transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
            willChange: 'opacity, transform',
            WebkitUserDrag: 'none',
          } as React.CSSProperties}
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.opacity = '0'
          }}
        />
      )}

      {/* Transparent overlay -- prevents right-click save image on scene art */}
      <div
        className="absolute inset-0 z-10"
        style={{ pointerEvents: 'auto' }}
        onContextMenu={(e) => e.preventDefault()}
        aria-hidden="true"
      />

      {/* Copyright watermark -- subtle text on scene images */}
      <div
        className="absolute bottom-2 right-3 z-20 select-none pointer-events-none"
        aria-hidden="true"
      >
        <span
          className="text-[9px] tracking-wide"
          style={{
            fontFamily: "'Cinzel', serif",
            color: 'rgba(255,255,255,0.18)',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            letterSpacing: '0.05em',
          }}
        >
          &copy; Pachacuti &mdash; pachacuti.robertamauta.com
        </span>
      </div>
    </div>
  )
}
