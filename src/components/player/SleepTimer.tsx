// src/components/player/SleepTimer.tsx -- Sleep timer with presets (SLEP-01)
// Collapsed: moon icon with countdown. Expanded: popover with time presets + end of chapter

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { usePlayerStore } from './player-store'

/** Sleep timer preset options in minutes */
const PRESETS = [5, 10, 15, 30, 45, 60] as const

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path d="M12.1 22c-5.5 0-10-4.5-10-10 0-4.8 3.4-8.8 8-9.8-.4 1-.6 2.1-.6 3.3 0 4.4 3.6 8 8 8 1.1 0 2.2-.2 3.3-.6-1 4.6-5 8-9.7 8z" />
    </svg>
  )
}

/**
 * Format remaining seconds into a readable countdown string (e.g., "23m", "1h 05m").
 */
function formatCountdown(ms: number): string {
  if (ms <= 0) return '0m'
  const totalMinutes = Math.ceil(ms / 60000)
  if (totalMinutes >= 60) {
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${h}h ${String(m).padStart(2, '0')}m`
  }
  return `${totalMinutes}m`
}

export function SleepTimer() {
  const [isOpen, setIsOpen] = useState(false)
  const [remaining, setRemaining] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const sleepTimerEndTime = usePlayerStore((s) => s.sleepTimerEndTime)
  const sleepTimerMode = usePlayerStore((s) => s.sleepTimerMode)
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer)
  const setSleepTimerEndOfChapter = usePlayerStore(
    (s) => s.setSleepTimerEndOfChapter,
  )
  const clearSleepTimer = usePlayerStore((s) => s.clearSleepTimer)
  const pause = usePlayerStore((s) => s.pause)

  const isActive = sleepTimerEndTime !== null

  // Countdown interval: update remaining display every second
  useEffect(() => {
    if (!isActive) {
      setRemaining(null)
      return
    }

    // End of chapter mode: show static text
    if (sleepTimerEndTime === -1) {
      setRemaining('End of ch.')
      return
    }

    const tick = () => {
      const ms = sleepTimerEndTime - Date.now()
      if (ms <= 0) {
        // Timer expired: pause and clear
        pause()
        clearSleepTimer()
        setRemaining(null)
      } else {
        setRemaining(formatCountdown(ms))
      }
    }

    tick() // immediate
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isActive, sleepTimerEndTime, pause, clearSleepTimer])

  // Close popover on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    // Delay to avoid immediate close from the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = useCallback(
    (minutes: number) => {
      setSleepTimer(minutes)
      setIsOpen(false)
    },
    [setSleepTimer],
  )

  const handleEndOfChapter = useCallback(() => {
    setSleepTimerEndOfChapter()
    setIsOpen(false)
  }, [setSleepTimerEndOfChapter])

  const handleCancel = useCallback(() => {
    clearSleepTimer()
    setIsOpen(false)
  }, [clearSleepTimer])

  return (
    <div className="relative" ref={popoverRef}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1 h-11 min-h-[44px] px-2 rounded-lg transition-colors ${
          isActive
            ? 'text-gold hover:text-gold-light'
            : 'text-text-secondary hover:text-text-primary'
        }`}
        aria-label={isActive ? `Sleep timer: ${remaining}` : 'Set sleep timer'}
      >
        <MoonIcon />
        {remaining && (
          <span className="text-xs font-body tabular-nums">{remaining}</span>
        )}
      </button>

      {/* Popover: opens upward (controls are at bottom of screen) */}
      {isOpen && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-xl overflow-hidden shadow-xl shadow-black/40 z-50"
          style={{
            background:
              'linear-gradient(180deg, rgba(18,12,8,0.98) 0%, rgba(10,6,4,0.99) 100%)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="py-1">
            {PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleSelect(m)}
                className="w-full flex items-center justify-between px-4 h-11 min-h-[44px] text-sm text-text-primary hover:bg-gold/10 transition-colors"
              >
                <span>{m} min</span>
                {sleepTimerMode === 'minutes' &&
                  sleepTimerEndTime !== null &&
                  sleepTimerEndTime > 0 &&
                  Math.round((sleepTimerEndTime - Date.now()) / 60000) <=
                    m + 1 &&
                  Math.round((sleepTimerEndTime - Date.now()) / 60000) >=
                    m - 1 && (
                    <span className="w-2 h-2 rounded-full bg-gold" />
                  )}
              </button>
            ))}

            {/* End of chapter option */}
            <button
              type="button"
              onClick={handleEndOfChapter}
              className="w-full flex items-center justify-between px-4 h-11 min-h-[44px] text-sm text-text-primary hover:bg-gold/10 transition-colors border-t border-stone/20"
            >
              <span>End of chapter</span>
              {sleepTimerMode === 'end-of-chapter' && (
                <span className="w-2 h-2 rounded-full bg-gold" />
              )}
            </button>

            {/* Cancel option (only shown if timer is active) */}
            {isActive && (
              <button
                type="button"
                onClick={handleCancel}
                className="w-full flex items-center px-4 h-11 min-h-[44px] text-sm text-red-400 hover:bg-red-400/10 transition-colors border-t border-stone/20"
              >
                Cancel timer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
