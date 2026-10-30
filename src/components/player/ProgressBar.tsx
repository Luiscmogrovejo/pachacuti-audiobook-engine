// src/components/player/ProgressBar.tsx -- Scrubber bar with time display
// 44px minimum touch target (research 5.2), pointer events for unified mouse+touch

import React, { useCallback, useRef } from 'react'
import { usePlayerStore } from './player-store'
import type { AudioEngine } from './AudioEngine'

interface ProgressBarProps {
  engine: AudioEngine | null
}

/**
 * Format seconds into MM:SS or H:MM:SS string.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'

  const totalSeconds = Math.floor(seconds)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

export function ProgressBar({ engine }: ProgressBarProps) {
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const seek = usePlayerStore((s) => s.seek)

  const barRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const remaining = duration > 0 ? duration - currentTime : 0

  /**
   * Calculate seek time from a pointer X position relative to the bar.
   */
  const getTimeFromPointer = useCallback(
    (clientX: number): number => {
      if (!barRef.current || duration <= 0) return 0
      const rect = barRef.current.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      return ratio * duration
    },
    [duration],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      isDraggingRef.current = true

      const time = getTimeFromPointer(e.clientX)
      seek(time)
      engine?.seek(time)

      // Capture pointer for drag
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [engine, seek, getTimeFromPointer],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return

      const time = getTimeFromPointer(e.clientX)
      seek(time)
      engine?.seek(time)
    },
    [engine, seek, getTimeFromPointer],
  )

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  return (
    <div className="w-full px-4">
      {/* Scrubber bar -- 44px touch target via padding */}
      <div
        ref={barRef}
        className="relative w-full cursor-pointer min-h-[44px] flex items-center"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="slider"
        aria-label="Audio progress"
        aria-valuemin={0}
        aria-valuemax={Math.floor(duration)}
        aria-valuenow={Math.floor(currentTime)}
        tabIndex={0}
      >
        {/* Track background */}
        <div className="absolute left-0 right-0 h-1 rounded-full bg-stone/50">
          {/* Filled portion */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gold transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
          {/* Draggable thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gold shadow-lg shadow-gold/30 transition-[left] duration-75"
            style={{ left: `${progress}%` }}
          />
        </div>
      </div>

      {/* Time display */}
      <div className="flex justify-between text-xs font-body text-text-secondary mt-1">
        <span>{formatTime(currentTime)}</span>
        <span>-{formatTime(remaining)}</span>
      </div>
    </div>
  )
}
