// src/app/api/papers/[id]/rate/route.ts
//
// POST — upsert a paper rating for a given session, return aggregate.

import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  sessionId: z.string().min(1),
})

interface RouteParams {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = rateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { rating, sessionId } = parsed.data
  const adminDb = createAdminClient()

  const { error: upsertError } = await adminDb
    .from('paper_ratings')
    .upsert(
      { paper_id: params.id, session_id: sessionId, rating },
      { onConflict: 'paper_id,session_id' },
    )

  if (upsertError) {
    console.error('[POST /api/papers/[id]/rate]', upsertError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const { data: rows, error: selectError } = await adminDb
    .from('paper_ratings')
    .select('rating')
    .eq('paper_id', params.id)

  if (selectError) {
    console.error('[POST /api/papers/[id]/rate] select', selectError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const ratingCount = rows?.length ?? 0
  const averageRating =
    ratingCount > 0
      ? (rows ?? []).reduce((sum, r) => sum + r.rating, 0) / ratingCount
      : 0

  return NextResponse.json({ averageRating, ratingCount })
}
