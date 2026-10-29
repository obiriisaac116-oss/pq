// src/app/api/request/route.ts
//
// POST — submit a paper request. Rate-limited by IP.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requestRatelimit } from '@/lib/redis'

interface RequestBody {
  courseCode: string
  year: number
  semester: string
  level: string
  notes: string
  email?: string
}

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'

  const { success } = await requestRatelimit.limit(ip)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    )
  }

  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { courseCode, year, semester, level, notes, email } = body

  if (!courseCode || !year || !semester || !level) {
    return NextResponse.json(
      { error: 'courseCode, year, semester, and level are required' },
      { status: 400 },
    )
  }

  const adminDb = createAdminClient()
  const { error } = await adminDb.from('contact_messages').insert({
    name: 'Paper Request',
    email: email || 'request@noreply.invalid',
    message: `[REQUEST]\nCourse: ${courseCode}\nYear: ${year}\nSemester: ${semester}\nLevel: ${level}\nNotes: ${notes}`,
  })

  if (error) {
    console.error('[POST /api/request]', error)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
