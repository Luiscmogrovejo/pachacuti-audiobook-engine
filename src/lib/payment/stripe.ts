// src/lib/payment/stripe.ts -- Stripe server-side client for Pachacuti payment processing
// Lazy initialization: Stripe instance only created if STRIPE_SECRET_KEY is set
// Guards: every usage checks `if (!stripe)` before calling Stripe API

import Stripe from 'stripe'

const key = import.meta.env.STRIPE_SECRET_KEY

/** Stripe instance (null if STRIPE_SECRET_KEY not configured) */
export const stripe = key
  ? new Stripe(key, { apiVersion: '2026-03-25.dahlia' })
  : null

if (!key) {
  console.warn('[stripe] STRIPE_SECRET_KEY not configured -- payment features disabled')
}

interface CreateCheckoutParams {
  userId: string
  email: string
  priceId: string
  successUrl: string
  cancelUrl: string
}

/**
 * Create a Stripe Checkout session for one-time payment.
 * Returns the checkout session URL for redirect.
 */
export async function createCheckoutSession({
  userId,
  email,
  priceId,
  successUrl,
  cancelUrl,
}: CreateCheckoutParams): Promise<string | null> {
  if (!stripe) return null

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    metadata: { userId },
    success_url: successUrl,
    cancel_url: cancelUrl,
  })

  return session.url
}

/**
 * Verify a Stripe webhook signature and return the event.
 * Throws on invalid signature.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string,
): Stripe.Event {
  if (!stripe) throw new Error('Stripe not configured')
  return stripe.webhooks.constructEvent(body, signature, secret)
}
