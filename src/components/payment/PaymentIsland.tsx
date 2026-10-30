// src/components/payment/PaymentIsland.tsx -- Payment page React island
// Shows product info, purchase button, or "already paid" message
// Handles POST to /api/payment/create-session and redirect to Stripe Checkout

import React, { useState, useEffect } from 'react'
import { useSession } from '../../lib/auth/client'
import { useLanguage } from '../../lib/i18n/useLanguage'

export function PaymentIsland() {
  const { data: sessionData, isPending } = useSession()
  const isAuthenticated = !!sessionData?.session
  const [isPaid, setIsPaid] = useState(false)
  const [checkingPayment, setCheckingPayment] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [error, setError] = useState('')
  const { t } = useLanguage()

  // Check payment status
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

  const handlePurchase = async () => {
    setPurchasing(true)
    setError('')

    try {
      const res = await fetch('/api/payment/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error || 'Payment failed')
      }

      const data = await res.json() as { url: string }
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('payment.error'))
      setPurchasing(false)
    }
  }

  if (isPending || checkingPayment) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(212, 168, 67, 0.3)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  // Already paid
  if (isAuthenticated && isPaid) {
    return (
      <div className="text-center py-8">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(212, 168, 67, 0.15)', border: '1px solid rgba(212, 168, 67, 0.3)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth={2} className="w-10 h-10">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2
          className="text-2xl font-heading font-bold mb-3"
          style={{ color: '#d4a843', fontFamily: "'Cinzel', serif" }}
        >
          {t('payment.already_paid')}
        </h2>
        <p className="text-text-secondary mb-6" style={{ fontFamily: "'Crimson Text', serif" }}>
          {t('payment.success.message')}
        </p>
        <a
          href="/listen/chapter-11"
          className="inline-block px-8 py-3 rounded-lg font-semibold text-volcanic transition-all hover:brightness-110"
          style={{
            background: 'linear-gradient(135deg, #d4a843, #b8922e)',
            fontFamily: "'Cinzel', serif",
            letterSpacing: '0.03em',
            boxShadow: '0 2px 12px rgba(212, 168, 67, 0.3)',
          }}
        >
          {t('payment.success.cta')}
        </a>
      </div>
    )
  }

  return (
    <div>
      {/* Product info */}
      <div className="text-center mb-8">
        {/* Crown icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(212, 168, 67, 0.25) 0%, rgba(212, 168, 67, 0.1) 100%)',
            border: '1px solid rgba(212, 168, 67, 0.3)',
          }}
        >
          <svg viewBox="0 0 24 24" fill="#d4a843" className="w-10 h-10">
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
          </svg>
        </div>

        <h2
          className="text-2xl md:text-3xl font-heading font-bold mb-2"
          style={{ color: '#d4a843', fontFamily: "'Cinzel', serif" }}
        >
          {t('payment.product.name')}
        </h2>
        <p className="text-text-secondary text-lg" style={{ fontFamily: "'Crimson Text', serif" }}>
          {t('payment.product.description')}
        </p>
      </div>

      {/* What's included */}
      <div
        className="rounded-xl p-6 mb-8"
        style={{
          background: 'rgba(212, 168, 67, 0.05)',
          border: '1px solid rgba(212, 168, 67, 0.15)',
        }}
      >
        <h3 className="text-sm font-heading uppercase tracking-widest mb-4" style={{ color: '#d4a843' }}>
          {t('auth.paid.includes')}
        </h3>
        <ul className="space-y-3">
          {[
            t('payment.includes.chapters'),
            t('payment.includes.gallery'),
            t('payment.includes.characters'),
            t('payment.includes.sync'),
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <svg viewBox="0 0 20 20" fill="#d4a843" className="w-5 h-5 flex-shrink-0 mt-0.5">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-text-primary" style={{ fontFamily: "'Crimson Text', serif" }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Purchase CTA */}
      {error && (
        <p className="text-sm text-red-400 text-center mb-4">{error}</p>
      )}

      {isAuthenticated ? (
        <button
          onClick={handlePurchase}
          disabled={purchasing}
          className="w-full py-4 px-6 rounded-lg font-semibold text-volcanic text-lg transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
          style={{
            background: purchasing
              ? 'linear-gradient(135deg, #9a7a30, #7a6020)'
              : 'linear-gradient(135deg, #d4a843, #b8922e)',
            fontFamily: "'Cinzel', serif",
            letterSpacing: '0.03em',
            boxShadow: '0 4px 16px rgba(212, 168, 67, 0.3)',
          }}
        >
          {purchasing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
              </svg>
              {t('payment.processing')}
            </span>
          ) : (
            t('payment.cta.purchase')
          )}
        </button>
      ) : (
        <a
          href="/auth/signin"
          className="block w-full py-4 px-6 rounded-lg font-semibold text-volcanic text-lg text-center transition-all hover:brightness-110"
          style={{
            background: 'linear-gradient(135deg, #d4a843, #b8922e)',
            fontFamily: "'Cinzel', serif",
            letterSpacing: '0.03em',
            boxShadow: '0 4px 16px rgba(212, 168, 67, 0.3)',
          }}
        >
          {t('payment.cta.signin_first')}
        </a>
      )}

      {/* Security note */}
      <p className="text-xs text-text-dim text-center mt-4" style={{ fontFamily: "'Crimson Text', serif" }}>
        {t('auth.paid.includes.bilingual')}
      </p>
    </div>
  )
}
