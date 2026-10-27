// src/app/api/subscribe/route.ts
//
// POST — subscribe an email address to new-paper notifications.
//
// Rate-limited to 3 requests per IP per 60 minutes to prevent abuse.
// Duplicate emails return 200 with "Already subscribed!" rather than an error.

import { NextRequest, NextResponse } from 'next/server'

import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { subscribeRatelimit } from '@/lib/redis'

// Zod v4: z.email() is top-level (not z.string().email())
const SubscribeSchema = z.object({
  email: z.email().max(254),
})

export async function POST(request: NextRequest) {
  // 1. Get IP for rate limiting
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'

  // 2. Rate limit check
  const { success } = await subscribeRatelimit.limit(ip)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    )
  }

  // 3. Parse JSON body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // 4. Validate
  const parsed = SubscribeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid email address.' },
      { status: 400 },
    )
  }

  // 5. Insert into subscribers table
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('subscribers')
    .insert({ email: parsed.data.email })

  // 6. Unique violation — already subscribed
  if (error?.code === '23505') {
    return NextResponse.json({ message: 'Already subscribed!' }, { status: 200 })
  }

  // 7. Other DB error
  if (error) {
    console.error('[POST /api/subscribe]', error)
    return NextResponse.json({ error: 'Subscription failed.' }, { status: 500 })
  }

  // 8. Success
  return NextResponse.json({ message: 'Subscribed successfully!' }, { status: 200 })
}
