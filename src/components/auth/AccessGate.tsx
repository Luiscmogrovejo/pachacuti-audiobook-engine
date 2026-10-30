// src/components/auth/AccessGate.tsx -- Access gate wrapping player for gated chapters
// Free tier: pass through. Signup tier: show sign-in overlay. Paid tier: delegate to PaidGate.
// The gate overlays (not redirects) to show blurred player as incentive to sign up.

import React, { useState, useRef } from 'react'
import type { ReactNode } from 'react'
import type { AccessTier } from '../../lib/data/chapters'
import { useSession } from '../../lib/auth/client'
import { useLanguage } from '../../lib/i18n/useLanguage'
import { PaidGate } from './PaidGate'
import { TurnstileWidget } from './TurnstileWidget'

interface AccessGateProps {
  chapterSlug: string
  tier: AccessTier
  chapterTitle: string
  turnstileSiteKey?: string
  children: ReactNode
}

type FormState = 'idle' | 'loading' | 'success' | 'error'

export function AccessGate({ chapterSlug, tier, chapterTitle, turnstileSiteKey, children }: AccessGateProps) {
  const { data: sessionData } = useSession()
  const isAuthenticated = !!sessionData?.session

  // Free tier: always render children directly
  if (tier === 'free') {
    return <>{children}</>
  }

  // Paid tier: delegate to PaidGate (renders children if user is paid)
  if (tier === 'paid') {
    return (
      <PaidGate
        chapterSlug={chapterSlug}
        chapterTitle={chapterTitle}
        isAuthenticated={isAuthenticated}
      >
        {children}
      </PaidGate>
    )
  }

  // Signup tier: check authentication
  if (isAuthenticated) {
    return <>{children}</>
  }

  // Not authenticated on signup tier -- show gate overlay
  return (
    <div className="fixed inset-0 z-30 flex flex-col">
      {/* Blurred player preview behind the gate */}
      <div className="absolute inset-0 blur-sm opacity-30 pointer-events-none">
        {children}
      </div>

      {/* Atmospheric dark overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(13,9,7,0.85) 0%, rgba(10,9,8,0.95) 100%)',
        }}
      />

      {/* Gate overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6">
        <div
          className="w-full max-w-md rounded-2xl p-8 relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(26, 23, 20, 0.98) 0%, rgba(13, 9, 7, 0.99) 100%)',
            border: '1px solid rgba(212, 168, 67, 0.2)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 60px rgba(212, 168, 67, 0.06), inset 0 1px 0 rgba(212, 168, 67, 0.1)',
          }}
        >
          {/* Decorative corner accents */}
          <div className="absolute top-0 left-0 w-12 h-12 pointer-events-none" style={{ borderTop: '2px solid rgba(212, 168, 67, 0.2)', borderLeft: '2px solid rgba(212, 168, 67, 0.2)', borderRadius: '16px 0 0 0' }} />
          <div className="absolute top-0 right-0 w-12 h-12 pointer-events-none" style={{ borderTop: '2px solid rgba(212, 168, 67, 0.2)', borderRight: '2px solid rgba(212, 168, 67, 0.2)', borderRadius: '0 16px 0 0' }} />
          <div className="absolute bottom-0 left-0 w-12 h-12 pointer-events-none" style={{ borderBottom: '2px solid rgba(212, 168, 67, 0.2)', borderLeft: '2px solid rgba(212, 168, 67, 0.2)', borderRadius: '0 0 0 16px' }} />
          <div className="absolute bottom-0 right-0 w-12 h-12 pointer-events-none" style={{ borderBottom: '2px solid rgba(212, 168, 67, 0.2)', borderRight: '2px solid rgba(212, 168, 67, 0.2)', borderRadius: '0 0 16px 0' }} />
          <SignupGateForm chapterSlug={chapterSlug} turnstileSiteKey={turnstileSiteKey || ''} />
        </div>
      </div>
    </div>
  )
}

