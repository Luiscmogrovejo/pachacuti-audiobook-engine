// src/pages/api/bookmarks/save.ts -- Save a bookmark for authenticated user
// POST /api/bookmarks/save { chapterSlug, time, language, label }
// Returns: { bookmark: { id, chapterSlug, time, language, label, createdAt } }

import type { APIRoute } from 'astro'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from '../../../lib/db/connection'
import { bookmark } from '../../../lib/db/schema'
import { VALID_SLUGS } from '../../../lib/data/chapters'

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
  let body: { chapterSlug?: string; time?: number; language?: string; label?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { chapterSlug, time, language, label } = body

  if (!chapterSlug || !VALID_SLUGS.has(chapterSlug)) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing chapterSlug' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (typeof time !== 'number' || time < 0) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing time' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (!language || !['es', 'en'].includes(language)) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing language' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const userId = session.user.id
  const now = new Date()
  const id = `${userId}-${Date.now()}`

  const [inserted] = await db
    .insert(bookmark)
    .values({
      id,
      userId,
      chapterSlug,
      time: Math.floor(time),
      language,
      label: label ?? null,
      createdAt: now,
    })
    .returning()

  return new Response(
    JSON.stringify({ bookmark: inserted }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}
