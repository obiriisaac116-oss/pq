import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.BREVO_API_KEY
  const from = process.env.BREVO_FROM_EMAIL
  const to = process.env.ADMIN_CONTACT_EMAIL

  const config = {
    BREVO_API_KEY: apiKey ? apiKey.slice(0, 10) + '...' : 'MISSING',
    BREVO_FROM_EMAIL: from ?? 'MISSING',
    ADMIN_CONTACT_EMAIL: to ?? 'MISSING',
  }

  if (!apiKey || !from || !to) {
    return NextResponse.json({ error: 'Missing env vars', config }, { status: 500 })
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        sender: { email: from, name: 'PastQuestions GH' },
        to: [{ email: to }],
        subject: 'PQ Test Email — ' + new Date().toISOString(),
        htmlContent: '<p>✅ Email working via Brevo HTTP API!</p>',
      }),
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data, config }, { status: 500 })
    return NextResponse.json({ success: true, messageId: data.messageId, config })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Unknown error',
      config,
    }, { status: 500 })
  }
}
