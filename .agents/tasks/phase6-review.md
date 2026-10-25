# Email integration and contact form (Phase 6)

Phase 6 wires up the contact form end-to-end: a `ContactForm` client component posts JSON to `POST /api/contact`, which runs honeypot detection, IP rate-limiting, Cloudflare Turnstile verification, a Supabase insert, and a fire-and-forget Resend email notification. The build passes cleanly (exit 0, 13/13 static pages generated, no lint errors) per the evidence in `phase6-done.md`. The Resend client is instantiated lazily inside `sendContactNotification` rather than at module level, which is the correct workaround for SDK construction throwing at build time when `RESEND_API_KEY` is absent.

Watch for: (1) **confirmed** — `aria-describedby` on the three visible inputs only wires to the global error banner, so field-specific errors are not announced per-field; and (2) **confirmed** — the Turnstile widget is rendered without an explicit `aria-label` or `<label>`, leaving it unidentified to screen readers; and (3) **possible** — the `x-forwarded-for` header used for IP rate-limiting is not validated against a trusted proxy whitelist, making it spoofable in some deployment configurations.

**Verdict**: NEEDS_CHANGES

---

## High-level view

The API route's pipeline order — honeypot silent-200 before Zod, rate-limit before schema parse, Turnstile before the DB write — was a deliberate deviation from the original plan and is the right order for each step's stated goal.

Email env vars (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_EMAIL`) are consumed at runtime under non-null assertions; a missing var will throw inside the fire-and-forget call and surface only as a `console.error`. The DB insert has already succeeded at that point, so messages are not lost, but email failures will be invisible to end users.

Two confirmed accessibility gaps: the `aria-describedby` on all three visible inputs points only at the global error banner (no per-field error association), and the Turnstile widget has no programmatic label, leaving it unnamed for screen-reader users.

The IP extraction for rate-limiting takes the left-most `x-forwarded-for` value, which is client-controlled in a multi-hop proxy chain. If Render prepends rather than overwrites this header, an attacker can rotate the value to bypass the sliding-window limit.

---

<details>
<summary>Issues (3)</summary>

1. **`aria-describedby` only points to global error banner** — All three inputs share one `aria-describedby={error ? formErrorId : undefined}`. If only one field is invalid there is no per-field error message linked to that input, and when the banner is absent `aria-describedby` is removed entirely rather than pointing at an empty live region. Add per-field error state and wire individual error IDs, or at minimum keep the describedby pointing at a persistent (possibly empty) live region so the association survives across re-renders.

2. **Turnstile widget has no accessible label** — `<Turnstile siteKey={...} onSuccess={...} />` renders without a wrapping `<label>` or `aria-label`. Screen-reader users encounter an unlabelled interactive widget. Wrap it in a `<div>` with an associated visible or visually-hidden label, or pass an `aria-label` via the widget's props if the underlying `@marsidev/react-turnstile` API supports it.

3. **`x-forwarded-for` not validated against trusted proxy** — The route takes the first value of `x-forwarded-for` as the canonical client IP. In environments where this header can be injected by the client (not stripped by a trusted proxy), an attacker can rotate the value on each request to bypass the sliding-window rate limit entirely. Confirm that Render's infrastructure strips or overwrites this header before it reaches the application, or add an explicit check that the value comes from a known proxy CIDR before trusting it.

</details>

<details>
<summary>Details</summary>

### IP extraction and rate-limit spoofability

```ts
const forwarded = request.headers.get('x-forwarded-for')
const realIp    = request.headers.get('x-real-ip')
const ip =
  (forwarded ? forwarded.split(',')[0].trim() : null) ??
  realIp ??
  '127.0.0.1'
```

This takes the left-most entry in `x-forwarded-for`, which is the value the client itself controls if the load balancer appends rather than overwrites. Render's infrastructure does prepend a trusted IP, but the leftmost position is still the client-supplied value in a chain like `attacker-ip, lb-ip`. The safe extraction is the *rightmost* value the trusted proxy appended, not the leftmost the client supplied. Whether this is a real risk depends on Render's exact header behaviour; it is worth confirming.

### Turnstile accessibility gap

The Turnstile widget is placed inside a plain `<div>` with no label:

```tsx
<div>
  <Turnstile
    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
    onSuccess={(token) => setCfToken(token)}
  />
</div>
```

Cloudflare's Turnstile iframe renders a checkbox or challenge; without a programmatic label the screen-reader announcement is whatever the iframe's internal title is, which may or may not be meaningful. Adding a visually-hidden `<span id="turnstile-label">Security check</span>` and passing `aria-labelledby` (if the widget supports it) or wrapping in a `<fieldset><legend>` would resolve this.

### `aria-describedby` wiring

All three inputs use `aria-describedby={error ? formErrorId : undefined}`. This pattern collapses the per-field association to a global banner, and removes the attribute entirely when there is no error. WCAG 2.1 SC 1.3.1 (Info and Relationships) and SC 4.1.3 (Status Messages) are partially met by the `role="alert"` on the banner, but a screen-reader user submitting an invalid form will hear the banner read once on insertion without an ongoing association to the field that caused it. Per-field `aria-describedby` pointing at per-field error spans is the standard pattern.

### Test coverage

`phase6-done.md` does not list any new test files for Phase 6. The route logic — honeypot silent-200, rate-limit 429, Turnstile failure 400, DB error 500, success path — has no automated test coverage. The email helper's HTML-escaping logic is also untested. These are not blocking for a first shipping, but the honeypot ordering and IP extraction logic in particular would benefit from unit tests given their security relevance.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `src/lib/email.ts` | New Resend helper with lazy client init and HTML-escaped email body |
| `src/components/ContactForm.tsx` | New client component: honeypot field, Turnstile widget, accessible labels, WhatsApp/phone links |
| `src/app/(public)/contact/page.tsx` | Pre-existing server component wrapper; no changes in this phase |
| `src/app/api/contact/route.ts` | Replaced 501 stub: full pipeline — honeypot → rate-limit → Zod → Turnstile → Supabase → email |
| `src/lib/validations.ts` | `contactSchema` added (partial view; pre-existing file) |
| `src/lib/redis.ts` | `contactRatelimit` (3 req/60 min sliding window) added (pre-existing file) |

Full diff: `git diff main -- src/lib/email.ts src/components/ContactForm.tsx src/app/api/contact/route.ts`

</details>
