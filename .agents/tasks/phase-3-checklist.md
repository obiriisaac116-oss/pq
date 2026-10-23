# Phase 3 Verification Checklist — Authentication and Admin Role

Project root: `/home/hysterical/Desktop/PQ`
Stack: Next.js 14.2.29 · @supabase/ssr 0.12.7 · @supabase/supabase-js 2.118.0
Run commands from the project root.

## Files produced this phase

- `src/lib/supabase/client.ts` — `createBrowserClient<Database>` (anon, client)
- `src/lib/supabase/server.ts` — `createServerClient<Database>` (anon, cookies)
- `src/lib/supabase/admin.ts` — service-role client (`import 'server-only'`)
- `src/middleware.ts` — Edge middleware: session refresh + `/admin` guard
- `src/app/(admin)/login/page.tsx` — server-rendered login shell
- `src/components/LoginForm.tsx` — client form (email/password sign-in)
- `README.md` — setup + "Seeding the first admin" docs

## 1. Set environment variables

Copy the template and fill in the Supabase values:

```bash
cp .env.example .env.local
```

Required for auth to work at runtime:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-only; never in client/middleware
```

> The `npm run build` gate must pass **without** these set — env vars are read
> inside each client factory at runtime, not at module top-level.

## 2. Build gate

```bash
npm run build
```

Expected: completes with zero TypeScript / ESLint errors and produces `.next/`.
Confirm the middleware matcher is `['/admin/:path*', '/login']` in
`src/middleware.ts` (static assets and `/api` are intentionally not matched).

## 3. Apply the migrations (if not already done in Phase 2)

```bash
supabase db push
# or paste supabase/migrations/001_schema.sql then 002_rls.sql in the SQL Editor
```

The `on_auth_user_created` trigger (in `002_rls.sql`) auto-inserts a
`profiles` row with `role = 'student'` for every new auth user.

## 4. Create the first admin user

1. Supabase dashboard → **Authentication → Users → Add user** (email + password).
   This fires the trigger and creates a `profiles` row with `role = 'student'`.
2. Promote that user to admin (SQL Editor or Table Editor → `profiles`):

   ```sql
   select id, role from public.profiles where email = '<the-user-email>';
   -- (profiles has no email column; look the id up in Auth → Users)

   update public.profiles
   set role = 'admin'
   where id = '<the-user-id>';

   select id, role from public.profiles where id = '<the-user-id>';
   -- expect role = admin
   ```

## 5. Test the login page

```bash
npm run dev   # http://localhost:3000
```

- Visit `/login` while signed out → the form renders with the email field
  focused, visible labels, and a disabled "Signing in…" state while submitting.
- Sign in with the admin credentials → redirected to `/admin`.
- Sign in with wrong credentials → inline error (`role="alert"`) and focus
  returns to the email field.

## 6. Test /admin protection (middleware)

Run with `npm run dev` and verify redirects:

| State | Request | Expected |
|---|---|---|
| Signed out | `/admin` | → `/login?error=auth-required` |
| Signed out | `/admin/papers` | → `/login?error=auth-required` |
| Student (non-admin) | `/admin` | → `/login?error=not-admin` |
| Admin, already signed in | `/login` | → `/admin` |
| Admin | `/admin` | passes through (page itself lands in Phase 4) |

Confirm the login page surfaces the `error` query as a message above the form
(`auth-required` and `not-admin` are mapped in
`src/app/(admin)/login/page.tsx`).

Edge-safety check: `src/middleware.ts` must **not** import `@supabase/supabase-js`
service-role usage or the `'server-only'` admin client — only the anon
`createServerClient` from `@supabase/ssr`. The service-role key
(`SUPABASE_SERVICE_ROLE_KEY`) must never appear in middleware or client code.

## 7. Server-only guarantee

Confirm the admin client cannot reach the browser bundle:

```bash
grep -rn "server-only" src/lib/supabase/admin.ts   # import present
# Importing admin.ts from a Client Component throws at build time.
```

## 8. Git

```bash
git log --oneline | head -1     # Phase 3 commit
git status                      # working tree clean
```
