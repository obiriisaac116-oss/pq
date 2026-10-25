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
