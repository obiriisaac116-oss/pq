// src/app/api/papers/[id]/route.ts
//
// GET    — fetch a single paper (public: published only; admin: any).
// PATCH  — admin-only: update paper fields.
// DELETE — admin-only: delete paper record AND the Storage object.
//
// Why the admin client for DELETE storage?
//   The service-role client bypasses RLS on storage.objects. The anon key
//   does not have DELETE permission on private bucket objects via RLS in the
//   default Supabase setup, so using the admin client ensures reliable removal
//   regardless of how the bucket policies are configured.

import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { paperUpdateSchema } from '@/lib/validations'
import { sendSubscriberNotification } from '@/lib/email'

// ---------------------------------------------------------------------------
// Helper: verify admin
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
// GET /api/papers/[id]
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()
  const adminUser = await requireAdmin(supabase)
  const queryClient = adminUser ? createAdminClient() : supabase

  let query = queryClient
    .from('papers')
    .select('*, courses(*)')
    .eq('id', params.id)

  if (!adminUser) {
    query = query.eq('status', 'published')
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    console.error('[GET /api/papers/[id]]', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ data })
}

// ---------------------------------------------------------------------------
// PATCH /api/papers/[id]  (admin only)
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

  const parsed = paperUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const adminClient = createAdminClient()

  // Confirm the paper exists before updating.
  const { data: existing } = await adminClient
    .from('papers')
    .select('id')
    .eq('id', params.id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error } = await adminClient
    .from('papers')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/papers/[id]]', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  // Fire-and-forget subscriber notification when a paper is published.
  if (parsed.data.status === 'published') {
    void (async () => {
      try {
        const { data: subs } = await adminClient.from('subscribers').select('email')
        const emails = (subs ?? []).map((s) => s.email)
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pq-questions26.onrender.com'
        await sendSubscriberNotification(data.title, `${siteUrl}/papers/${data.id}`, emails)
      } catch (e) {
        console.error('[PATCH /api/papers/[id]] subscriber notification failed:', e)
      }
    })()
  }

  return NextResponse.json({ data })
}

// ---------------------------------------------------------------------------
// DELETE /api/papers/[id]  (admin only)
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

  // Fetch the paper first so we know the file_path to remove from Storage.
  const { data: paper } = await adminClient
    .from('papers')
    .select('id, file_path')
    .eq('id', params.id)
    .maybeSingle()

  if (!paper) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Delete the paper record.
  const { error: dbError } = await adminClient
    .from('papers')
    .delete()
    .eq('id', params.id)

  if (dbError) {
    console.error('[DELETE /api/papers/[id]] db error:', dbError)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }

  // Remove the Storage object. Use the admin client because the private bucket
  // RLS would deny deletion via the anon key. Log errors but do not fail the
  // response — the DB record is already gone.
  const { error: storageError } = await adminClient.storage
    .from('papers')
    .remove([paper.file_path])

  if (storageError) {
    console.warn(
      '[DELETE /api/papers/[id]] storage removal failed (record deleted):',
      storageError,
    )
  }

  return new NextResponse(null, { status: 204 })
}
