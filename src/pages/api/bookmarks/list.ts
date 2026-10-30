// src/pages/api/bookmarks/list.ts -- List all bookmarks for authenticated user
// GET /api/bookmarks/list
// Returns: { bookmarks: [{ id, chapterSlug, time, language, label, createdAt }] }

import type { APIRoute } from 'astro'
import { eq, desc } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from '../../../lib/db/connection'
import { bookmark } from '../../../lib/db/schema'

const db = drizzle(sql)

export const GET: APIRoute = async ({ request }) => {
  const { getSession } = await import('../../../lib/auth/server')
  const session = await getSession(request)

  if (!session) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const userId = session.user.id

  const rows = await db
    .select({
      id: bookmark.id,
      chapterSlug: bookmark.chapterSlug,
      time: bookmark.time,
      language: bookmark.language,
      label: bookmark.label,
      createdAt: bookmark.createdAt,
    })
    .from(bookmark)
    .where(eq(bookmark.userId, userId))
    .orderBy(desc(bookmark.createdAt))

  return new Response(
    JSON.stringify({ bookmarks: rows }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}
