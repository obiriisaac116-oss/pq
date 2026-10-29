# Past Questions

A Next.js 14 (App Router) website for browsing and downloading exam papers,
backed by Supabase (Postgres + Auth + Storage). An admin area lets authorised
staff upload and manage papers.

## Tech stack

- Next.js 14.2.29 (App Router) · React 18 · TypeScript 5.8
- Tailwind CSS 3.4
- Supabase via `@supabase/ssr` cookie sessions
- Zod validation · Resend email · Upstash Redis rate limiting
- Deployed on Render

---

## Local setup

1. Install Node 20 (use `nvm use 20` or download from nodejs.org).

2. Clone the repo:

   ```bash
   git clone https://github.com/obiriisaac116-oss/pq.git
   cd pq
   ```

3. Copy the env template and fill in values:

   ```bash
   cp .env.example .env.local
   ```

4. Install dependencies:

   ```bash
   npm install
   ```

5. Start the dev server:

   ```bash
   npm run dev
   ```

   The app runs at <http://localhost:3000>.

---

## Supabase setup

1. Create a project at <https://supabase.com>.
2. In the Supabase **SQL Editor**, run the contents of
   `supabase/migrations/001_schema.sql` then `supabase/migrations/002_rls.sql`.
3. Go to **Storage** and create a private bucket named `papers`.
4. Set CORS on the `papers` bucket to allow `PUT` requests from your site URL
   (`NEXT_PUBLIC_SITE_URL`).
5. Copy the **Project URL** and **anon key** from **Project Settings → API**
   into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
6. Copy the **service role key** into `.env.local` as
   `SUPABASE_SERVICE_ROLE_KEY` (never expose this in the browser).

---

## Resend setup

1. Sign up at <https://resend.com>.
2. Verify your sending domain under **Domains**.
3. Create an API key under **API Keys**.
4. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in `.env.local`.

---

## Upstash setup

1. Create a Redis database at <https://upstash.com>.
2. Copy the **REST URL** and **REST token** from the database console.
3. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in `.env.local`.

---

## Cloudflare Turnstile

