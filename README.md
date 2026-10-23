# Past Questions

A Next.js 14 (App Router) website for browsing, searching, and downloading past
examination papers, backed by Supabase (Postgres + Auth + Storage). An
admin area lets authorised staff upload and manage papers.

## Tech stack

- Next.js 14.2.29 (App Router) · React 18 · TypeScript 5.8
- Tailwind CSS 3.4
- Supabase via `@supabase/ssr` cookie sessions
- Zod validation · Resend email · Upstash Redis rate limiting

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env template and fill in the values:

   ```bash
   cp .env.example .env.local
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

4. Build for production:

   ```bash
   npm run build
   ```

The build does **not** require real credentials — every Supabase client factory
reads environment variables at runtime inside the function, never at module
top-level.

## Authentication & the first admin

Authentication uses Supabase Auth (email/password) with cookie-based sessions
managed by `@supabase/ssr`. Access to `/admin/*` is enforced by
`src/middleware.ts`, which runs on the Edge runtime:

- Unauthenticated users are redirected to `/login?error=auth-required`.
- Authenticated users whose `profiles.role` is not `admin` are redirected to
  `/login?error=not-admin`.
- Authenticated admins visiting `/login` are redirected to `/admin`.

The middleware uses only the public anon key (never the service-role key) and
reads the caller's own `profiles.role` row — RLS allows `auth.uid() = id` — so
admin checks work without exposing the service-role key to the edge.

### Seeding the first admin

The `profiles` table is populated automatically with `role = 'student'` when a
user signs up, via the `on_auth_user_created` trigger in
`supabase/migrations/002_rls.sql`. There is **no public sign-up UI**, so the
first admin must be seeded manually:

1. In the Supabase dashboard, go to **Authentication → Users → Add user** and
   create a user with an email and password.
2. Open the SQL Editor (or Table Editor → `profiles`) and promote that user:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = '<the-new-user-id>';
   ```

3. Visit `/login` and sign in with those credentials — you will be redirected
   to `/admin`.

Only users with `profiles.role = 'admin'` can reach the admin area; everyone
else is redirected to `/login`.
