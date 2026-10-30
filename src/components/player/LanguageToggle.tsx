// src/components/player/LanguageToggle.tsx -- ES/EN pill-shaped language toggle
// Reads/writes language from Zustand store. Accessible: role=radiogroup + role=radio.
// Touch target: min 44px height. Transition: 150ms background color.

import React from 'react'
import { usePlayerStore } from './player-store'

export function LanguageToggle() {
  const language = usePlayerStore((s) => s.language)
  const setLanguage = usePlayerStore((s) => s.setLanguage)

  return (
    <div
      role="radiogroup"
      aria-label="Language selection"
      className="inline-flex items-center rounded-full border border-stone overflow-hidden"
      style={{ minHeight: '44px' }}
    >
      <button
        type="button"
        role="radio"
        aria-checked={language === 'es'}
        aria-label="Espanol"
        onClick={() => setLanguage('es')}
        className={`px-4 py-2 text-sm font-heading tracking-wide transition-all duration-150 ${
          language === 'es'
            ? 'bg-gold text-volcanic'
            : 'bg-transparent text-text-dim hover:text-text-secondary'
        }`}
        style={{ minHeight: '44px', minWidth: '44px' }}
      >
        ES
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={language === 'en'}
        aria-label="English"
        onClick={() => setLanguage('en')}
        className={`px-4 py-2 text-sm font-heading tracking-wide transition-all duration-150 ${
          language === 'en'
            ? 'bg-gold text-volcanic'
            : 'bg-transparent text-text-dim hover:text-text-secondary'
        }`}
        style={{ minHeight: '44px', minWidth: '44px' }}
      >
        EN
      </button>
    </div>
  )
}
