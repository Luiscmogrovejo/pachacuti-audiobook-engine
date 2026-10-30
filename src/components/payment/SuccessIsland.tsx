// src/components/payment/SuccessIsland.tsx -- Payment success page React island
// Polls /api/auth/payment-status until isPaid=true (webhook may be delayed)
// Shows celebratory animation + CTA to start listening to ch11

import React, { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../../lib/i18n/useLanguage'

const MAX_POLLS = 15     // 15 polls x 2s = 30s max
const POLL_INTERVAL = 2000 // 2 seconds

export function SuccessIsland() {
  const [isPaid, setIsPaid] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    // Initial check
    checkPaymentStatus()

    // Start polling
    pollRef.current = setInterval(() => {
      setPollCount(prev => {
        if (prev >= MAX_POLLS) {
          if (pollRef.current) clearInterval(pollRef.current)
          setTimedOut(true)
          return prev
        }
        checkPaymentStatus()
        return prev + 1
      })
    }, POLL_INTERVAL)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const checkPaymentStatus = async () => {
    try {
      const res = await fetch('/api/auth/payment-status')
      const data = await res.json() as { isPaid: boolean }
      if (data.isPaid) {
        setIsPaid(true)
        if (pollRef.current) clearInterval(pollRef.current)
      }
    } catch {
      // Ignore errors, keep polling
    }
  }

  // Payment confirmed
  if (isPaid) {
    return (
      <div className="text-center py-8">
        {/* Confetti animation via CSS keyframes */}
        <style>{`
          @keyframes confetti-fall {
            0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(300px) rotate(720deg); opacity: 0; }
          }
          .confetti-piece {
            position: absolute;
            width: 8px;
            height: 8px;
            animation: confetti-fall 3s ease-out forwards;
          }
        `}</style>

        {/* Confetti pieces */}
        <div className="relative h-0 overflow-visible">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece rounded-full"
              style={{
                left: `${10 + (i * 7)}%`,
                top: '-20px',
                background: i % 3 === 0 ? '#d4a843' : i % 3 === 1 ? '#b8922e' : '#e6c65a',
                animationDelay: `${i * 0.15}s`,
                width: `${6 + (i % 3) * 4}px`,
                height: `${6 + (i % 3) * 4}px`,
              }}
            />
          ))}
        </div>

        {/* Success checkmark */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(212, 168, 67, 0.25) 0%, rgba(212, 168, 67, 0.1) 100%)',
            border: '2px solid rgba(212, 168, 67, 0.4)',
            boxShadow: '0 0 40px rgba(212, 168, 67, 0.15)',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth={2.5} className="w-12 h-12">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2
          className="text-2xl md:text-3xl font-heading font-bold mb-3"
          style={{ color: '#d4a843', fontFamily: "'Cinzel', serif" }}
        >
          {t('payment.success.title')}
        </h2>
        <p className="text-text-secondary text-lg mb-8" style={{ fontFamily: "'Crimson Text', serif" }}>
          {t('payment.success.message')}
        </p>

        <a
          href="/listen/chapter-11"
          className="inline-block px-10 py-4 rounded-lg font-semibold text-volcanic text-lg transition-all hover:brightness-110"
          style={{
            background: 'linear-gradient(135deg, #d4a843, #b8922e)',
            fontFamily: "'Cinzel', serif",
            letterSpacing: '0.03em',
            boxShadow: '0 4px 16px rgba(212, 168, 67, 0.3)',
          }}
        >
          {t('payment.success.cta')}
        </a>
      </div>
    )
  }

  // Timed out -- still show success (webhook may be delayed beyond our poll window)
  if (timedOut) {
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
          {t('payment.success.title')}
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
            boxShadow: '0 4px 16px rgba(212, 168, 67, 0.3)',
          }}
        >
          {t('payment.success.cta')}
        </a>
      </div>
    )
  }

  // Processing -- polling in progress
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-6 relative">
        <div
          className="w-full h-full rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'rgba(212, 168, 67, 0.3)', borderTopColor: 'transparent' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="#d4a843" className="w-6 h-6">
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
          </svg>
        </div>
      </div>
      <h2
        className="text-xl font-heading font-bold mb-2"
        style={{ color: '#d4a843', fontFamily: "'Cinzel', serif" }}
      >
        {t('payment.processing')}
      </h2>
      <p className="text-sm text-text-dim">
        {pollCount > 5 ? 'Almost there...' : ''}
      </p>
    </div>
  )
}