1. Go to <https://dash.cloudflare.com> → **Turnstile**.
2. Create a widget for your domain.
3. Copy the **site key** to `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and the
   **secret key** to `TURNSTILE_SECRET_KEY` in `.env.local`.

---

## Render deploy

1. Connect your GitHub repo on <https://render.com>.
2. Select **Web Service** and choose the **Node** runtime.
3. Set:
   - **Build command**: `npm ci && npm run build`
   - **Start command**: `npm start`
4. In the **Environment** tab, add all variables from `.env.example` with real
   values.
5. The service auto-deploys on every push to `main`.

The `render.yaml` in this repo pre-configures the service; Render will detect
it automatically when you link the repo.

---

## Cloudflare DNS

1. After Render gives you a `.onrender.com` URL, log in to Cloudflare and
   open your domain's DNS settings.
2. Add a **CNAME** record pointing your domain (e.g. `www`) to the
   `.onrender.com` hostname.
3. Enable **WAF** and **DDoS protection** in the Cloudflare dashboard.
4. Enable **caching** rules for the `/` and `/papers/*` paths.

---

## Admin setup

After the first deploy:

1. In the Supabase dashboard go to **Authentication → Users → Invite** and
   create a user with an email and password.
2. In the **SQL Editor**, promote that user to admin:

   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = '<user-id>';
   ```

3. Visit `/login` and sign in — you will be redirected to `/admin`.

---

## Running tests

Unit tests (no live services required):

```bash
npx vitest run
```

End-to-end tests (requires dev server running on port 3100):

```bash
npx playwright test --project=chromium
```

---

## New Features

The following 23 improvements have been implemented on top of the original codebase:

1. **Paper ratings** — users can rate papers out of 5 stars; ratings are stored and averaged per paper.
2. **Paper archive** — admin can archive papers to hide them from public listings without deletion.
3. **Activity log** — all admin actions (upload, edit, delete, archive) are recorded in an activity log table.
4. **Scheduled publish** — papers can be set to publish automatically at a future date/time.
5. **Paper tags** — freeform tags can be attached to papers and used for filtering.
6. **Contact form** — public contact page with Cloudflare Turnstile CAPTCHA and email notification to admin.
7. **Email via Brevo API** — switched from SMTP to Brevo transactional API for reliable delivery.
8. **Rate limiting** — Upstash Redis rate limiting on the contact and subscribe endpoints.
9. **Newsletter subscribe** — visitors can subscribe to a mailing list; subscriptions are stored in Supabase.
10. **Paper download tracking** — each download is counted and displayed on the paper detail page.
11. **Admin dashboard stats** — dashboard shows paper count, download totals, message count, and subscriber count.
12. **Course management** — admin can create and edit courses; papers are linked to courses.
13. **Messages table** — admin inbox lists all contact form submissions with read/unread status.
14. **Paper search** — full-text search across paper titles and course names on the public listing page.
15. **Filter panel** — filter papers by course, level, and year on the public listing page.
16. **Paper detail page** — individual paper page with metadata, rating widget, and download button.
17. **Presigned upload** — large files are uploaded directly to Supabase Storage via a presigned URL.
18. **PWA manifest & service worker** — `manifest.json` and `sw.js` enable add-to-home-screen on mobile.
19. **Light-mode-only UI** — dark mode removed; consistent light theme across all pages.
20. **Brand colours** — primary (`#1d4ed8`) and accent (`#7c3aed`) applied consistently via Tailwind config.
21. **Accessibility improvements** — focus-visible rings, ARIA labels on icon buttons, and semantic HTML.
22. **`~hysterical` watermark** — owner attribution span retained in the root layout.
23. **Cron secret protection** — `/api/cron/*` routes require a `CRON_SECRET` bearer token.

---

## Security

### Two-Factor Authentication (2FA) for admin

2FA was not implemented in code because it is handled entirely by Supabase. To enable it:

1. In the Supabase dashboard go to **Authentication → MFA settings** and enable **TOTP**.
2. On next admin login, Supabase will prompt you to scan a QR code in your authenticator app (Google Authenticator, Authy, etc.).
3. After scanning, enter the 6-digit code to complete enrolment.

From that point on every admin sign-in requires both the password and a fresh TOTP code.

### Student accounts (planned)

Student accounts (item 20 in the original improvement list) are planned for a future release.
They require new auth flows — email verification, password reset, per-student download quotas — that are not yet implemented.

---

## Database Migrations

Apply migrations via the Supabase dashboard **SQL Editor** or with `supabase db push`, strictly in order.
All scripts use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` so they are safe to re-run.

| File | Purpose |
|------|---------|
| `001_schema.sql` | Base schema: `papers`, `profiles`, `courses` tables |
| `002_rls.sql` | Row-Level Security policies for all tables |
| `003_subscribers.sql` | `subscribers` table for newsletter sign-ups |
| `004_ratings.sql` | `paper_ratings` table and average-rating view |
| `005_archive.sql` | `archived_at` column on `papers` |
| `006_activity_log.sql` | `activity_log` table for admin audit trail |
| `007_scheduled_publish.sql` | `publish_at` column on `papers` for scheduled publishing |
| `008_tags.sql` | `tags` table and `paper_tags` join table |

---

## Environment Variables

All variables are listed in `.env.example`. Key additions:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service-role key (server only) |
| `UPSTASH_REDIS_REST_URL` | ✅ | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Upstash Redis REST token |
| `BREVO_API_KEY` | ✅ | Brevo transactional email API key |
| `BREVO_FROM_EMAIL` | ✅ | Sender address for outgoing emails |
| `ADMIN_CONTACT_EMAIL` | ✅ | Admin email that receives contact notifications |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | ✅ | Cloudflare Turnstile site key (public) |
| `TURNSTILE_SECRET_KEY` | ✅ | Cloudflare Turnstile secret key (server only) |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Canonical site URL for CORS and absolute links |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | optional | WhatsApp number shown on contact page |
| `NEXT_PUBLIC_PHONE_NUMBER` | optional | Phone number shown on contact page |
| `CRON_SECRET` | ✅ | Bearer token that protects `/api/cron/*` routes |

### Generating `CRON_SECRET`

```bash
openssl rand -hex 32
```

Paste the output as the value of `CRON_SECRET` in your `.env.local` (local) and in Render's **Environment** tab (production).
