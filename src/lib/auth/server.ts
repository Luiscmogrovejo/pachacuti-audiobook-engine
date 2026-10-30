// src/lib/auth/server.ts -- Better Auth server configuration
// Magic link auth via Resend, Drizzle adapter with PostgreSQL, JWT sessions

import { betterAuth } from 'better-auth'
import { magicLink } from 'better-auth/plugins/magic-link'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from '../db/connection'
import * as schema from '../db/schema'
import { Resend } from 'resend'

const resendKey = import.meta.env.RESEND_API_KEY || ''
const resend = resendKey ? new Resend(resendKey) : null

const db = drizzle(sql, { schema })

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  baseURL: import.meta.env.BETTER_AUTH_URL || 'http://localhost:4321',
  secret: import.meta.env.BETTER_AUTH_SECRET,
  session: {
    expiresIn: 60 * 60 * 24 * 30,  // 30 days
    updateAge: 60 * 60 * 24,        // refresh daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,               // 5-minute cache
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        if (!resend) {
          console.warn('[auth] Resend API key not configured -- magic link email skipped')
          return
        }
        await resend.emails.send({
          from: 'Pachacuti <noreply@robertamauta.com>',
          to: email,
          subject: 'Sign in to Pachacuti',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #0a0908; color: #e8e6e3; padding: 32px; border-radius: 12px;">
              <h2 style="color: #d4a843; margin: 0 0 16px;">Pachacuti</h2>
              <p>Click the link below to sign in to your account:</p>
              <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #d4a843; color: #0a0908; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0;">Sign In</a>
              <p style="color: #999; font-size: 12px; margin-top: 24px;">This link expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        })
      },
    }),
  ],
})

/**
 * Get the current session from a request.
 * Returns { user, session } or null if not authenticated.
 * Non-blocking -- does not redirect or return 403.
 */
export async function getSession(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  return session
}

/**
 * Check if the current user has paid access.
 * Returns true only if authenticated AND user.is_paid = true.
 * Returns false for unauthenticated users or non-paid users.
 */
export async function getIsPaid(request: Request): Promise<boolean> {
  const session = await getSession(request)
  if (!session) return false

  try {
    // Query user table directly for isPaid status
    const { eq } = await import('drizzle-orm')
    const result = await db.select({ isPaid: schema.user.isPaid }).from(schema.user).where(eq(schema.user.id, session.user.id)).limit(1)
    return result[0]?.isPaid ?? false
  } catch {
    // DB query failed -- fall back to false (non-blocking)
    return false
  }
}
