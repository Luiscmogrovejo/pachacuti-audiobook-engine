// src/lib/i18n/useLanguage.ts -- React hook for bilingual UI string access
// Reads language preference from the Zustand player store and provides a bound t() function.
// React islands use this hook; Astro components default to Spanish (server-rendered).

import { usePlayerStore } from '../../components/player/player-store'
import { t as translate } from './strings'
import type { UIStrings } from './strings'

/**
 * React hook that binds the i18n `t()` function to the current language preference.
 *
 * @example
 * function MyComponent() {
 *   const { lang, t } = useLanguage()
 *   return <h1>{t('hero.subtitle')}</h1>
 * }
 */
export function useLanguage() {
  const lang = usePlayerStore((s) => s.language)

  const t = (key: keyof UIStrings, params?: Record<string, string | number>): string => {
    return translate(key, lang, params)
  }

  return { lang, t }
}
