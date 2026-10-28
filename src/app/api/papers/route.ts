// src/app/api/papers/route.ts
//
// GET  — public search/filter (only published papers) or admin list (all).
// POST — admin-only: insert a new paper record.
//
// Why two clients?
//   GET (public): server client with anon key; RLS filters to published rows.
//   GET (admin):  admin client to bypass the status = 'published' RLS policy
//                 so the admin sees draft papers too.
//   POST:         admin client because RLS only allows admins to insert, but
//                 the anon-key server client relies on the session's role and
//                 the is_admin() helper; we use the service-role client to keep
//                 things simple and avoid double-session reads.

import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { paperInsertSchema, searchSchema } from '@/lib/validations'

// ---------------------------------------------------------------------------
// Helper: verify admin — uses service-role client for profile read so RLS
// never blocks the check in production.
// ---------------------------------------------------------------------------
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const adminDb = createAdminClient()
  const { data: profile } = await adminDb.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return profile?.role === 'admin' ? user : null
}

// ---------------------------------------------------------------------------
// GET /api/papers
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Detect admin session so we can include drafts in the response.
  const adminUser = await requireAdmin()
  const queryClient = adminUser ? createAdminClient() : supabase

  const params = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = searchSchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { q, programme, course_code, level, year, semester, page, per_page } =
    parsed.data
  const offset = (page - 1) * per_page

  let query = queryClient
    .from('papers')
    .select('*, courses(*)', { count: 'exact' })

  // Non-admin requests only see published papers.
  if (!adminUser) {
    query = query.eq('status', 'published')
  }

  if (q) {
    query = query.textSearch('search_vec', q, {
      type: 'websearch',
      config: 'english',
    })
  }
  if (level) query = query.eq('level', String(level))
  if (year) query = query.eq('year', year)
  if (semester) query = query.eq('semester', semester)

  // Course-level filters — Supabase handles nested relation filtering.
  if (course_code) {
    query = query.ilike('courses.code', `${course_code}%`)
  }
  if (programme) {
    query = query.ilike('courses.programme', `%${programme}%`)
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + per_page - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('[GET /api/papers]', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ data, count, page, per_page })
}

// ---------------------------------------------------------------------------
// POST /api/papers  (admin only)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const adminUser = await requireAdmin()

  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = paperInsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  // Use admin client for insert so RLS does not interfere.
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('papers')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    console.error('[POST /api/papers]', error)
    return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
