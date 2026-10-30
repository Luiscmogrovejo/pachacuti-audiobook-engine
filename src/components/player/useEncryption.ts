// src/components/player/useEncryption.ts -- React hook for encryption state
// Provides { enabled, sessionKey, authorized, loading, token } to player components
// Auto-fetches session key on mount if encryption is enabled

import { useState, useEffect, useRef } from 'react'
import { ENABLE_ENCRYPTION } from '../../lib/config'

interface EncryptionState {
  /** Whether encryption feature flag is enabled */
  enabled: boolean
  /** Non-extractable CryptoKey for decryption (null if disabled or loading) */
  sessionKey: CryptoKey | null
  /** List of chapter slugs the current session can decrypt */
  authorized: string[]
  /** Whether the session key is still being fetched */
  loading: boolean
  /** Raw base64 token for image API requests */
  token: string | null
}

/**
 * Hook for encryption-aware player components.
 * When ENABLE_ENCRYPTION is false, returns { enabled: false } immediately.
 * When true, fetches the session key on mount and provides decryption state.
 */
export function useEncryption(): EncryptionState {
  const [state, setState] = useState<EncryptionState>({
    enabled: ENABLE_ENCRYPTION,
    sessionKey: null,
    authorized: [],
    loading: ENABLE_ENCRYPTION, // only loading if encryption is enabled
    token: null,
  })

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    if (!ENABLE_ENCRYPTION) return

    // Dynamic import to avoid loading crypto modules when encryption is disabled
    import('../../lib/crypto/session.client').then(async ({ fetchSessionKey }) => {
      try {
        const { cryptoKey, authorizedChapters, rawKeyBase64 } = await fetchSessionKey()
        if (mountedRef.current) {
          setState({
            enabled: true,
            sessionKey: cryptoKey,
            authorized: authorizedChapters,
            loading: false,
            token: rawKeyBase64,
          })
        }
      } catch {
        if (mountedRef.current) {
          setState({
            enabled: true,
            sessionKey: null,
            authorized: [],
            loading: false,
            token: null,
          })
        }
      }
    })

    return () => {
      mountedRef.current = false
    }
  }, [])

  return state
}
