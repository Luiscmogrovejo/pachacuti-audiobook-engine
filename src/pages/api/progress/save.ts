// src/pages/api/progress/save.ts -- Save reading progress for authenticated users
// POST /api/progress/save { chapterSlug, language, currentTime, speed }
// UPSERT into readingProgress table (insert or update if user+chapter+language exists)

import type { APIRoute } from 'astro'
import { eq, and } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from '../../../lib/db/connection'
import { readingProgress } from '../../../lib/db/schema'
import { VALID_SLUGS } from '../../../lib/data/chapters'

const db = drizzle(sql)

export const POST: APIRoute = async ({ request }) => {
  // Auth check via dynamic import (avoid loading auth on module init)
  const { getSession } = await import('../../../lib/auth/server')
  const session = await getSession(request)

  if (!session) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Parse body
  let body: { chapterSlug?: string; language?: string; currentTime?: number; speed?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { chapterSlug, language, currentTime, speed } = body

  // Validate
  if (!chapterSlug || !VALID_SLUGS.has(chapterSlug)) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing chapterSlug' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (!language || !['es', 'en'].includes(language)) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing language (must be "es" or "en")' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (typeof currentTime !== 'number' || currentTime < 0) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing currentTime' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const userId = session.user.id
  const now = new Date()

  // UPSERT: check if record exists, then insert or update
  const existing = await db
    .select({ id: readingProgress.id })
    .from(readingProgress)
    .where(
      and(
        eq(readingProgress.userId, userId),
        eq(readingProgress.chapterSlug, chapterSlug),
        eq(readingProgress.language, language),
      ),
    )
    .limit(1)

  if (existing.length > 0) {
    // Update existing record
    await db
      .update(readingProgress)
      .set({
        currentTime: Math.floor(currentTime),
        speed: speed ?? '1',
        updatedAt: now,
      })
      .where(eq(readingProgress.id, existing[0].id))
  } else {
    // Insert new record
    await db.insert(readingProgress).values({
      id: `${userId}-${chapterSlug}-${language}`,
      userId,
      chapterSlug,
      language,
      currentTime: Math.floor(currentTime),
      speed: speed ?? '1',
      updatedAt: now,
    })
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}
