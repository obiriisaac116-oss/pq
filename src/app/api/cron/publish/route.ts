// src/app/api/cron/publish/route.ts
//
// Cron endpoint: publish papers whose publish_at is in the past.
// Called by Render's cron service every 15 minutes.
// Protected by x-cron-secret header matching CRON_SECRET env var.

import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Validate cron secret
  const cronSecret = process.env.CRON_SECRET
  const headerSecret = request.headers.get('x-cron-secret')

  if (!cronSecret || headerSecret !== cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()

  // Find all draft papers with a publish_at <= now
  const { data: papers, error } = await db
    .from('papers')
    .select('id, title')
    .eq('status', 'draft')
    .eq('archived', false)
    .not('publish_at', 'is', null)
    .lte('publish_at', new Date().toISOString())

  if (error) {
    console.error('[cron/publish] query error:', error)
    return Response.json({ error: 'DB error' }, { status: 500 })
  }

  let publishedCount = 0

  for (const paper of papers ?? []) {
    const { error: updateError } = await db
      .from('papers')
      .update({ status: 'published', publish_at: null })
      .eq('id', paper.id)

    if (updateError) {
      console.error('[cron/publish] update error for', paper.id, updateError)
      continue
    }

    publishedCount++

    // Fire-and-forget activity log
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    fetch(`${siteUrl}/api/admin/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'paper_scheduled_published',
        details: { id: paper.id, title: paper.title },
      }),
    }).catch(() => {})
  }

  return Response.json({ published: publishedCount })
}
