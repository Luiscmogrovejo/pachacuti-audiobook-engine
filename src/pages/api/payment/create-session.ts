// src/pages/api/payment/create-session.ts -- Create Stripe Checkout session
// POST /api/payment/create-session
// Requires authenticated session. Returns { url: "https://checkout.stripe.com/..." }

import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request }) => {
  // Require authenticated session
  const { getSession } = await import('../../../lib/auth/server')
  const session = await getSession(request)

  if (!session) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Check if Stripe is configured
  const { stripe, createCheckoutSession } = await import('../../../lib/payment/stripe')
  if (!stripe) {
    return new Response(
      JSON.stringify({ error: 'Payment service not configured. Please try again later.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const priceId = import.meta.env.PUBLIC_STRIPE_PRICE_ID
  if (!priceId) {
    return new Response(
      JSON.stringify({ error: 'Payment product not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    const origin = new URL(request.url).origin
    const url = await createCheckoutSession({
      userId: session.user.id,
      email: session.user.email,
      priceId,
      successUrl: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/payment`,
    })

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout session' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ url }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    console.error('[payment] Checkout session creation failed:', err)
    return new Response(
      JSON.stringify({ error: 'Payment service error. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
