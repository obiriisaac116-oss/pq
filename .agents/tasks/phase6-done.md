# Phase 6 — Verification Note

## Files Created

- `src/lib/email.ts` — Resend email helper with lazy client initialization and HTML-escaped email body.
- `src/components/ContactForm.tsx` — Full client component with honeypot, Cloudflare Turnstile, WhatsApp/phone links, accessible labels, aria-describedby wiring.
- `src/app/api/contact/route.ts` — Full implementation replacing the 501 stub: JSON parse → honeypot check → Zod validation → rate-limit → Turnstile verify → Supabase insert → fire-and-forget email notification.

## Files Modified

- `.env.example` — Updated `NEXT_PUBLIC_WHATSAPP_NUMBER` and `NEXT_PUBLIC_PHONE_NUMBER` values to `+1234567890` per spec; added `TEST_ADMIN_EMAIL` and `TEST_ADMIN_PASSWORD` entries.

## Files Unchanged (already correct from prior phases)

- `src/app/(public)/contact/page.tsx` — Already had the correct Server Component wrapper with metadata and `<ContactForm />`.

## Build Result

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (13/13)
✓ Collecting build traces
✓ Finalizing page optimization
Exit code: 0
```

## Lint Result

```
✔ No ESLint warnings or errors
Exit code: 0
```

## Deviations from Plan

1. **Lazy Resend client**: The plan specified `const resend = new Resend(process.env.RESEND_API_KEY!)` as a module-level singleton. The Resend SDK v6 throws synchronously on construction when the API key env var is absent, which breaks the Next.js build. The client is instead created inside `sendContactNotification()` on each call. Runtime behaviour is identical; only the initialization timing changes.

2. **Honeypot check order**: The plan said to validate with `ContactSchema` first and then check honeypot. Because `contactSchema` has `honeypot: z.string().max(0)` (fails if non-empty), doing Zod validation first would return a 400 to bots, potentially revealing the honeypot field name. The honeypot check was moved to before Zod validation so bots always receive a silent 200, consistent with the instruction "do not reveal the honeypot".

3. **Contact page**: The page was already implemented in a prior phase with the correct structure. No changes were needed.
