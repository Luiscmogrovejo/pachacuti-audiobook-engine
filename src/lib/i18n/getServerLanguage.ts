// src/lib/i18n/getServerLanguage.ts -- Read language preference for Astro SSR pages
// Reads the pachacuti-lang cookie set by the player store.
// Defaults to 'es' (Spanish) when no cookie is present (first visit).

import type { AstroGlobal } from 'astro'

export function getServerLanguage(Astro: AstroGlobal): 'es' | 'en' {
  const cookie = Astro.cookies.get('pachacuti-lang')
  const value = cookie?.value
  if (value === 'en') return 'en'
  return 'es'
}