/** Inline sign-up form for the access gate */
function SignupGateForm({ chapterSlug, turnstileSiteKey }: { chapterSlug: string; turnstileSiteKey: string }) {
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
          callbackURL: `/listen/${chapterSlug}`,
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
    <div className="text-center">
      {/* Lock icon */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'rgba(212, 168, 67, 0.15)' }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#d4a843"
          strokeWidth={2}
          className="w-8 h-8"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <h2
        className="text-xl font-heading font-bold mb-2"
        style={{ color: '#d4a843' }}
      >
        {t('auth.signup.title')}
      </h2>

      {/* 3-tier progression indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(212, 168, 67, 0.3)', color: '#d4a843' }}>
            <svg viewBox="0 0 20 20" fill="#d4a843" className="w-4 h-4"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          </div>
          <span className="text-[10px] mt-1 uppercase tracking-wider" style={{ color: '#d4a843' }}>{t('auth.tiers.free')}</span>
          <span className="text-[9px] text-text-dim">Ch 0-4</span>
        </div>
        <div className="w-6 h-px" style={{ background: '#d4a843' }} />
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold animate-pulse" style={{ background: 'rgba(212, 168, 67, 0.2)', border: '2px solid #d4a843', color: '#d4a843' }}>
            2
          </div>
          <span className="text-[10px] mt-1 uppercase tracking-wider" style={{ color: '#d4a843' }}>{t('auth.tiers.signup')}</span>
          <span className="text-[9px] text-text-dim">Ch 5-10</span>
        </div>
        <div className="w-6 h-px bg-text-dim/30" />
        <div className="flex flex-col items-center opacity-50">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(212, 168, 67, 0.08)', border: '1px solid rgba(212, 168, 67, 0.2)', color: 'rgba(212, 168, 67, 0.5)' }}>
            3
          </div>
          <span className="text-[10px] mt-1 uppercase tracking-wider text-text-dim">{t('auth.tiers.paid')}</span>
          <span className="text-[9px] text-text-dim">Ch 11-23</span>
        </div>
      </div>

      <p className="text-sm text-text-secondary mb-1">
        {t('auth.signup.free')}
      </p>
      <p className="text-sm text-text-secondary mb-4">
        {t('auth.signup.unlock')}
      </p>
      <p className="text-xs mb-6" style={{ color: 'rgba(212, 168, 67, 0.7)' }}>
        {t('auth.signup.unlocks')}
      </p>

      {state === 'success' ? (
        <div className="py-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: 'rgba(212, 168, 67, 0.15)' }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#d4a843"
              strokeWidth={2}
              className="w-6 h-6"
            >
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-heading font-semibold text-text-primary mb-2">
            {t('auth.signin.check')}
          </h3>
          <p className="text-sm text-text-secondary mb-3">
            We sent a sign-in link to{' '}
            <span className="font-medium text-text-primary">{email}</span>.
            Click the link to start listening.
          </p>
          <p className="text-xs" style={{ color: 'rgba(212, 168, 67, 0.7)' }}>
            {t('auth.signup.success.detail')}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <input
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={state === 'loading'}
              className="w-full px-4 py-3 rounded-lg bg-volcanic/80 border border-text-dim/20 text-text-primary placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all disabled:opacity-50"
            />
          </div>

          {state === 'error' && errorMessage && (
            <p className="text-sm text-red-400" role="alert">
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
            className="w-full py-3 px-4 rounded-lg font-semibold text-volcanic transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: state === 'loading' ? '#9a7a30' : '#d4a843',
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

      {/* Sign-in link for existing users */}
      <p className="text-xs text-text-dim mt-6">
        {t('auth.signin.existing')}{' '}
        <a
          href="/auth/signin"
          className="underline hover:text-gold transition-colors"
          style={{ color: '#d4a843' }}
        >
          {t('auth.signin.link')}
        </a>
      </p>
    </div>
  )
}
