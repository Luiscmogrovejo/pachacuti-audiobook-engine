// src/components/auth/SignInForm.tsx -- Premium magic link sign-in form with Turnstile
// States: idle -> loading -> success | error
// Dark theme with gold accents and Andean-inspired decorative elements

import React, { useState, useRef } from 'react'
import { TurnstileWidget } from './TurnstileWidget'
import { useLanguage } from '../../lib/i18n/useLanguage'

interface SignInFormProps {
  /** Cloudflare Turnstile site key */
  turnstileSiteKey: string
}

type FormState = 'idle' | 'loading' | 'success' | 'error'

export function SignInForm({ turnstileSiteKey }: SignInFormProps) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const turnstileTokenRef = useRef<string | null>(null)
  const { t } = useLanguage()

  const handleTurnstileSuccess = (token: string) => {
    turnstileTokenRef.current = token
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.')
      setState('error')
      return
    }

    // Check Turnstile token (may be null if widget hasn't loaded yet)
    if (!turnstileTokenRef.current) {
      setErrorMessage('Verification pending. Please try again in a moment.')
      setState('error')
      return
    }

    setState('loading')
    setErrorMessage('')

    try {
      const response = await fetch('/api/auth/verify-and-send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          callbackURL: '/listen/prologue',
          turnstileToken: turnstileTokenRef.current,
        }),
      })

      if (!response.ok) {
        const data = await response.json() as { error?: string }
        throw new Error(data.error || 'Verification failed')
      }

      setState('success')
    } catch (err) {
      setState('error')
      setErrorMessage(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      )
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className="rounded-2xl p-8 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(26, 23, 20, 0.95) 0%, rgba(13, 9, 7, 0.98) 100%)',
          border: '1px solid rgba(212, 168, 67, 0.2)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 60px rgba(212, 168, 67, 0.06), inset 0 1px 0 rgba(212, 168, 67, 0.1)',
        }}
      >
        {/* Decorative Andean corner accents */}
        <div
          className="absolute top-0 left-0 w-16 h-16 pointer-events-none"
          style={{
            borderTop: '2px solid rgba(212, 168, 67, 0.25)',
            borderLeft: '2px solid rgba(212, 168, 67, 0.25)',
            borderRadius: '16px 0 0 0',
          }}
        />
        <div
          className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
          style={{
            borderTop: '2px solid rgba(212, 168, 67, 0.25)',
            borderRight: '2px solid rgba(212, 168, 67, 0.25)',
            borderRadius: '0 16px 0 0',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-16 h-16 pointer-events-none"
          style={{
            borderBottom: '2px solid rgba(212, 168, 67, 0.25)',
            borderLeft: '2px solid rgba(212, 168, 67, 0.25)',
            borderRadius: '0 0 0 16px',
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none"
          style={{
            borderBottom: '2px solid rgba(212, 168, 67, 0.25)',
            borderRight: '2px solid rgba(212, 168, 67, 0.25)',
            borderRadius: '0 0 16px 0',
          }}
        />

        {/* Header */}
        <div className="text-center mb-8 relative">
          {/* Inti (sun) icon */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'radial-gradient(circle, rgba(212, 168, 67, 0.2) 0%, rgba(212, 168, 67, 0.05) 70%)',
              border: '1px solid rgba(212, 168, 67, 0.25)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
              <circle cx="12" cy="12" r="5" stroke="#d4a843" strokeWidth={1.5} />
              {/* Sun rays */}
              <line x1="12" y1="1" x2="12" y2="4" stroke="#d4a843" strokeWidth={1.5} strokeLinecap="round" />
              <line x1="12" y1="20" x2="12" y2="23" stroke="#d4a843" strokeWidth={1.5} strokeLinecap="round" />
              <line x1="1" y1="12" x2="4" y2="12" stroke="#d4a843" strokeWidth={1.5} strokeLinecap="round" />
              <line x1="20" y1="12" x2="23" y2="12" stroke="#d4a843" strokeWidth={1.5} strokeLinecap="round" />
              <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="#d4a843" strokeWidth={1.5} strokeLinecap="round" />
              <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="#d4a843" strokeWidth={1.5} strokeLinecap="round" />
              <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="#d4a843" strokeWidth={1.5} strokeLinecap="round" />
              <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="#d4a843" strokeWidth={1.5} strokeLinecap="round" />
            </svg>
          </div>
          <h1
            className="text-2xl mb-1"
            style={{ color: '#d4a843', fontFamily: "'Cinzel Decorative', serif" }}
          >
            Pachacuti
          </h1>
          <div className="w-10 h-px mx-auto my-3" style={{ background: 'rgba(212, 168, 67, 0.4)' }} />
          <p className="text-sm text-text-secondary" style={{ fontFamily: "'Crimson Text', serif" }}>
            {t('auth.signup.free')}
          </p>
        </div>

        {state === 'success' ? (
          /* Success state */
          <div className="text-center py-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                background: 'radial-gradient(circle, rgba(212, 168, 67, 0.2) 0%, rgba(212, 168, 67, 0.05) 70%)',
                border: '1px solid rgba(212, 168, 67, 0.3)',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#d4a843"
                strokeWidth={2}
                className="w-8 h-8"
              >
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
              {t('auth.signin.check')}
            </h2>
            <p className="text-sm text-text-secondary" style={{ fontFamily: "'Crimson Text', serif" }}>
              We sent a sign-in link to{' '}
              <span className="font-medium text-text-primary">{email}</span>.
              Check your inbox and click the link to continue.
            </p>
          </div>
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-secondary mb-1.5"
                style={{ fontFamily: "'Cinzel', serif", fontSize: '12px', letterSpacing: '0.05em' }}
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={state === 'loading'}
                className="w-full px-4 py-3 rounded-lg text-text-primary placeholder-text-dim focus:outline-none transition-all disabled:opacity-50"
                style={{
                  background: 'rgba(10, 9, 8, 0.6)',
                  border: '1px solid rgba(212, 168, 67, 0.15)',
                  fontFamily: "'Crimson Text', serif",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.4)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(212, 168, 67, 0.1)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.15)'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>

            {/* Error message */}
            {state === 'error' && errorMessage && (
              <p className="text-sm text-red-400" role="alert" style={{ fontFamily: "'Crimson Text', serif" }}>
                {errorMessage}
              </p>
            )}

            {/* Turnstile widget (invisible) */}
            <TurnstileWidget
              siteKey={turnstileSiteKey}
              onSuccess={handleTurnstileSuccess}
            />

            <button
              type="submit"
              disabled={state === 'loading'}
              className="w-full py-3 px-4 rounded-lg font-semibold text-volcanic transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
              style={{
                background: state === 'loading'
                  ? 'linear-gradient(135deg, #9a7a30, #7a6020)'
                  : 'linear-gradient(135deg, #d4a843, #b8922e)',
                fontFamily: "'Cinzel', serif",
                fontSize: '14px',
                letterSpacing: '0.05em',
                boxShadow: '0 2px 8px rgba(212, 168, 67, 0.2)',
              }}
            >
              {state === 'loading' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="opacity-25"
                    />
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      className="opacity-75"
                    />
                  </svg>
                  {t('auth.signin.sending')}
                </span>
              ) : (
                t('auth.signin.cta')
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
