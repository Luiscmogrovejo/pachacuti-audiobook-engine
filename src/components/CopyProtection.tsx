// src/components/CopyProtection.tsx -- Comprehensive content protection for premium audiobook
// Prevents: copy, cut, select, drag, context menu, keyboard shortcuts, print, tab-switch blur
// Does NOT detect headless browsers (breaks Playwright) or override console (breaks debugging)

import { useEffect, useState } from 'react'
import { useLanguage } from '../lib/i18n/useLanguage'

/** Blocked keyboard shortcuts (Ctrl/Cmd + key) */
const BLOCKED_MOD_KEYS = new Set(['c', 'x', 'a', 's', 'p', 'u'])
/** Blocked Ctrl+Shift combos (dev tools shortcuts) */
const BLOCKED_SHIFT_KEYS = new Set(['I', 'J', 'C', 'K'])

export function CopyProtection() {
  const [devToolsOpen, setDevToolsOpen] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    // === COPY / SELECT / DRAG PREVENTION ===
    const prevent = (e: Event) => e.preventDefault()
    document.addEventListener('copy', prevent)
    document.addEventListener('cut', prevent)
    document.addEventListener('contextmenu', prevent)
    document.addEventListener('selectstart', prevent)
    document.addEventListener('dragstart', prevent)

    // === KEYBOARD SHORTCUT BLOCKING ===
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey

      // Block Ctrl/Cmd + C, X, A, S, P, U
      if (mod && BLOCKED_MOD_KEYS.has(e.key.toLowerCase())) {
        e.preventDefault()
        return
      }

      // Block F12
      if (e.key === 'F12') {
        e.preventDefault()
        return
      }

      // Block Ctrl+Shift+I/J/C/K (dev tools)
      if (mod && e.shiftKey && BLOCKED_SHIFT_KEYS.has(e.key)) {
        e.preventDefault()
        return
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    // === PRINT BLANKING ===
    const handleBeforePrint = () => {
      document.body.style.visibility = 'hidden'
    }
    const handleAfterPrint = () => {
      document.body.style.visibility = 'visible'
    }
    window.addEventListener('beforeprint', handleBeforePrint)
    window.addEventListener('afterprint', handleAfterPrint)

    // === TAB SWITCH BLUR (protect screenshots from screen capture) ===
    const handleVisibility = () => {
      document.body.style.filter = document.hidden ? 'blur(25px)' : 'none'
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // === DEVTOOLS SIZE DETECTION (production only) ===
    // Skip on touch devices to avoid false positives from browser chrome
    let devToolsInterval: ReturnType<typeof setInterval> | undefined
    if (typeof window !== 'undefined' && import.meta.env.PROD) {
      devToolsInterval = setInterval(() => {
        const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
        if (isTouchDevice) return

        const widthDiff = window.outerWidth - window.innerWidth
        const heightDiff = window.outerHeight - window.innerHeight
        const detected = widthDiff > 200 || heightDiff > 200

        setDevToolsOpen((prev) => (prev !== detected ? detected : prev))
      }, 1500)
    }

    // === CLEANUP ===
    return () => {
      document.removeEventListener('copy', prevent)
      document.removeEventListener('cut', prevent)
      document.removeEventListener('contextmenu', prevent)
      document.removeEventListener('selectstart', prevent)
      document.removeEventListener('dragstart', prevent)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('beforeprint', handleBeforePrint)
      window.removeEventListener('afterprint', handleAfterPrint)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (devToolsInterval) clearInterval(devToolsInterval)
    }
  }, [])

  // DevTools lockdown overlay -- blocks all content when dev tools detected
  if (devToolsOpen) {
    return (
      <div
        className="fixed inset-0 z-[9999] bg-volcanic flex items-center justify-center"
        style={{ backgroundColor: '#1a0800' }}
      >
        <div className="text-center px-8">
          <p
            className="text-lg tracking-wider mb-3"
            style={{ fontFamily: "'Cinzel', serif", color: '#d4a843' }}
          >
            {t('protection.title')}
          </p>
          <p
            className="text-sm leading-relaxed"
            style={{ fontFamily: "'Crimson Text', serif", color: '#8a6420' }}
          >
            {t('protection.message')}
          </p>
          <p
            className="mt-6 text-xs"
            style={{ color: 'rgba(240, 230, 211, 0.3)' }}
          >
            &copy; {t('protection.copyright')}
          </p>
        </div>
      </div>
    )
  }

  return null
}
