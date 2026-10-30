// src/pages/api/auth/payment-status.ts -- Check user's payment status
// GET /api/auth/payment-status
// Returns: { isPaid: boolean }
// No session -> { isPaid: false } (200, not 401 -- avoids client errors)

import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ request }) => {
  try {
    const { getIsPaid } = await import('../../../lib/auth/server')
    const isPaid = await getIsPaid(request)

    return new Response(
      JSON.stringify({ isPaid }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch {
    // If auth server fails, return false (non-blocking)
    return new Response(
      JSON.stringify({ isPaid: false }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
