// src/components/universe/CharacterGridIsland.tsx -- Tiered character access control
// Free users: only Cusi, Rumi, Naymlap visible; rest shown blurred with lock
// Paid users: all 32 characters visible
// Access check is client-side via useSession + payment-status (UX incentive)

import React, { useState, useEffect } from 'react'
import { useSession } from '../../lib/auth/client'

interface CharacterMinimal {
  id: string
  slug: string
  name: string
  accent: string
  portrait: string
  title: string
}

interface CharacterGridIslandProps {
  characters: CharacterMinimal[]
  lang: 'es' | 'en'
}

const FREE_CHARACTER_IDS = ['cusi', 'rumi', 'naymlap']

export function CharacterGridIsland({ characters, lang }: CharacterGridIslandProps) {
  const { data: sessionData, isPending } = useSession()
  const isAuthenticated = !!sessionData?.session
  const [isPaid, setIsPaid] = useState(false)
  const [checkingPayment, setCheckingPayment] = useState(true)

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

  const isUnlocked = (charId: string) => {
    if (isPaid) return true
    return FREE_CHARACTER_IDS.includes(charId)
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
      {characters.map(character => {
        const unlocked = isUnlocked(character.id)
        const initial = character.name.charAt(0)

        if (unlocked) {
          return (
            <a
              key={character.id}
              href={`/characters/${character.slug}`}
              className="group block relative overflow-hidden rounded-xl transition-all hover:scale-105"
              style={{
                border: `1px solid color-mix(in srgb, ${character.accent} 20%, transparent)`,
                background: 'linear-gradient(180deg, rgba(26, 23, 20, 0.9) 0%, rgba(13, 9, 7, 0.95) 100%)',
              }}
            >
              <div className="aspect-[3/4] relative">
                <div className="absolute inset-0 flex items-center justify-center bg-stone/80">
                  <span
                    className="font-heading-decorative text-4xl select-none"
                    style={{ color: character.accent }}
                  >
                    {initial}
                  </span>
                </div>
                <img
                  src={character.portrait}
                  alt={character.name}
                  loading="lazy"
                  draggable={false}
                  className="relative w-full h-full object-cover z-10"
                />
              </div>
              <div className="p-3">
                <h3
                  className="font-heading text-sm font-bold truncate"
                  style={{ color: character.accent }}
                >
                  {character.name}
                </h3>
                <p className="text-xs text-text-dim truncate" style={{ fontFamily: "'Crimson Text', serif" }}>
                  {character.title}
                </p>
              </div>
            </a>
          )
        }

        // Locked character
        return (
          <div
            key={character.id}
            className="relative overflow-hidden rounded-xl"
            style={{
              border: '1px solid rgba(212, 168, 67, 0.1)',
              background: 'linear-gradient(180deg, rgba(26, 23, 20, 0.9) 0%, rgba(13, 9, 7, 0.95) 100%)',
            }}
            data-testid="character-card-locked"
          >
            <div className="aspect-[3/4] relative">
              <div className="absolute inset-0 flex items-center justify-center bg-stone/80">
                <span className="font-heading-decorative text-4xl select-none text-text-dim/30">
                  {initial}
                </span>
              </div>
              <img
                src={character.portrait}
                alt=""
                loading="lazy"
                className="relative w-full h-full object-cover z-10 blur-md brightness-40"
              />
              {/* Lock overlay */}
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="rgba(212,168,67,0.5)" strokeWidth={1.5} className="w-8 h-8 mb-1">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(212, 168, 67, 0.5)', fontFamily: "'Cinzel', serif" }}>
                  Premium
                </span>
              </div>
            </div>
            <div className="p-3">
              <h3 className="font-heading text-sm font-bold truncate text-text-dim/50">
                ???
              </h3>
              <p className="text-xs text-text-dim/30 truncate" style={{ fontFamily: "'Crimson Text', serif" }}>
                {lang === 'en' ? 'Premium character' : 'Personaje premium'}
              </p>
            </div>
          </div>
        )
      })}

      {/* Unlock CTA at the end of the grid */}
      {!isPaid && !isPending && !checkingPayment && (
        <a
          href={isAuthenticated ? '/payment' : '/auth/signin'}
          className="flex flex-col items-center justify-center rounded-xl p-4 transition-all hover:brightness-110"
          style={{
            border: '1px dashed rgba(212, 168, 67, 0.3)',
            background: 'rgba(212, 168, 67, 0.03)',
            minHeight: '200px',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth={1.5} className="w-8 h-8 mb-2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-sm font-heading text-center" style={{ color: '#d4a843', fontFamily: "'Cinzel', serif" }}>
            {isAuthenticated
              ? (lang === 'en' ? 'Unlock All Characters' : 'Desbloquear Todos')
              : (lang === 'en' ? 'Sign Up to Unlock' : 'Registrate')}
          </span>
        </a>
      )}
    </div>
  )
}
