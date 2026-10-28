// Temporary test endpoint — remove after confirming email works
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET() {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  const to = process.env.ADMIN_CONTACT_EMAIL ?? process.env.ADMIN_EMAIL

  // Return config state without exposing full key
  const config = {
    hasApiKey: !!key,
    apiKeyPrefix: key ? key.slice(0, 8) + '...' : 'MISSING',
    from,
    to: to ?? 'MISSING',
  }

  if (!key) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not set', config }, { status: 500 })
  }
  if (!to) {
    return NextResponse.json({ error: 'ADMIN_CONTACT_EMAIL is not set', config }, { status: 500 })
  }

  try {
    const resend = new Resend(key)
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: 'PastQuestions GH — Test Email',
      html: '<p>This is a test email from PastQuestions GH. If you see this, email is working! ✅</p>',
    })

    if (error) {
      return NextResponse.json({ error: error.message, config }, { status: 500 })
    }

    return NextResponse.json({ success: true, messageId: data?.id, config })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Unknown error',
      config,
    }, { status: 500 })
  }
}
