/// <reference path="../.astro/types.d.ts" />

// Server-side environment variables (not exposed to client)
interface ImportMetaEnv {
  readonly TURNSTILE_SECRET_KEY?: string
  readonly AUDIO_TOKEN_SECRET?: string
  readonly AUDIO_BASE_PATH?: string
  readonly BETTER_AUTH_SECRET?: string
  readonly BETTER_AUTH_URL?: string
  readonly RESEND_API_KEY?: string
  readonly DATABASE_URL?: string
  readonly CONTENT_MASTER_KEY?: string
  readonly STRIPE_SECRET_KEY?: string
  readonly STRIPE_WEBHOOK_SECRET?: string
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string
  readonly PUBLIC_BETTER_AUTH_URL?: string
  readonly PUBLIC_ENABLE_ENCRYPTION?: string
  readonly PUBLIC_STRIPE_PRICE_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Extend Astro.locals with auth session data (populated by middleware)
declare namespace App {
  interface Locals {
    user?: { id: string; email: string; name?: string }
    session?: { id: string; token: string; expiresAt: Date }
  }
}
