// src/app/api/contact/route.ts
//
// POST — contact form submission.
// Validates input, checks honeypot, rate-limits by IP, verifies Turnstile
// CAPTCHA, inserts into contact_messages, and fires an email notification.

import { NextRequest, NextResponse } from 'next/server'
import { contactSchema } from '@/lib/validations'
import { contactRatelimit } from '@/lib/redis'
import { createClient } from '@/lib/supabase/server'
import { sendContactNotification } from '@/lib/email'

export async function POST(request: NextRequest) {
  // 1. Parse body
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 2. Honeypot check — must happen before schema validation so bots get a
  //    silent 200 rather than a 400 that reveals the field name.
  if (typeof body.honeypot === 'string' && body.honeypot !== '') {
    return NextResponse.json({ success: true })
  }

  // 3. Get client IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip =
    (forwarded ? forwarded.split(',')[0].trim() : null) ??
    realIp ??
    '127.0.0.1'

  // 4. Rate limiting — placed before Zod validation so malformed requests
  //    also consume quota and cannot be used to probe the schema at scale.
  const { success: rateLimitOk } = await contactRatelimit.limit(ip)
  if (!rateLimitOk) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // 5. Validate with ContactSchema
  const parsed = contactSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid input'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { name, email, message, cf_token } = parsed.data

  // 6. Verify Cloudflare Turnstile
  const turnstileBody = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY!,
    response: cf_token,
    remoteip: ip,
  })

  const turnstileRes = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: turnstileBody.toString(),
    },
  )

  const turnstileData = (await turnstileRes.json()) as { success: boolean }
  if (turnstileData.success !== true) {
    return NextResponse.json(
      { error: 'Captcha verification failed' },
      { status: 400 },
    )
  }

  // 7. Insert into contact_messages
  const supabase = await createClient()
  const { error: dbError } = await supabase
    .from('contact_messages')
    .insert({ name, email, message })

  if (dbError) {
    console.error('contact_messages insert error:', dbError)
    return NextResponse.json(
      { error: 'Failed to save message. Please try again.' },
      { status: 500 },
    )
  }

  // 8. Email notification — fire-and-forget
  sendContactNotification({ name, email, message }).catch((err) =>
    console.error('[contact] Email send failed:', err instanceof Error ? err.message : err),
  )

  return NextResponse.json({ success: true })
}
