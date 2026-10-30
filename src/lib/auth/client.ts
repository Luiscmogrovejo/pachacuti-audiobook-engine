// src/lib/auth/client.ts -- Better Auth React client for use in interactive islands
// Provides useSession hook and signIn/signOut methods

import { createAuthClient } from 'better-auth/react'
import { magicLinkClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: import.meta.env.PUBLIC_BETTER_AUTH_URL || 'http://localhost:4321',
  plugins: [magicLinkClient()],
})

// Export hooks and methods for React components
export const { useSession, signIn, signOut } = authClient
