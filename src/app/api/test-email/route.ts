import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function GET() {
  const user = process.env.BREVO_SMTP_USER
  const pass = process.env.BREVO_SMTP_KEY
  const from = process.env.BREVO_FROM_EMAIL ?? user
  const to = process.env.ADMIN_CONTACT_EMAIL

  const config = {
    BREVO_SMTP_USER: user ? user : 'MISSING',
    BREVO_SMTP_KEY: pass ? pass.slice(0, 10) + '...' : 'MISSING',
    BREVO_FROM_EMAIL: from ?? 'MISSING',
    ADMIN_CONTACT_EMAIL: to ?? 'MISSING',
  }

  if (!user || !pass || !to) {
    return NextResponse.json({ error: 'Missing env vars', config }, { status: 500 })
  }

  try {
    const transport = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: { user, pass },
    })

    const info = await transport.sendMail({
      from: `"PastQuestions GH" <${from}>`,
      to,
      subject: 'PQ Test Email — ' + new Date().toISOString(),
      html: '<p>✅ Email is working! Sent via Brevo SMTP.</p>',
    })

    return NextResponse.json({ success: true, messageId: info.messageId, config })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Unknown error',
      config,
    }, { status: 500 })
  }
}
