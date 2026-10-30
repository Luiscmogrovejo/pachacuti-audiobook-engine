// src/pages/api/auth/[...all].ts -- Catch-all API route for Better Auth
// Handles: magic link send, magic link verify, session check, sign out, etc.
// Better Auth routes all its internal endpoints through this handler.

import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth/server'

const handleAuth: APIRoute = async ({ request }) => {
  return auth.handler(request)
}

// Better Auth needs all HTTP methods
export const GET = handleAuth
export const POST = handleAuth
