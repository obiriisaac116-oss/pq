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

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.ADMIN_EMAIL!,
    subject: `New contact message from ${name.replace(/[\r\n]/g, ' ')}`,
    html,
  })

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }
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
