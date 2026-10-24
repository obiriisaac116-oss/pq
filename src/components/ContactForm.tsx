'use client'

/**
 * ContactForm — Phase 5 placeholder.
 *
 * A full implementation (honeypot + Cloudflare Turnstile + POST /api/contact)
 * will be added in Phase 6. This component renders a "coming soon" notice so
 * the build passes and the route is navigable.
 */
export function ContactForm() {
  return (
    <div className="rounded-xl bg-yellow-50 p-6 ring-1 ring-yellow-200 text-center">
      <p className="text-base font-semibold text-yellow-800">
        Contact form coming soon
      </p>
      <p className="mt-2 text-sm text-yellow-700">
        We&rsquo;re setting up the contact form. Check back shortly, or reach
        us directly by email in the meantime.
      </p>
    </div>
  )
}
