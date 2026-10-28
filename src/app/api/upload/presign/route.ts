// src/app/api/upload/presign/route.ts
//
// Admin-only endpoint. Validates the intended upload (filename, MIME type,
// size) then issues a Supabase Storage presigned upload URL. The file never
// passes through this server — the browser uploads directly to Storage.
//
// Why the admin (service-role) client?
//   `createSignedUploadUrl` on a PRIVATE bucket requires INSERT permission on
//   the storage.objects table. The anon key cannot grant that server-side
//   because the RLS policies on the bucket do not allow anonymous principals;
//   using the service-role client bypasses RLS entirely, which is safe because
//   the admin session check happens before we touch storage.

import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { presignSchema } from '@/lib/validations'

const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

export async function POST(request: NextRequest) {
  // ── 1. Verify admin session ───────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminCheck = createAdminClient()
  const { data: profile } = await adminCheck.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // ── 2. Parse + validate request body ─────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = presignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { contentType } = parsed.data
  const ext = MIME_TO_EXT[contentType]
  const objectPath = `papers/${crypto.randomUUID()}.${ext}`

  // ── 3. Generate presigned upload URL via service-role client ──────────────
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.storage
    .from('papers')
    .createSignedUploadUrl(objectPath)

  if (error || !data) {
    console.error('[presign] storage error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to generate upload URL' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
  })
}
