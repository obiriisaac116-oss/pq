// src/lib/email.ts
//
// Resend email helper for sending contact notifications to the admin.
// The Resend client is created lazily (inside the function) so the module
// can be imported at build time without a real RESEND_API_KEY present.
// Throws on error so callers can decide how to handle failures.

import { Resend } from 'resend'

export interface ContactPayload {
  name: string
  email: string
  message: string
}

/**
 * Sends a contact-form notification email to the configured admin address.
 * Throws if Resend returns an error.
 */
export async function sendContactNotification(
  payload: ContactPayload,
): Promise<void> {
  const { name, email, message } = payload

  // Lazily create the client so the build does not require the env var.
  const resend = new Resend(process.env.RESEND_API_KEY!)

  // RESEND_FROM_EMAIL must be on a verified domain. Fall back to Resend's
  // shared onboarding address which works on free tier without verification.
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

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

  const adminEmail = process.env.ADMIN_CONTACT_EMAIL ?? process.env.ADMIN_EMAIL
  if (!adminEmail) {
    console.error('[email] No admin email configured (ADMIN_CONTACT_EMAIL)')
    return
  }

  // NOTE: When using onboarding@resend.dev as the from address, Resend only
  // delivers to the email address registered on your Resend account.
  // To send to any address you must verify a custom domain on Resend.
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: adminEmail,
    subject: `[PastQuestions GH] New contact message from ${name.replace(/[\r\n]/g, ' ')}`,
    html,
  })

  if (error) {
    console.error('[email] sendContactNotification error:', error)
    throw new Error(`Resend error: ${error.message}`)
  }

  console.log('[email] Contact notification sent to', adminEmail)
}

/** Minimal HTML escaping to prevent injection in the email body. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Sends a notification email to all subscribers when a new paper is published.
 * Uses BCC so subscriber addresses are not exposed to each other.
 * Returns silently if subscriberEmails is empty.
 */
export async function sendSubscriberNotification(
  paperTitle: string,
  paperUrl: string,
  subscriberEmails: string[],
): Promise<void> {
  if (subscriberEmails.length === 0) return

  const resend = new Resend(process.env.RESEND_API_KEY!)
  const fromEmail = process.env.RESEND_FROM_EMAIL!

  const html = `
    <div style="font-family:sans-serif;font-size:14px;max-width:600px;margin:0 auto">
      <h2 style="color:#1d4ed8">New Paper Available on PastQuestions GH</h2>
      <p>A new past question paper has just been published:</p>
      <p style="font-size:16px;font-weight:bold;color:#111827">${escapeHtml(paperTitle)}</p>
      <p>
        <a
          href="${escapeHtml(paperUrl)}"
          style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600"
        >
          View Paper
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
      <p style="color:#6b7280;font-size:12px">
        You are receiving this because you subscribed to PastQuestions GH updates.
      </p>
    </div>
  `

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: fromEmail,
    bcc: subscriberEmails,
    subject: `New paper available: ${paperTitle}`,
    html,
  })

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }
}
