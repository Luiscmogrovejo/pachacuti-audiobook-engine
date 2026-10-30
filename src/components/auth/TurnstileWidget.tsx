// src/components/auth/TurnstileWidget.tsx -- Cloudflare Turnstile invisible captcha (AUTH-04)
// Loads Turnstile script from CDN, renders invisible widget, calls onSuccess with token

import React, { useEffect, useRef, useCallback } from 'react'

interface TurnstileWidgetProps {
  /** Cloudflare Turnstile site key (from PUBLIC_TURNSTILE_SITE_KEY) */
  siteKey: string
  /** Called when Turnstile verification passes */
  onSuccess: (token: string) => void
}

// Declare the global Turnstile type
declare global {
  interface Window {
    turnstile?: {
      render: (
        element: string | HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          theme?: string
          size?: string
        },
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

export function TurnstileWidget({ siteKey, onSuccess }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess

  // Development fallback: skip if no real siteKey
  const isDev = !siteKey || siteKey.startsWith('test-') || siteKey === '0x0000000000000000000000'

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !containerRef.current || widgetIdRef.current) return

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => {
        onSuccessRef.current(token)
      },
      theme: 'dark',
      size: 'invisible',
    })
  }, [siteKey])

  useEffect(() => {
    // Dev mode: immediately call onSuccess with test token
    if (isDev) {
      onSuccessRef.current('test-token')
      return
    }

    // Load the Turnstile script if not already present
    if (!document.getElementById('cf-turnstile-script')) {
      const script = document.createElement('script')
      script.id = 'cf-turnstile-script'
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'
      script.async = true
      document.head.appendChild(script)

      // Register a global callback for script load
      ;(window as Record<string, unknown>).onTurnstileLoad = () => {
        renderWidget()
      }
    } else if (window.turnstile) {
      // Script already loaded, render immediately
      renderWidget()
    }

    return () => {
      // Clean up widget on unmount
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [isDev, renderWidget])

  // Dev mode: render nothing
  if (isDev) return null

  return <div ref={containerRef} className="cf-turnstile" data-theme="dark" data-size="invisible" />
}
