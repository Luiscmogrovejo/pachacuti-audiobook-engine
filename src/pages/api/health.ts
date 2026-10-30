// src/pages/api/health.ts -- Health check endpoint for k8s readiness/liveness probes
// Always returns 200 (Astro server running = healthy)
// DB status is informational only (DB down should not kill the pod -- static pages still work)

import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
  const checks: Record<string, string> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  }

  // Optional: DB connectivity check (non-blocking -- don't fail health on DB issues)
  try {
    const { sql } = await import('../../lib/db/connection')
    await sql`SELECT 1`
    checks.database = 'connected'
  } catch {
    checks.database = 'disconnected'
  }

  return new Response(JSON.stringify(checks), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
