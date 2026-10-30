// src/components/auth/PaidGate.tsx -- Premium access gate with purchase CTA
// Shows purchase button for non-paid users, renders children for paid users (ch11-23)
// AUTH-06: Stripe Checkout integration via /api/payment/create-session

import React, { useState, useEffect } from 'react'
import { authClient } from '../../lib/auth/client'
import { useLanguage } from '../../lib/i18n/useLanguage'

interface PaidGateProps {
  chapterSlug: string
  chapterTitle: string
  isAuthenticated: boolean
  children?: React.ReactNode
}

type FormState = 'idle' | 'loading' | 'success' | 'error'

export function PaidGate({ chapterSlug, chapterTitle, isAuthenticated, children }: PaidGateProps) {
  const { t } = useLanguage()
  const [isPaid, setIsPaid] = useState(false)
  const [checkingPayment, setCheckingPayment] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState('')

  // Check payment status on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setCheckingPayment(false)
      return
    }

    fetch('/api/auth/payment-status')
      .then(res => res.json())
      .then((data: { isPaid: boolean }) => {
        setIsPaid(data.isPaid)
        setCheckingPayment(false)
      })
      .catch(() => {
        setCheckingPayment(false)
      })
  }, [isAuthenticated])

  // If paid, render children (the player)
  if (isAuthenticated && isPaid && !checkingPayment) {
    return <>{children}</>
  }

  const handlePurchase = async () => {
    setPurchasing(true)
    setPurchaseError('')

    try {
      const res = await fetch('/api/payment/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error || 'Payment service unavailable')
      }

      const data = await res.json() as { url: string }
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : 'Something went wrong')
      setPurchasing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center px-6">
      {/* Premium dark background with radial gold glow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #0a0908 0%, #1a1410 40%, #0a0908 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(212, 168, 67, 0.04), transparent)',
        }}
      />

      {/* Content card */}
      <div
        className="relative w-full max-w-md rounded-2xl p-8 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(26, 23, 20, 0.98) 0%, rgba(13, 9, 7, 0.99) 100%)',
          border: '1px solid rgba(212, 168, 67, 0.3)',
          boxShadow: '0 0 60px rgba(212, 168, 67, 0.08), inset 0 1px 0 rgba(212, 168, 67, 0.15)',
        }}
      >
        {/* Decorative Andean corner accents */}
        <div className="absolute top-0 left-0 w-16 h-16 pointer-events-none" style={{ borderTop: '2px solid rgba(212, 168, 67, 0.3)', borderLeft: '2px solid rgba(212, 168, 67, 0.3)', borderRadius: '16px 0 0 0' }} />
        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none" style={{ borderTop: '2px solid rgba(212, 168, 67, 0.3)', borderRight: '2px solid rgba(212, 168, 67, 0.3)', borderRadius: '0 16px 0 0' }} />
        <div className="absolute bottom-0 left-0 w-16 h-16 pointer-events-none" style={{ borderBottom: '2px solid rgba(212, 168, 67, 0.3)', borderLeft: '2px solid rgba(212, 168, 67, 0.3)', borderRadius: '0 0 0 16px' }} />
        <div className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none" style={{ borderBottom: '2px solid rgba(212, 168, 67, 0.3)', borderRight: '2px solid rgba(212, 168, 67, 0.3)', borderRadius: '0 0 16px 0' }} />
        {/* Premium crown icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(212, 168, 67, 0.25) 0%, rgba(212, 168, 67, 0.1) 100%)',
            border: '1px solid rgba(212, 168, 67, 0.3)',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="#d4a843"
            className="w-8 h-8"
          >
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
          </svg>
        </div>

        {/* Chapter title */}
        <p className="text-xs font-heading uppercase tracking-widest text-center mb-1" style={{ color: '#d4a843' }}>
          {t('auth.paid.label')}
        </p>
        <h2 className="text-lg font-heading font-bold text-text-primary text-center mb-4 truncate">
          {chapterTitle}
        </h2>

        {/* Divider */}
        <div className="w-12 h-px mx-auto mb-4" style={{ background: '#d4a843' }} />

        {/* Main message */}
        <p className="text-base font-heading text-center text-text-primary mb-2">
          {t('auth.paid.message')}
        </p>

        {/* Premium content description */}
        <div
          className="rounded-lg p-4 mb-6"
          style={{
            background: 'rgba(212, 168, 67, 0.05)',
            border: '1px solid rgba(212, 168, 67, 0.1)',
          }}
        >
          <p className="text-xs font-heading uppercase tracking-widest mb-2" style={{ color: '#d4a843' }}>
            {t('auth.paid.includes')}
          </p>
          <ul className="text-sm text-text-secondary space-y-2">
            <li className="flex items-start gap-2">
              <span style={{ color: '#d4a843', fontSize: '10px', lineHeight: '1.6' }}>&#9830;</span>
              <span>{t('auth.paid.includes.chapters')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: '#d4a843', fontSize: '10px', lineHeight: '1.6' }}>&#9830;</span>
              <span>{t('auth.paid.includes.journey')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: '#d4a843', fontSize: '10px', lineHeight: '1.6' }}>&#9830;</span>
              <span>{t('auth.paid.includes.bilingual')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: '#d4a843', fontSize: '10px', lineHeight: '1.6' }}>&#9830;</span>
              <span>{t('auth.paid.includes.sync')}</span>
            </li>
          </ul>
        </div>

        {/* Purchase CTA or sign-up prompt */}
        {isAuthenticated ? (
          <>
            {purchaseError && (
              <p className="text-xs text-red-400 text-center mb-3">{purchaseError}</p>
            )}
            <button
              onClick={handlePurchase}
              disabled={purchasing || checkingPayment}
              className="block w-full py-3 px-4 rounded-lg text-center text-sm font-semibold text-volcanic transition-all hover:brightness-110 mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: purchasing ? 'linear-gradient(135deg, #9a7a30, #7a6020)' : 'linear-gradient(135deg, #d4a843, #b8922e)',
                fontFamily: "'Cinzel', serif",
                letterSpacing: '0.03em',
                boxShadow: '0 2px 8px rgba(212, 168, 67, 0.2)',
              }}
            >
              {purchasing ? t('auth.signin.sending') : t('auth.paid.cta.buy')}
            </button>
          </>
        ) : (
          <PaidGateSignup chapterSlug={chapterSlug} />
        )}

        {/* Listen to available chapters */}
        <a
          href="/listen/chapter-05"
          className="block w-full py-3 px-4 rounded-lg text-center text-sm font-semibold text-volcanic transition-all hover:brightness-110 mb-3"
          style={{
            background: 'linear-gradient(135deg, #d4a843, #b8922e)',
            fontFamily: "'Cinzel', serif",
            letterSpacing: '0.03em',
            boxShadow: '0 2px 8px rgba(212, 168, 67, 0.2)',
            opacity: isAuthenticated ? 0.7 : 1,
          }}
        >
          {t('auth.paid.listen.available')}
        </a>

        {/* Return to free chapters */}
        <a
          href="/listen/prologue"
          className="block w-full py-3 px-4 rounded-lg text-center text-sm font-semibold transition-all hover:bg-stone/20"
          style={{
            color: '#d4a843',
            border: '1px solid rgba(212, 168, 67, 0.3)',
          }}
        >
          {t('auth.paid.return')}
        </a>
      </div>
    </div>
  )
}

