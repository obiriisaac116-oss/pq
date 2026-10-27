// src/app/api/courses/[id]/route.ts
//
// PATCH  — admin-only: update course fields.
// DELETE — admin-only: delete a course record.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Helper: verify admin (same pattern as /api/papers/[id]/route.ts)
// ---------------------------------------------------------------------------
async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return profile?.role === 'admin' ? user : null
}

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const CourseUpdateSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(2).max(200).optional(),
  programme: z.string().min(2).max(200).nullable().optional(),
})

// ---------------------------------------------------------------------------
// PATCH /api/courses/[id]  (admin only)
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()
  const adminUser = await requireAdmin(supabase)

  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CourseUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const adminClient = createAdminClient()

  // Confirm the course exists before updating.
  const { data: existing } = await adminClient
    .from('courses')
    .select('id')
    .eq('id', params.id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error } = await adminClient
    .from('courses')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/courses/[id]]', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// ---------------------------------------------------------------------------
// DELETE /api/courses/[id]  (admin only)
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()
  const adminUser = await requireAdmin(supabase)

  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminClient = createAdminClient()

  // Fetch the course first to confirm it exists.
  const { data: course } = await adminClient
    .from('courses')
    .select('id')
    .eq('id', params.id)
    .maybeSingle()

  if (!course) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await adminClient
    .from('courses')
    .delete()
    .eq('id', params.id)

  if (error) {
    console.error('[DELETE /api/courses/[id]]', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
