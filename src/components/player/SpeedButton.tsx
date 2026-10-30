// src/components/player/SpeedButton.tsx -- Playback speed cycle button
// Cycles through [0.75, 1.0, 1.25, 1.5, 2.0] on tap (PLAY-02)

import React, { useCallback } from 'react'
import { usePlayerStore, SPEED_OPTIONS, type PlaybackSpeed } from './player-store'
import type { AudioEngine } from './AudioEngine'

interface SpeedButtonProps {
  engine: AudioEngine | null
}

/**
 * Format speed value for display.
 * 0.75 -> "0.75x", 1.0 -> "1x", 1.25 -> "1.25x", 1.5 -> "1.5x", 2.0 -> "2x"
 */
function formatSpeed(speed: PlaybackSpeed): string {
  if (speed === 1.0) return '1x'
  if (speed === 2.0) return '2x'
  return `${speed}x`
}

export function SpeedButton({ engine }: SpeedButtonProps) {
  const speed = usePlayerStore((s) => s.speed)
  const setSpeed = usePlayerStore((s) => s.setSpeed)

  const cycleSpeed = useCallback(() => {
    const currentIndex = SPEED_OPTIONS.indexOf(speed)
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length
    const nextSpeed = SPEED_OPTIONS[nextIndex]
    setSpeed(nextSpeed)
    engine?.setSpeed(nextSpeed)
  }, [speed, setSpeed, engine])

  const isModified = speed !== 1.0

  return (
    <button
      type="button"
      onClick={cycleSpeed}
      className={`min-h-[44px] min-w-[44px] px-3 flex items-center justify-center rounded-lg text-sm font-heading font-bold transition-colors ${
        isModified
          ? 'text-gold hover:text-gold-light'
          : 'text-text-secondary hover:text-text-primary'
      }`}
      aria-label={`Playback speed: ${formatSpeed(speed)}. Tap to change.`}
    >
      {formatSpeed(speed)}
    </button>
  )
}