/** Inline email signup for unauthenticated users on paid gate */
function PaidGateSignup({ chapterSlug }: { chapterSlug: string }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const { t } = useLanguage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setState('loading')
    setErrorMessage('')

    try {
      await authClient.signIn.magicLink({
        email: email.trim(),
        callbackURL: `/listen/${chapterSlug}`,
      })
      setState('success')
    } catch (err) {
      setState('error')
      setErrorMessage(
        err instanceof Error ? err.message : 'Something went wrong.',
      )
    }
  }

  if (state === 'success') {
    return (
      <p className="text-sm text-text-secondary text-center mb-4">
        {t('auth.signin.check')}
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-3">
      <p className="text-sm text-text-secondary text-center mb-2" style={{ color: 'rgba(212, 168, 67, 0.7)' }}>
        {t('auth.paid.signup.prompt')}
      </p>
      <input
        type="email"
        required
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={state === 'loading'}
        className="w-full px-4 py-3 rounded-lg bg-volcanic/80 border border-text-dim/20 text-text-primary placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all disabled:opacity-50 text-sm"
      />
      {state === 'error' && errorMessage && (
        <p className="text-xs text-red-400">{errorMessage}</p>
      )}
      <button
        type="submit"
        disabled={state === 'loading'}
        className="w-full py-3 px-4 rounded-lg font-semibold text-volcanic text-sm transition-all disabled:opacity-50 min-h-[48px]"
        style={{
          background: state === 'loading'
            ? 'linear-gradient(135deg, #9a7a30, #7a6020)'
            : 'linear-gradient(135deg, #d4a843, #b8922e)',
          fontFamily: "'Cinzel', serif",
          letterSpacing: '0.03em',
          boxShadow: '0 2px 8px rgba(212, 168, 67, 0.2)',
        }}
      >
        {state === 'loading' ? t('auth.signin.sending') : t('auth.paid.signup.cta')}
      </button>
    </form>
  )
}
