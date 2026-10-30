// src/pages/api/payment/webhook.ts -- Stripe webhook endpoint
// POST /api/payment/webhook
// Receives Stripe events, verifies signature, flips isPaid=true on checkout.session.completed
// CRITICAL: uses raw body (request.text()) for signature verification

import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'Missing stripe-signature header' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET not configured')
    return new Response(
      JSON.stringify({ error: 'Webhook not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Read raw body for signature verification
  const body = await request.text()

  try {
    const { verifyWebhookSignature } = await import('../../../lib/payment/stripe')
    const event = verifyWebhookSignature(body, signature, webhookSecret)

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { metadata?: { userId?: string }; amount_total?: number | null }
      const userId = session.metadata?.userId

      if (userId) {
        try {
          // Update user's isPaid status in database
          const { drizzle } = await import('drizzle-orm/postgres-js')
          const { eq } = await import('drizzle-orm')
          const { sql } = await import('../../../lib/db/connection')
          const schema = await import('../../../lib/db/schema')
          const db = drizzle(sql, { schema })

          await db.update(schema.user).set({ isPaid: true }).where(eq(schema.user.id, userId))

          console.log(`[webhook] Payment successful: userId=${userId}, amount=${session.amount_total}`)
        } catch (dbErr) {
          console.error('[webhook] DB update failed:', dbErr)
          // Return 500 so Stripe retries
          return new Response(
            JSON.stringify({ error: 'Database update failed' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      } else {
        console.warn('[webhook] checkout.session.completed without userId metadata')
      }
    } else if (event.type === 'checkout.session.expired') {
      console.log('[webhook] Checkout session expired')
    }

    // Return 200 for all handled/unhandled events (Stripe retries on non-2xx)
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err)
    return new Response(
      JSON.stringify({ error: 'Webhook signature verification failed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
