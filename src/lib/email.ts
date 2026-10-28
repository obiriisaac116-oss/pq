// src/lib/email.ts
//
// Email helper using Nodemailer + Gmail SMTP.
// Requires GMAIL_USER and GMAIL_APP_PASSWORD environment variables.
// GMAIL_APP_PASSWORD must be a 16-character App Password generated at
// https://myaccount.google.com/apppasswords (not your regular Gmail password).

import nodemailer from 'nodemailer'

export interface ContactPayload {
  name: string
  email: string
  message: string
}

function createTransport() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    throw new Error('GMAIL_USER or GMAIL_APP_PASSWORD environment variable is not set')
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
}

/**
 * Sends a contact-form notification email to the admin.
 */
export async function sendContactNotification(
  payload: ContactPayload,
): Promise<void> {
  const { name, email, message } = payload

  const adminEmail = process.env.ADMIN_CONTACT_EMAIL ?? process.env.GMAIL_USER
  if (!adminEmail) {
    console.error('[email] No admin email configured (ADMIN_CONTACT_EMAIL)')
    return
  }

  const transport = createTransport()

  const html = `
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      <tbody>
        <tr>
          <th style="text-align:left;padding:6px 12px 6px 0;color:#374151">Name</th>
          <td style="padding:6px 0">${escapeHtml(name)}</td>
        </tr>
        <tr>
          <th style="text-align:left;padding:6px 12px 6px 0;color:#374151">Email</th>
          <td style="padding:6px 0"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td>
        </tr>
        <tr>
          <th style="text-align:left;padding:6px 12px 6px 0;color:#374151;vertical-align:top">Message</th>
          <td style="padding:6px 0;white-space:pre-wrap">${escapeHtml(message)}</td>
        </tr>
      </tbody>
    </table>
  `

  await transport.sendMail({
    from: `"PastQuestions GH" <${process.env.GMAIL_USER}>`,
    to: adminEmail,
    replyTo: email,
    subject: `[PastQuestions GH] New message from ${name.replace(/[\r\n]/g, ' ')}`,
    html,
  })

  console.log('[email] Contact notification sent to', adminEmail)
}

/**
 * Sends a notification to all subscribers when a new paper is published.
 */
export async function sendSubscriberNotification(
  paperTitle: string,
  paperUrl: string,
  subscriberEmails: string[],
): Promise<void> {
  if (subscriberEmails.length === 0) return

  const adminEmail = process.env.ADMIN_CONTACT_EMAIL ?? process.env.GMAIL_USER
  if (!adminEmail) {
    console.error('[email] No admin email configured')
    return
  }

  const transport = createTransport()

  const html = `
    <div style="font-family:sans-serif;font-size:14px;max-width:600px;margin:0 auto">
      <h2 style="color:#1d4ed8">New Paper Available on PastQuestions GH</h2>
      <p>A new past question paper has just been published:</p>
      <p style="font-size:16px;font-weight:bold;color:#111827">${escapeHtml(paperTitle)}</p>
      <p>
        <a href="${escapeHtml(paperUrl)}"
           style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
          View Paper
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
      <p style="color:#6b7280;font-size:12px">
        You are receiving this because you subscribed to PastQuestions GH updates.
      </p>
    </div>
  `

  await transport.sendMail({
    from: `"PastQuestions GH" <${process.env.GMAIL_USER}>`,
    to: adminEmail,
    bcc: subscriberEmails.length > 0 ? subscriberEmails.join(',') : undefined,
    subject: `New paper available: ${paperTitle}`,
    html,
  })

  console.log('[email] Subscriber notification sent, BCC:', subscriberEmails.length, 'subscribers')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
