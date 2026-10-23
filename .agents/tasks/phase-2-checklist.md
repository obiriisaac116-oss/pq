# Phase 2 Verification Checklist — Database Schema and RLS

Project root: `/home/hysterical/Desktop/PQ`
Stack: Next.js 14.2.29 · TypeScript 5.8.3 · @supabase/supabase-js 2.118.0
Run commands from the project root.

The SQL migrations are not executed by the build. Apply them against a real
Supabase project, then verify in the dashboard.

## Files produced this phase

- `supabase/migrations/001_schema.sql` — tables, indexes, FTS column, triggers
- `supabase/migrations/002_rls.sql` — RLS, policies, `is_admin()` /
  `increment_downloads()` / `handle_new_user()` functions, auth trigger
- `src/types/database.ts` — typed `Database` for `createClient<Database>`

## 1. Build gate (already run — must stay green)

```bash
npm run build
```

Expected: completes with zero TypeScript / ESLint errors and produces `.next/`.
`src/types/database.ts` is pure type declarations and must not break the build.

## 2. Apply the migrations to Supabase

Option A — Supabase CLI (preferred), from the project root:

```bash
# one-time: supabase login && supabase link --project-ref <project-ref>
supabase db push
```

Option B — psql against the database URL (run both files in order):

```bash
psql "$DATABASE_URL" -f supabase/migrations/001_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/002_rls.sql
```

Option C — Dashboard → SQL Editor: paste `001_schema.sql`, run it; then paste
`002_rls.sql`, run it. Order matters — `002_rls.sql` depends on the tables in
`001_schema.sql`.

## 3. Verify tables (Dashboard → Table Editor / SQL Editor)

```sql
-- all four tables present with the expected columns
\d public.profiles
\d public.courses
\d public.papers
\d public.contact_messages

-- generated FTS column + GIN index exist
SELECT indexdef FROM pg_indexes WHERE tablename = 'papers';

-- updated_at triggers exist
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgname IN ('papers_updated_at', 'profiles_updated_at', 'on_auth_user_created');
```

Expected column set for `papers`: `id, title, course_id (FK → courses, ON
DELETE SET NULL), year (int), semester (text), level (text), file_path,
file_type, status (CHECK published/draft), downloads (int default 0),
search_vec (tsvector generated), created_at, updated_at`. There is **no**
`file_size` column in this schema (intentional).

## 4. Verify RLS is enabled (Dashboard → Authentication → Policies)

```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('profiles','courses','papers','contact_messages');
-- relrowsecurity = t for all four
```

Expected policies:

- `profiles` — "Users can read own profile", "Users can update own profile",
  "Admins full access to profiles" (FOR ALL, is_admin())
- `courses` — "Public can read courses" (USING true), "Admins can manage
  courses" (FOR ALL, is_admin())
- `papers` — "Public can read published papers" (USING status='published'),
  "Admins can manage all papers" (FOR ALL, is_admin())
- `contact_messages` — "Anyone can submit contact message" (INSERT,
  WITH CHECK true), "Admins can read/update/delete contact messages"

## 5. Verify helper functions

```sql
-- admin check (run while signed in as an admin user → true; as a student → false)
SELECT public.is_admin();

-- the downloads incrementer is SECURITY DEFINER (owner bypasses RLS)
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname IN ('is_admin','increment_downloads','handle_new_user');
```

## 6. Smoke-test the auth trigger

Create a new user (Dashboard → Authentication → Users → Add user, or sign up
via the app). Then:

```sql
SELECT id, role, full_name, created_at FROM public.profiles WHERE id = '<new-user-id>';
-- expect role = 'student', created automatically by on_auth_user_created
```

## 7. Smoke-test public paper read + download counter

As an **anonymous** user (anon key):

```sql
-- should return only published papers
SELECT id, title, status FROM public.papers WHERE status = 'published';

-- draft papers must NOT be visible (RLS blocks them)
SELECT count(*) FROM public.papers;   -- = count of published only
```

From a client with the anon key:

```js
// published paper rows are readable
await supabase.from('papers').select('id,title').eq('status','published')

// anon cannot insert/update papers directly (RLS denies) — must use RPC:
await supabase.rpc('increment_downloads', { paper_id: '<published-paper-id>' })
// then re-read: downloads increased by 1; increments on a draft row do nothing
```

## 8. Git

```bash
git log --oneline | head -1     # Phase 2 commit
git status                      # working tree clean
```
