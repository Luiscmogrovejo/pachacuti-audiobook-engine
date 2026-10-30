// src/pages/api/bookmarks/delete.ts -- Delete a bookmark for authenticated user
// POST /api/bookmarks/delete { id }
// Verifies userId ownership before deleting
// Returns: { ok: true }

import type { APIRoute } from 'astro'
import { eq, and } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from '../../../lib/db/connection'
import { bookmark } from '../../../lib/db/schema'

const db = drizzle(sql)

export const POST: APIRoute = async ({ request }) => {
  const { getSession } = await import('../../../lib/auth/server')
  const session = await getSession(request)

  if (!session) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Parse body
  let body: { id?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { id } = body

  if (!id) {
    return new Response(
      JSON.stringify({ error: 'Missing bookmark id' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const userId = session.user.id

  // Delete only if the bookmark belongs to this user (ownership check)
  const result = await db
    .delete(bookmark)
    .where(
      and(
        eq(bookmark.id, id),
        eq(bookmark.userId, userId),
      ),
    )

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}
