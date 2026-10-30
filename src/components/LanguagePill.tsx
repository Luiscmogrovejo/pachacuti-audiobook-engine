// src/components/LanguagePill.tsx -- ES/EN language toggle pill for the Nav bar
// Switches the entire site language: sets Zustand store + cookie, then reloads the page
// so Astro SSR re-renders with the new language. Accessible: role=radiogroup + role=radio.
// Touch target: min 44px height on mobile.

import React from 'react'
import { usePlayerStore } from './player/player-store'

export function LanguagePill() {
  const language = usePlayerStore((s) => s.language)
  const setLanguage = usePlayerStore((s) => s.setLanguage)

  const handleSwitch = (newLang: 'es' | 'en') => {
    if (newLang === language) return
    // 1. Set cookie synchronously (SSR reads this on reload)
    document.cookie = `pachacuti-lang=${newLang};path=/;max-age=31536000;SameSite=Lax`
    // 2. Update localStorage synchronously (Zustand rehydrates from this on reload)
    try {
      const stored = localStorage.getItem('pachacuti-player')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.state) {
          parsed.state.language = newLang
          localStorage.setItem('pachacuti-player', JSON.stringify(parsed))
        }
      }
    } catch {
      // Ignore localStorage errors
    }
    // 3. Update Zustand store (for any React islands that re-render before reload)
    setLanguage(newLang)
    // 4. Force full page reload so Astro SSR re-renders with the new cookie
    window.location.reload()
  }

  return (
    <div
      role="radiogroup"
      aria-label="Language selection"
      data-testid="language-pill"
      className="inline-flex items-center rounded-full border border-gold/20 overflow-hidden"
    >
      <button
        type="button"
        role="radio"
        aria-checked={language === 'es'}
        aria-label="Espanol"
        onClick={() => handleSwitch('es')}
        className={`px-3 py-1.5 text-xs font-heading tracking-wider transition-all duration-150 min-h-[44px] min-w-[44px] flex items-center justify-center ${
          language === 'es'
            ? 'bg-gold/20 text-gold font-bold'
            : 'bg-transparent text-text-dim hover:text-gold cursor-pointer'
        }`}
      >
        ES
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={language === 'en'}
        aria-label="English"
        onClick={() => handleSwitch('en')}
        className={`px-3 py-1.5 text-xs font-heading tracking-wider transition-all duration-150 min-h-[44px] min-w-[44px] flex items-center justify-center ${
          language === 'en'
            ? 'bg-gold/20 text-gold font-bold'
            : 'bg-transparent text-text-dim hover:text-gold cursor-pointer'
        }`}
      >
        EN
      </button>
    </div>
  )
}
