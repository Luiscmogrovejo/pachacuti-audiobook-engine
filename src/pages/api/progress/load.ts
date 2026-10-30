// src/pages/api/progress/load.ts -- Load all reading progress for authenticated user
// GET /api/progress/load
// Returns: { progress: [{ chapterSlug, language, currentTime, speed, updatedAt }] }

import type { APIRoute } from 'astro'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from '../../../lib/db/connection'
import { readingProgress } from '../../../lib/db/schema'

const db = drizzle(sql)

export const GET: APIRoute = async ({ request }) => {
  // Auth check via dynamic import
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
      chapterSlug: readingProgress.chapterSlug,
      language: readingProgress.language,
      currentTime: readingProgress.currentTime,
      speed: readingProgress.speed,
      updatedAt: readingProgress.updatedAt,
    })
    .from(readingProgress)
    .where(eq(readingProgress.userId, userId))

  return new Response(
    JSON.stringify({ progress: rows }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}
