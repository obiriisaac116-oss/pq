// src/app/api/messages/[id]/route.ts
//
// PATCH — admin-only: toggle read/unread on a contact message.
//
// Why admin (service-role) client for the update?
//   RLS policy "Admins can update contact_messages" uses is_admin() which
//   requires the session cookie to be present. The service-role client
//   bypasses RLS entirely. We still verify the admin session via the anon-key
//   server client first so the service-role write only happens after explicit
//   authorisation.

import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const patchSchema = z.object({
  read: z.boolean(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // ── 1. Verify admin session ───────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  // ── 3. Update via admin client ────────────────────────────────────────────
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('contact_messages')
    .update({ read: parsed.data.read })
    .eq('id', params.id)
    .select()
    .maybeSingle()

  if (error) {
    console.error('[PATCH /api/messages/[id]]', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ data })
}
