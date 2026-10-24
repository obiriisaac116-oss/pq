// src/app/api/papers/[id]/download/route.ts
//
// GET — issue a 5-minute presigned download URL for a published paper,
//       atomically increment the downloads counter, then redirect the browser.
//
// Rate-limited to 30 requests per IP per 60 minutes (downloadRatelimit).
//
// Why admin client for createSignedUrl?
//   The 'papers' bucket is private. Generating a signed URL for a private
//   object requires service-role access; the anon key cannot do it without
//   bucket-level public-read, which we intentionally avoid.
//
// Why admin client for rpc('increment_downloads')?
//   The function is SECURITY DEFINER so it bypasses RLS, but it still needs
//   to be callable. Calling via the admin client avoids potential permission
//   issues if the anon key's EXECUTE grant is not set.

import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { downloadRatelimit } from '@/lib/redis'

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // ── 1. Rate limit ─────────────────────────────────────────────────────────
  const ip = getIp(request)
  const { success } = await downloadRatelimit.limit(ip)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    )
  }

  // ── 2. Fetch paper (must be published for public access) ──────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const adminClient = createAdminClient()

  // Admins can download drafts; public users can only download published.
  let paperQuery = adminClient
    .from('papers')
    .select('id, file_path, status')
    .eq('id', params.id)

  if (!user) {
    // Check admin role only when we have a session.
    paperQuery = paperQuery.eq('status', 'published')
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      paperQuery = paperQuery.eq('status', 'published')
    }
  }

  const { data: paper, error: paperError } = await paperQuery.maybeSingle()

  if (paperError) {
    console.error('[download]', paperError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  if (!paper) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // ── 3. Generate presigned download URL (5-minute expiry) ──────────────────
  const { data: signedData, error: signedError } = await adminClient.storage
    .from('papers')
    .createSignedUrl(paper.file_path, 300)

  if (signedError || !signedData) {
    console.error('[download] signed URL error:', signedError)
    return NextResponse.json(
      { error: 'Could not generate download URL' },
      { status: 500 },
    )
  }

  // ── 4. Increment download counter ─────────────────────────────────────────
  const { error: rpcError } = await adminClient.rpc('increment_downloads', {
    paper_id: params.id,
  })
  if (rpcError) {
    // Non-fatal: log but don't fail the download.
    console.warn('[download] increment_downloads failed:', rpcError)
  }

  // ── 5. Return the signed URL (client opens in new tab) ────────────────────
  return NextResponse.json({ url: signedData.signedUrl })
}
