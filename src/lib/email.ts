// src/lib/email.ts
//
// Email via Brevo HTTP API (not SMTP — Render blocks outbound SMTP ports).
// Free tier: 300 emails/day, sends to any address, no domain verification needed.
//
// Required env vars:
//   BREVO_API_KEY       — API key from Brevo → SMTP & API → API Keys tab
//   BREVO_FROM_EMAIL    — verified sender email in Brevo (your Gmail)
//   ADMIN_CONTACT_EMAIL — where contact form notifications are delivered

export interface ContactPayload {
  name: string
  email: string
  message: string
}

async function brevoSend(payload: {
  to: { email: string; name?: string }[]
  sender: { email: string; name: string }
  replyTo?: { email: string }
  subject: string
  htmlContent: string
  bcc?: { email: string }[]
}) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY is not set')

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Brevo API error ${res.status}: ${text}`)
  }

  return res.json()
}

/**
 * Sends a contact-form notification email to the admin.
 */
export async function sendContactNotification(
  payload: ContactPayload,
): Promise<void> {
  const { name, email, message } = payload

  const adminEmail = process.env.ADMIN_CONTACT_EMAIL
  if (!adminEmail) {
    console.error('[email] ADMIN_CONTACT_EMAIL is not set')
    return
  }

  const fromEmail = process.env.BREVO_FROM_EMAIL
  if (!fromEmail) {
    console.error('[email] BREVO_FROM_EMAIL is not set')
    return
  }

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

  await brevoSend({
    sender: { email: fromEmail, name: 'PastQuestions GH' },
    to: [{ email: adminEmail }],
    replyTo: { email },
    subject: `[PastQuestions GH] New message from ${name.replace(/[\r\n]/g, ' ')}`,
    htmlContent: html,
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

  const adminEmail = process.env.ADMIN_CONTACT_EMAIL
  const fromEmail = process.env.BREVO_FROM_EMAIL
  if (!adminEmail || !fromEmail) {
    console.error('[email] Missing ADMIN_CONTACT_EMAIL or BREVO_FROM_EMAIL')
    return
  }

  const html = `
    <div style="font-family:sans-serif;font-size:14px;max-width:600px;margin:0 auto">
      <h2 style="color:#1d4ed8">New Paper Available on PastQuestions GH</h2>
      <p>A new past question paper has just been published:</p>
      <p style="font-size:16px;font-weight:bold;color:#111827">${escapeHtml(paperTitle)}</p>
      <p>
        <a href="${escapeHtml(paperUrl)}"
           style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
          View Paper
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
      <p style="color:#6b7280;font-size:12px">You subscribed to PastQuestions GH updates.</p>
    </div>
  `

  await brevoSend({
    sender: { email: fromEmail, name: 'PastQuestions GH' },
    to: [{ email: adminEmail }],
    bcc: subscriberEmails.map((e) => ({ email: e })),
    subject: `New paper available: ${paperTitle}`,
    htmlContent: html,
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
