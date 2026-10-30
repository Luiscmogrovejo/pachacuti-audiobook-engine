// src/components/player/VoiceToggle.tsx -- Female/Male pill-shaped voice toggle
// Reads/writes voice from Zustand store. Accessible: role=radiogroup + role=radio.
// Touch target: min 44px height. Transition: 150ms background color.

import React from 'react'
import { usePlayerStore } from './player-store'

export function VoiceToggle() {
  const voice = usePlayerStore((s) => s.voice)
  const setVoice = usePlayerStore((s) => s.setVoice)

  return (
    <div
      role="radiogroup"
      aria-label="Voice selection"
      className="inline-flex items-center rounded-full border border-stone overflow-hidden"
      style={{ minHeight: '44px' }}
      data-testid="voice-toggle"
    >
      <button
        type="button"
        role="radio"
        aria-checked={voice === 'female'}
        aria-label="Female voice"
        onClick={() => setVoice('female')}
        className={`px-3 py-2 text-xs font-heading tracking-wide transition-all duration-150 flex items-center gap-1 ${
          voice === 'female'
            ? 'bg-gold text-volcanic'
            : 'bg-transparent text-text-dim hover:text-text-secondary'
        }`}
        style={{ minHeight: '44px', minWidth: '40px' }}
        data-testid="voice-female"
      >
        F
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={voice === 'male'}
        aria-label="Male voice"
        onClick={() => setVoice('male')}
        className={`px-3 py-2 text-xs font-heading tracking-wide transition-all duration-150 flex items-center gap-1 ${
          voice === 'male'
            ? 'bg-gold text-volcanic'
            : 'bg-transparent text-text-dim hover:text-text-secondary'
        }`}
        style={{ minHeight: '44px', minWidth: '40px' }}
        data-testid="voice-male"
      >
        M
      </button>
    </div>
  )
}
