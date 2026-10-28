import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET() {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  const to = process.env.ADMIN_CONTACT_EMAIL ?? process.env.ADMIN_EMAIL

  if (!key) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 })
  if (!to) return NextResponse.json({ error: 'ADMIN_CONTACT_EMAIL missing' }, { status: 500 })

  const resend = new Resend(key)

  // Send to the exact address, also CC it so we can see if it's a delivery issue
  const result = await resend.emails.send({
    from,
    to,
    subject: 'PQ Test ' + new Date().toISOString(),
    html: '<p>Test from PastQuestions GH at ' + new Date().toISOString() + '</p>',
  })

  // Full response — shows error details if any
  return NextResponse.json({
    data: result.data,
    error: result.error,
    config: { from, to, keyPrefix: key.slice(0, 10) },
  })
}
