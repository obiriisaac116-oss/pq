# Implementation Plan — Past Questions Website

> This plan is the authoritative reference for all 8 implementation phases.
> Each coder step must read this file first and follow one phase completely
> before marking it done.

---

## Pinned Package Versions

| Package | Version | Notes |
|---|---|---|
| `next` | `14.2.29` | Latest 14.x stable; exempt from CVE-2025-66478 (App Router RSC RCE only affects 14.3.0-canary.77+, 15.x, 16.x) |
| `react` / `react-dom` | `18.3.1` | Peer of Next 14 |
| `typescript` | `5.8.3` | |
| `@types/node` | `20.19.9` | |
| `@types/react` / `@types/react-dom` | `18.3.23` | |
| `tailwindcss` | `3.4.17` | v3 — uses `tailwind.config.ts`; v4 dropped that file format |
| `autoprefixer` | `10.4.21` | |
| `postcss` | `8.5.6` | |
| `@supabase/supabase-js` | `2.118.0` | |
| `@supabase/ssr` | `0.12.7` | Cookie-based session for SSR/middleware |
| `zod` | `4.6.7` | |
| `resend` | `6.34.1` | Node >=20 |
| `@upstash/redis` | `1.39.0` | HTTP/REST Redis, edge-compatible |
| `@upstash/ratelimit` | `2.2.0` | Peer: `@upstash/redis ^1.38.2` |
| `vitest` | `2.1.9` | Pinned to 2.x — compatible with Node 18+; vitest 5.x requires Node >=22 |
| `@vitest/coverage-v8` | `2.1.9` | Match vitest version |
| `@playwright/test` | `1.64.1` | |
| `eslint` | `8.57.1` | |
| `eslint-config-next` | `14.2.29` | Match next version |

> **Node version requirement**: Next 14 requires Node >=18.17.0. The project
> must be built with Node 18 or 20 (not 22) to keep vitest 2.x compatible.
> If Node 22 is the only available runtime, upgrade vitest to `2.1.9` still
> works (vitest 2.x supports Node 18+); vitest 5.x would also work but
> requires Node >=22.

---

## Environment Variables

All secrets go in `.env.local` (gitignored). `.env.example` lists every key
with a description but no real values.

### `.env.example` — complete list

```bash
# ── Supabase ─────────────────────────────────────────────────────────────────
# Project URL (public — safe to expose in browser bundles)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co

# Anon key (public — RLS enforces access control)
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Service-role key (SECRET — server-side only, never expose to client)
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# ── Upstash Redis (rate limiting & caching) ──────────────────────────────────
# REST endpoint and token from Upstash console
UPSTASH_REDIS_REST_URL=https://<database>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>

# ── Resend (email) ────────────────────────────────────────────────────────────
# API key from resend.com dashboard (SECRET)
RESEND_API_KEY=re_<key>

# From address for outbound email — must be a verified domain on Resend
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Admin email address that receives contact-form notifications
ADMIN_EMAIL=admin@yourdomain.com

# ── Cloudflare Turnstile (CAPTCHA) ────────────────────────────────────────────
# Site key (public — embedded in page)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site-key>

# Secret key (SECRET — server-side verification only)
TURNSTILE_SECRET_KEY=<secret-key>

# ── Site metadata ─────────────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### Which variables are `NEXT_PUBLIC_` (safe in browser bundles)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Everything else is server-only and must **never** appear in client components
or be passed to `createBrowserClient`.

---

## Database Design

### Tables (exact column names and types)

#### `profiles`
```sql
id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
role        text        NOT NULL DEFAULT 'student'   -- 'student' | 'admin'
full_name   text
avatar_url  text
updated_at  timestamptz NOT NULL DEFAULT now()
```

#### `courses`
```sql
id          uuid        PRIMARY KEY DEFAULT gen_random_uuid()
code        text        NOT NULL UNIQUE   -- e.g. 'CS101'
name        text        NOT NULL          -- e.g. 'Introduction to Computer Science'
programme   text        NOT NULL          -- e.g. 'BSc Computer Science'
created_at  timestamptz NOT NULL DEFAULT now()
```

#### `papers`
```sql
id          uuid        PRIMARY KEY DEFAULT gen_random_uuid()
title       text        NOT NULL
course_id   uuid        NOT NULL REFERENCES courses(id) ON DELETE RESTRICT
year        smallint    NOT NULL  -- e.g. 2023
semester    text        NOT NULL  -- 'first' | 'second' | 'resit'
level       smallint    NOT NULL  -- 100 | 200 | 300 | 400 | 500
file_path   text        NOT NULL  -- Storage object key, e.g. 'papers/uuid.pdf'
file_type   text        NOT NULL  -- 'pdf' | 'jpg' | 'png'
file_size   integer     NOT NULL  -- bytes, max 10_485_760 (10 MB)
status      text        NOT NULL DEFAULT 'draft'  -- 'published' | 'draft'
downloads   integer     NOT NULL DEFAULT 0
search_vec  tsvector    GENERATED ALWAYS AS (
              to_tsvector('english',
                coalesce(title, '') || ' ' ||
                coalesce(year::text, '')
              )
            ) STORED
created_at  timestamptz NOT NULL DEFAULT now()
updated_at  timestamptz NOT NULL DEFAULT now()
```

> **Full-text search design**: `search_vec` is a generated `tsvector` column
> on `papers` that indexes `title` and `year`. At query time, the API joins
> `papers` with `courses` and additionally filters by `courses.code ILIKE`
> and `courses.name ILIKE` (prefix search) since course identifiers are short
> codes that benefit more from prefix/ILIKE than FTS tokenisation. The FTS
> column handles natural-language title search. A GIN index on `search_vec`
> makes both fast.
>
> **Upgrade path to Meilisearch**: The `search_vec` approach is self-contained
> in the API layer (`src/app/api/papers/route.ts`). When upgrading, replace the
> Supabase FTS query with a Meilisearch SDK call, keeping the request/response
> shape identical so no frontend changes are needed.

#### `contact_messages`
```sql
id          uuid        PRIMARY KEY DEFAULT gen_random_uuid()
name        text        NOT NULL
email       text        NOT NULL
message     text        NOT NULL
created_at  timestamptz NOT NULL DEFAULT now()
read        boolean     NOT NULL DEFAULT false
```

### Indexes

```sql
-- FTS on papers
CREATE INDEX papers_search_vec_gin ON papers USING GIN (search_vec);

-- Filter panel lookups
CREATE INDEX papers_status_idx    ON papers (status);
CREATE INDEX papers_course_id_idx ON papers (course_id);
CREATE INDEX papers_year_idx      ON papers (year);
CREATE INDEX papers_level_idx     ON papers (level);
CREATE INDEX papers_semester_idx  ON papers (semester);

-- Course code lookup
CREATE INDEX courses_code_idx ON courses (code);
```

---

## Supabase Storage Strategy

### Bucket: `papers` (private)

- **Private** (not public). No object is directly accessible via a public URL.
- All downloads go through the Next.js API, which calls
  `supabase.storage.from('papers').createSignedUrl(filePath, 300)` (5-minute
  expiry) and redirects the browser. This lets the API increment the
  `downloads` counter atomically before issuing the URL.
- **Presigned upload**: the admin UI calls `POST /api/upload/presign` (server
  route, requires admin session), which uses the service-role client to call
  `supabase.storage.from('papers').createSignedUploadUrl(objectPath)` and
  returns `{ signedUrl, token, path }` to the browser. The browser then PUTs
  the file directly to Supabase Storage using that URL. The server route
  validates MIME type and size before issuing the presigned URL (not after).
- **Object path naming**: `papers/{uuid}.{ext}` where `uuid` is a fresh
  `crypto.randomUUID()` generated server-side at presign time.
- **CORS on the bucket**: Allow PUT from `NEXT_PUBLIC_SITE_URL` only.

---

## Zod Schemas (in `src/lib/validations.ts`)

```ts
// Paper upload / edit
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'] as const
const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10 MB

PaperUploadSchema = z.object({
  title:     z.string().min(3).max(200),
  course_id: z.string().uuid(),
  year:      z.number().int().min(1990).max(new Date().getFullYear() + 1),
  semester:  z.enum(['first', 'second', 'resit']),
  level:     z.number().int().refine(v => [100,200,300,400,500].includes(v)),
  file_type: z.enum(['pdf', 'jpg', 'png']),
  file_size: z.number().int().max(MAX_FILE_SIZE),
})

PaperEditSchema = PaperUploadSchema.partial().extend({
  status: z.enum(['published', 'draft']).optional(),
})

ContactSchema = z.object({
  name:      z.string().min(2).max(100),
  email:     z.string().email().max(254),
  message:   z.string().min(10).max(2000),
  honeypot:  z.string().max(0),          // must be empty
  cf_token:  z.string().min(1),          // Turnstile token
})

SearchSchema = z.object({
  q:          z.string().max(200).optional(),
  programme:  z.string().max(100).optional(),
  course_code:z.string().max(20).optional(),
  level:      z.coerce.number().int().optional(),
  year:       z.coerce.number().int().optional(),
  semester:   z.enum(['first','second','resit']).optional(),
  page:       z.coerce.number().int().min(1).default(1),
  per_page:   z.coerce.number().int().min(1).max(50).default(12),
})
```

---

## RLS Policies (exact SQL for `supabase/migrations/002_rls.sql`)

```sql
-- Enable RLS on all tables
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins full access to profiles"
  ON profiles FOR ALL USING (is_admin());

-- courses (public read, admin write)
CREATE POLICY "Public can read courses"
  ON courses FOR SELECT USING (true);
CREATE POLICY "Admins can manage courses"
  ON courses FOR ALL USING (is_admin());

-- papers (public read published only, admin full)
CREATE POLICY "Public can read published papers"
  ON papers FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can manage all papers"
  ON papers FOR ALL USING (is_admin());

-- contact_messages (anyone can insert, admin reads/updates)
CREATE POLICY "Anyone can submit contact message"
  ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read contact messages"
  ON contact_messages FOR SELECT USING (is_admin());
CREATE POLICY "Admins can update contact messages"
  ON contact_messages FOR UPDATE USING (is_admin());
```

---

## CSP & Security Headers (in `next.config.ts`)

Set via `headers()` async function:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://*.supabase.co;
  connect-src 'self' https://*.supabase.co https://api.resend.com;
  frame-src https://challenges.cloudflare.com;
  object-src 'none';
  base-uri 'self';

X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

CORS for API routes: only allow `NEXT_PUBLIC_SITE_URL` origin via middleware
or per-route `Access-Control-Allow-Origin` header.

---

## Rate Limiting Design (in `src/lib/redis.ts`)

Use `@upstash/ratelimit` with `Ratelimit.slidingWindow`:

- Contact form: 3 requests per IP per 60-minute window.
- Download endpoint: 30 requests per IP per 60-minute window.
- Admin login page does not need application-level rate limiting; Supabase
  Auth has built-in limits.

The `Redis` instance is created once at module level (singleton):
```ts
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const contactRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '60 m'),
  prefix: 'rl:contact',
})

export const downloadRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '60 m'),
  prefix: 'rl:download',
})
```

---

## Middleware Design (`src/middleware.ts`)

The middleware uses `@supabase/ssr` `createServerClient` with cookie helpers
to refresh the session token on every request. Protected routes:

- `/admin/*` → redirect to `/login` if no session or role ≠ 'admin'.
- `/login` → redirect to `/admin` if already authenticated admin.
- All other routes pass through.

```ts
export const config = {
  matcher: ['/admin/:path*', '/login'],
}
```

The middleware reads the `profiles` table via the service-role client to check
`role = 'admin'` (avoids RLS chicken-and-egg issue during session refresh).

---

## File Layout & What Goes in Each File

```
/home/hysterical/Desktop/PQ/
├── .env.example
├── .github/
│   └── workflows/
│       └── ci.yml
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.js          ← required by Tailwind v3
├── package.json
├── render.yaml
├── README.md
├── playwright.config.ts
├── vitest.config.ts
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql
│       └── 002_rls.sql
├── src/
│   ├── types/
│   │   └── database.ts        ← TypeScript types matching DB schema exactly
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts      ← createBrowserClient (client components)
│   │   │   ├── server.ts      ← createServerClient (Server Components, Route Handlers)
│   │   │   └── admin.ts       ← createClient with SERVICE_ROLE_KEY (server only)
│   │   ├── validations.ts     ← all Zod schemas
│   │   ├── redis.ts           ← Upstash Redis + Ratelimit instances
│   │   └── email.ts           ← Resend client + sendContactNotification()
│   ├── middleware.ts
│   ├── app/
│   │   ├── layout.tsx         ← root layout, metadata, Tailwind globals
│   │   ├── globals.css        ← @tailwind base/components/utilities
│   │   ├── (public)/
│   │   │   ├── page.tsx                    ← home: search bar + filters + results
│   │   │   ├── papers/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx            ← paper detail + download button
│   │   │   └── contact/
│   │   │       └── page.tsx                ← contact form page
│   │   ├── (admin)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx               ← Supabase Auth email/password login
│   │   │   └── admin/
│   │   │       ├── page.tsx               ← admin dashboard (redirect to /admin/papers)
│   │   │       ├── upload/
│   │   │       │   └── page.tsx           ← upload form
│   │   │       ├── papers/
│   │   │       │   └── page.tsx           ← list all papers, edit/delete/publish
│   │   │       └── messages/
│   │   │           └── page.tsx           ← view contact messages, mark read
│   │   └── api/
│   │       ├── papers/
│   │       │   ├── route.ts               ← GET list with FTS + filters
│   │       │   └── [id]/
│   │       │       └── route.ts           ← GET detail; PATCH edit; DELETE delete
│   │       ├── papers/
│   │       │   └── [id]/
│   │       │       └── download/
│   │       │           └── route.ts       ← GET → presigned download URL + increment downloads
│   │       ├── upload/
│   │       │   └── presign/
│   │       │       └── route.ts           ← POST → validate + return presigned upload URL
│   │       └── contact/
│   │           └── route.ts               ← POST → validate + rate-limit + Turnstile + insert + email
│   └── components/
│       ├── ui/                            ← small reusable atoms (Button, Input, Badge, Spinner, etc.)
│       ├── SearchBar.tsx
│       ├── FilterPanel.tsx
│       ├── PaperCard.tsx
│       ├── PaperList.tsx
│       ├── Pagination.tsx
│       ├── ContactForm.tsx                ← client component; includes honeypot + Turnstile widget
│       ├── UploadForm.tsx                 ← client component; presigned upload flow
│       └── AdminNav.tsx
└── tests/
    ├── unit/
    │   ├── validations.test.ts
    │   ├── redis.test.ts                  ← mock Upstash, test rate-limit logic
    │   └── email.test.ts                  ← mock Resend, test email helper
    └── e2e/
        ├── search.spec.ts                 ← browse + filter + download flow
        ├── contact.spec.ts                ← contact form happy + spam paths
        └── admin.spec.ts                  ← login → upload → publish → logout
```

---

## Phase-by-Phase Implementation Plan

---

### Phase 1 — Project Setup and Folder Structure

**Goal**: A Next.js 14 project that builds cleanly with Tailwind, TypeScript,
ESLint, and all production dependencies installed. No application logic yet —
just the scaffolding.

**Steps**:

1. Create the directory structure above with `mkdir -p` for every folder.

2. Write `package.json` with exact versions:
   - `dependencies`: `next@14.2.29`, `react@18.3.1`, `react-dom@18.3.1`,
     `@supabase/supabase-js@2.118.0`, `@supabase/ssr@0.12.7`, `zod@4.6.7`,
     `resend@6.34.1`, `@upstash/redis@1.39.0`, `@upstash/ratelimit@2.2.0`.
   - `devDependencies`: `typescript@5.8.3`, `@types/node@20.19.9`,
     `@types/react@18.3.23`, `@types/react-dom@18.3.23`,
     `tailwindcss@3.4.17`, `autoprefixer@10.4.21`, `postcss@8.5.6`,
     `eslint@8.57.1`, `eslint-config-next@14.2.29`,
     `vitest@2.1.9`, `@vitest/coverage-v8@2.1.9`,
     `@playwright/test@1.64.1`.
   - Scripts: `"dev": "next dev"`, `"build": "next build"`,
     `"start": "next start"`, `"lint": "next lint"`,
     `"test:unit": "vitest run"`,
     `"test:e2e": "playwright test"`,
     `"test": "npm run test:unit && npm run test:e2e"`.

3. Write `tsconfig.json`:
   - `"target": "ES2017"`, `"lib": ["dom","dom.iterable","esnext"]`,
   - `"moduleResolution": "bundler"`, `"jsx": "preserve"`,
   - `"strict": true`, `"noEmit": true`,
   - Path alias: `"@/*": ["./src/*"]`,
   - `"plugins": [{"name": "next"}]`.

4. Write `next.config.ts` (TypeScript config supported in Next 14 as of
   14.2.5+):
   - `NextConfig` type import from `'next'`.
   - `images.remotePatterns` for `*.supabase.co`.
   - `async headers()` function — full CSP and security headers as listed
     in the "CSP & Security Headers" section above. Apply to `source: '/(.*)'`.
   - Export default.

5. Write `tailwind.config.ts`:
   - `content: ['./src/**/*.{ts,tsx}']`
   - `theme.extend` with a small custom colour palette (brand primary
     `#1d4ed8`, brand accent `#7c3aed`).
   - No additional plugins needed at this stage.

6. Write `postcss.config.js`:
   ```js
   module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }
   ```

7. Write `src/app/globals.css`:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

8. Write `src/app/layout.tsx` — root layout with `<html lang="en">`,
   metadata object (`title`, `description`), imports `globals.css`.

9. Write stub `src/app/(public)/page.tsx` returning `<main>Coming soon</main>`.

10. Write `.env.example` with the full variable list from the Environment
    Variables section above.

11. Write `vitest.config.ts`:
    ```ts
    import { defineConfig } from 'vitest/config'
    import path from 'path'
    export default defineConfig({
      test: { environment: 'node', globals: true },
      resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    })
    ```

12. Write `playwright.config.ts` with `baseURL: 'http://localhost:3000'`,
    `webServer: { command: 'npm run dev', url: 'http://localhost:3000' }`,
    use `chromium` only.

13. Write `render.yaml` (placeholder — Phase 8 fills it out completely):
    ```yaml
    services:
      - type: web
        name: past-questions
        runtime: node
        buildCommand: npm ci && npm run build
        startCommand: npm start
    ```

14. Run `npm install` then `npm run build`.

**Files to create/edit**:
- `/home/hysterical/Desktop/PQ/package.json`
- `/home/hysterical/Desktop/PQ/tsconfig.json`
- `/home/hysterical/Desktop/PQ/next.config.ts`
- `/home/hysterical/Desktop/PQ/tailwind.config.ts`
- `/home/hysterical/Desktop/PQ/postcss.config.js`
- `/home/hysterical/Desktop/PQ/vitest.config.ts`
- `/home/hysterical/Desktop/PQ/playwright.config.ts`
- `/home/hysterical/Desktop/PQ/render.yaml`
- `/home/hysterical/Desktop/PQ/.env.example`
- `/home/hysterical/Desktop/PQ/src/app/globals.css`
- `/home/hysterical/Desktop/PQ/src/app/layout.tsx`
- `/home/hysterical/Desktop/PQ/src/app/(public)/page.tsx`

**Do NOT create** `/home/hysterical/Desktop/PQ/vercel.json`.

**Verify**: Run `npm run build` from `/home/hysterical/Desktop/PQ`. Expected:
zero TypeScript errors, zero ESLint errors, build succeeds with a `.next`
output directory.

---

### Phase 2 — Database Schema and RLS

**Goal**: SQL migration files ready to apply to a Supabase project. No
runtime code yet — just the SQL.

**Steps**:

1. Write `supabase/migrations/001_schema.sql`:
   - Create all four tables (`profiles`, `courses`, `papers`,
     `contact_messages`) with exact column definitions from the Database
     Design section above.
   - Add all indexes listed in the Indexes section.
   - Add `updated_at` trigger function and trigger on `papers` and `profiles`
     to auto-set `updated_at = now()` on UPDATE.
   - Trigger function SQL:
     ```sql
     CREATE OR REPLACE FUNCTION set_updated_at()
     RETURNS TRIGGER LANGUAGE plpgsql AS $$
     BEGIN NEW.updated_at = now(); RETURN NEW; END;
     $$;
     CREATE TRIGGER papers_updated_at
       BEFORE UPDATE ON papers
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
     CREATE TRIGGER profiles_updated_at
       BEFORE UPDATE ON profiles
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
     ```
   - `on_auth_user_created` trigger to insert a row into `profiles` when a
     new auth user is created:
     ```sql
     CREATE OR REPLACE FUNCTION handle_new_user()
     RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
     BEGIN
       INSERT INTO public.profiles (id, role, full_name)
       VALUES (NEW.id, 'student', NEW.raw_user_meta_data->>'full_name');
       RETURN NEW;
     END;
     $$;
     CREATE TRIGGER on_auth_user_created
       AFTER INSERT ON auth.users
       FOR EACH ROW EXECUTE FUNCTION handle_new_user();
     ```

2. Write `supabase/migrations/002_rls.sql`:
   - Exact SQL from the RLS Policies section above.

3. Write `src/types/database.ts`:
   - Export TypeScript types that mirror every table column exactly:
     ```ts
     export type Profile = {
       id: string
       role: 'student' | 'admin'
       full_name: string | null
       avatar_url: string | null
       updated_at: string
     }
     export type Course = {
       id: string
       code: string
       name: string
       programme: string
       created_at: string
     }
     export type Paper = {
       id: string
       title: string
       course_id: string
       year: number
       semester: 'first' | 'second' | 'resit'
       level: 100 | 200 | 300 | 400 | 500
       file_path: string
       file_type: 'pdf' | 'jpg' | 'png'
       file_size: number
       status: 'published' | 'draft'
       downloads: number
       search_vec?: unknown   // tsvector, opaque in TS
       created_at: string
       updated_at: string
     }
     export type ContactMessage = {
       id: string
       name: string
       email: string
       message: string
       created_at: string
       read: boolean
     }
     // Join type for search results
     export type PaperWithCourse = Paper & { courses: Course }
     ```

4. Write `src/lib/supabase/client.ts` — browser-side client:
   ```ts
   import { createBrowserClient } from '@supabase/ssr'
   export function createClient() {
     return createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
     )
   }
   ```

5. Write `src/lib/supabase/server.ts` — server-side client (Server Components
   and Route Handlers):
   ```ts
   import { createServerClient } from '@supabase/ssr'
   import { cookies } from 'next/headers'
   export async function createClient() {
     const cookieStore = await cookies()
     return createServerClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
       { cookies: { getAll() { return cookieStore.getAll() },
                    setAll(list) { list.forEach(({ name, value, options }) =>
                      cookieStore.set(name, value, options)) } } }
     )
   }
   ```

6. Write `src/lib/supabase/admin.ts` — service-role client (server only,
   bypasses RLS):
   ```ts
   import { createClient as createSupabaseClient } from '@supabase/supabase-js'
   export function createAdminClient() {
     return createSupabaseClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.SUPABASE_SERVICE_ROLE_KEY!,
       { auth: { autoRefreshToken: false, persistSession: false } }
     )
   }
   ```

**Files to create/edit**:
- `/home/hysterical/Desktop/PQ/supabase/migrations/001_schema.sql`
- `/home/hysterical/Desktop/PQ/supabase/migrations/002_rls.sql`
- `/home/hysterical/Desktop/PQ/src/types/database.ts`
- `/home/hysterical/Desktop/PQ/src/lib/supabase/client.ts`
- `/home/hysterical/Desktop/PQ/src/lib/supabase/server.ts`
- `/home/hysterical/Desktop/PQ/src/lib/supabase/admin.ts`

**Verify**: Run `npm run build`. Expected: zero errors. The SQL files are not
executed locally; they will be applied to Supabase via the dashboard or
`supabase db push`.

---

### Phase 3 — Authentication and Admin Role

**Goal**: Login page, middleware session guard, and the Redis + validation
libraries. After this phase, `/login` works, non-admins are redirected, and
the middleware is active.

**Steps**:

1. Write `src/lib/validations.ts` with all Zod schemas from the Zod Schemas
   section above (`PaperUploadSchema`, `PaperEditSchema`, `ContactSchema`,
   `SearchSchema`). Export each named.

2. Write `src/lib/redis.ts` with the Redis singleton and both Ratelimit
   instances as specified in the Rate Limiting Design section.

3. Write `src/middleware.ts`:
   - Import `createServerClient` from `@supabase/ssr`.
   - On each request, refresh the session using cookie helpers (set/get/delete
     via `NextResponse`).
   - For `/admin/*` routes: fetch `profiles` with service-role client; if
     no session or `role !== 'admin'`, redirect to `/login`.
   - For `/login`: if session exists and role is 'admin', redirect to `/admin`.
   - Export `config.matcher` as `['/admin/:path*', '/login']`.
   - **Important**: the service-role key must not be used in the middleware
     cookie-refresh path (only for role check). Use the anon client for
     session refresh, service-role client only for `SELECT role FROM profiles`.

4. Write `src/app/(admin)/login/page.tsx`:
   - Server Component. If already authed admin, `redirect('/admin')`.
   - Renders `<LoginForm />` client component (inline in same file or
     separate file `src/components/LoginForm.tsx`).
   - `LoginForm` uses `createClient()` from `src/lib/supabase/client.ts`.
   - Call `supabase.auth.signInWithPassword({ email, password })`.
   - On success, `router.push('/admin')`.
   - On error, show inline error message (no page reload).
   - Form: email input (`type="email"`, `required`, `aria-label`), password
     input (`type="password"`, `required`, `aria-label`), submit button.
   - Shows loading spinner while submitting. Focus is managed (first error
     field focused on failure).

5. Add a logout button to `src/components/AdminNav.tsx`:
   - Calls `supabase.auth.signOut()` then `router.push('/login')`.

6. Write `src/app/(admin)/admin/page.tsx` — stub that immediately redirects
   to `/admin/papers` via `redirect('/admin/papers')`.

**Files to create/edit**:
- `/home/hysterical/Desktop/PQ/src/lib/validations.ts`
- `/home/hysterical/Desktop/PQ/src/lib/redis.ts`
- `/home/hysterical/Desktop/PQ/src/middleware.ts`
- `/home/hysterical/Desktop/PQ/src/app/(admin)/login/page.tsx`
- `/home/hysterical/Desktop/PQ/src/app/(admin)/admin/page.tsx`
- `/home/hysterical/Desktop/PQ/src/components/AdminNav.tsx`

**Verify**: `npm run build`. Zero errors. Manually: `npm run dev`, visit
`http://localhost:3000/admin` — should redirect to `/login`. Visit `/login`
with no session — login form renders. (No live Supabase needed to verify
build; functional test happens in Phase 7.)

---

### Phase 4 — Admin Upload and Management

**Goal**: Full admin CRUD. Upload form with presigned upload, paper list with
edit/delete/publish, and contact message viewer.

**Steps**:

1. Write `src/app/api/upload/presign/route.ts` (`POST`):
   - Parse `Content-Type: application/json` body.
   - Validate `{ file_type, file_size }` against `PaperUploadSchema` fields
     (MIME whitelist: `pdf`→`application/pdf`, `jpg`→`image/jpeg`,
     `png`→`image/png`; max size 10 MB).
   - Check admin session via server client.
   - Use `createAdminClient()` to call
     `storage.from('papers').createSignedUploadUrl('papers/' + uuid + '.' + ext)`.
   - Return `{ signedUrl, token, path }` as JSON.
   - On error: 400 for validation, 401 for unauthed, 500 for storage error.

2. Write `src/app/api/papers/route.ts` (`GET` + `POST`):
   - `GET`: parse `SearchSchema` from `request.nextUrl.searchParams`. Build
     Supabase query on `papers` joined with `courses`:
     - FTS: if `q` present, add `.textSearch('search_vec', q, { type: 'websearch', config: 'english' })`.
     - Filter: `.eq('status', 'published')` for public; admin bypasses.
     - Course code filter: `.ilike('courses.code', course_code + '%')`.
     - Additional filters: `level`, `year`, `semester`, `programme` (on
       `courses.programme`).
     - Pagination: `.range(offset, offset + per_page - 1)`, `.order('created_at', { ascending: false })`.
     - Return `{ data: PaperWithCourse[], count: number, page, per_page }`.
   - `POST` (admin only): insert a new paper record after confirming the
     `file_path` was actually uploaded (check storage metadata or trust the
     presign flow). Validate body with `PaperUploadSchema`.

3. Write `src/app/api/papers/[id]/route.ts` (`GET` + `PATCH` + `DELETE`):
   - `GET`: fetch single paper with course join. Public: only `published`.
     Admin: any.
   - `PATCH` (admin): validate body with `PaperEditSchema`. Update record.
     If `status` changes to `published`, ensure file exists.
   - `DELETE` (admin): delete paper record + delete storage object via
     `createAdminClient().storage.from('papers').remove([file_path])`.

4. Write `src/app/api/papers/[id]/download/route.ts` (`GET`):
   - Check rate limit using `downloadRatelimit.limit(ip)`.
   - Fetch paper (public: must be published).
   - Call `createAdminClient().storage.from('papers').createSignedUrl(file_path, 300)`.
   - Atomically increment downloads: `supabase.rpc('increment_downloads', { paper_id: id })`.
     Write the RPC as a Supabase SQL function in `001_schema.sql`:
     ```sql
     CREATE OR REPLACE FUNCTION increment_downloads(paper_id uuid)
     RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
       UPDATE papers SET downloads = downloads + 1 WHERE id = paper_id;
     $$;
     ```
   - Return `{ url }` (client does the redirect to avoid exposing signed URL
     in server logs) or `301` redirect directly.

5. Write `src/components/UploadForm.tsx` (client component):
   - Multi-step: (1) fill metadata fields, (2) pick file, (3) submit.
   - On submit: POST to `/api/upload/presign`, get `{ signedUrl, path }`,
     then `fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': mimeType } })`.
   - On storage success: POST to `/api/papers` with metadata + `file_path`.
   - Progress indicator during upload.
   - Client-side validation mirrors `PaperUploadSchema` for instant feedback.

6. Write `src/app/(admin)/admin/upload/page.tsx` — renders `<UploadForm />`,
   wraps in `<AdminNav />`.

7. Write `src/app/(admin)/admin/papers/page.tsx`:
   - Server Component. Fetches all papers (not just published) using admin
     client. Renders a table with title, course, year, status, downloads.
   - Edit button → modal or `/admin/upload?edit=<id>`.
   - Delete button → confirmation dialog → DELETE `/api/papers/:id`.
   - Publish/unpublish toggle → PATCH `/api/papers/:id` with `{ status }`.

8. Write `src/app/api/contact/route.ts` — stub (full implementation in
   Phase 6). Returns 501 for now. (Needed so build passes with the route
   file existing.)

9. Write `src/app/(admin)/admin/messages/page.tsx`:
   - Server Component. Fetches all contact messages via admin client ordered
     by `created_at DESC`. Shows unread count badge. Mark-as-read PATCH via
     inline server action or client fetch.

**Files to create/edit**:
- `/home/hysterical/Desktop/PQ/src/app/api/upload/presign/route.ts`
- `/home/hysterical/Desktop/PQ/src/app/api/papers/route.ts`
- `/home/hysterical/Desktop/PQ/src/app/api/papers/[id]/route.ts`
- `/home/hysterical/Desktop/PQ/src/app/api/papers/[id]/download/route.ts`
- `/home/hysterical/Desktop/PQ/src/components/UploadForm.tsx`
- `/home/hysterical/Desktop/PQ/src/app/(admin)/admin/upload/page.tsx`
- `/home/hysterical/Desktop/PQ/src/app/(admin)/admin/papers/page.tsx`
- `/home/hysterical/Desktop/PQ/src/app/(admin)/admin/messages/page.tsx`
- `/home/hysterical/Desktop/PQ/src/app/api/contact/route.ts`
- Update `/home/hysterical/Desktop/PQ/supabase/migrations/001_schema.sql`
  to add `increment_downloads` RPC.

**Verify**: `npm run build`. Zero errors.

---

### Phase 5 — Public Browse, Search, and Download

**Goal**: Home page with working search and filters, paper detail page with
download, pagination — all server-rendered for SEO.

**Steps**:

1. Write `src/components/ui/` atoms:
   - `Button.tsx` — primary/secondary/ghost variants, loading state, disabled.
   - `Input.tsx` — text input with label, error message, aria attributes.
   - `Badge.tsx` — small coloured label (used for status, semester).
   - `Spinner.tsx` — accessible loading spinner.
   - `Card.tsx` — wrapper div with shadow and rounded corners.

2. Write `src/components/SearchBar.tsx`:
   - Controlled input component. `onChange` debounces 300 ms then updates
     URL search params via `router.replace` (no full navigation).
   - `aria-label="Search past questions"`, `role="search"`.
   - Clear button when value is present.

3. Write `src/components/FilterPanel.tsx`:
   - Renders `<select>` elements for programme, level, year, semester.
   - On change, updates URL search params alongside `SearchBar`.
   - Fetches distinct filter options from the API on mount (or pass as props
     from the server component).

4. Write `src/components/PaperCard.tsx`:
   - Displays: title, course code + name, year, semester badge, level badge,
     downloads count, "View" link.
   - Fully keyboard-navigable (the whole card is a link or has a focus ring).
   - WCAG contrast on all text.

5. Write `src/components/PaperList.tsx`:
   - Renders a responsive grid of `<PaperCard />`.
   - Empty state: "No papers found. Try adjusting your search." with icon.
   - Loading skeleton (pulsing placeholder cards).

6. Write `src/components/Pagination.tsx`:
   - Previous/Next buttons + page numbers (show up to 5 pages around current).
   - Disables Previous on page 1, Next on last page.
   - Updates `?page=N` in URL.
   - `aria-label="Pagination navigation"`, `aria-current="page"` on active.

7. Rewrite `src/app/(public)/page.tsx`:
   - Server Component. Reads `searchParams` (q, programme, course_code,
     level, year, semester, page).
   - Calls the papers API (internal fetch or direct Supabase query via server
     client).
   - Passes results to `<PaperList />` and `<Pagination />`.
   - Renders `<SearchBar />` and `<FilterPanel />` above results.
   - `metadata` export for SEO: title and description.
   - Suspense boundary around the results list with skeleton fallback.

8. Write `src/app/(public)/papers/[id]/page.tsx`:
   - Server Component. Fetch paper by ID (must be published). If not found,
     `notFound()`.
   - `generateMetadata` export using paper title.
   - Shows: title, course, year, semester, level, uploaded date, download count.
   - Download button → client component that calls `GET /api/papers/:id/download`
     then opens the returned URL in a new tab.
   - Breadcrumb nav: Home → [Course Code] → Paper title.

9. Write `src/app/(public)/contact/page.tsx`:
   - Server Component wrapper, renders `<ContactForm />`.
   - Static metadata.

**Files to create/edit**:
- `/home/hysterical/Desktop/PQ/src/components/ui/Button.tsx`
- `/home/hysterical/Desktop/PQ/src/components/ui/Input.tsx`
- `/home/hysterical/Desktop/PQ/src/components/ui/Badge.tsx`
- `/home/hysterical/Desktop/PQ/src/components/ui/Spinner.tsx`
- `/home/hysterical/Desktop/PQ/src/components/ui/Card.tsx`
- `/home/hysterical/Desktop/PQ/src/components/SearchBar.tsx`
- `/home/hysterical/Desktop/PQ/src/components/FilterPanel.tsx`
- `/home/hysterical/Desktop/PQ/src/components/PaperCard.tsx`
- `/home/hysterical/Desktop/PQ/src/components/PaperList.tsx`
- `/home/hysterical/Desktop/PQ/src/components/Pagination.tsx`
- `/home/hysterical/Desktop/PQ/src/app/(public)/page.tsx` (rewrite)
- `/home/hysterical/Desktop/PQ/src/app/(public)/papers/[id]/page.tsx`
- `/home/hysterical/Desktop/PQ/src/app/(public)/contact/page.tsx`

**Verify**: `npm run build`. Zero errors. All public pages render without
`useClient` conflicts. Run `npm run lint` — zero warnings.

---

### Phase 6 — Email Integration and Contact Form

**Goal**: Working contact form with rate limiting, honeypot, Turnstile, DB
insert, and admin email notification.

**Steps**:

1. Write `src/lib/email.ts`:
   - Import `Resend` from `'resend'`.
   - Create singleton: `const resend = new Resend(process.env.RESEND_API_KEY!)`.
   - Export `sendContactNotification(payload: { name, email, message }): Promise<void>`:
     - Calls `resend.emails.send({ from, to, subject, html })`.
     - `from`: `process.env.RESEND_FROM_EMAIL`.
     - `to`: `process.env.ADMIN_EMAIL`.
     - Subject: `New contact message from ${name}`.
     - HTML body: name, email, message in a simple table.
     - Throws on error (caller handles).

2. Write `src/components/ContactForm.tsx` (client component):
   - Fields: name, email, message (textarea), honeypot (hidden input with
     `aria-hidden`, `tabIndex=-1`, not labelled), Turnstile widget.
   - Cloudflare Turnstile: load `https://challenges.cloudflare.com/turnstile/v0/api.js`
     via `<Script>` tag (Next.js `next/script`, `strategy="lazyOnload"`),
     render `<div class="cf-turnstile" data-sitekey="...">`.
   - On form submit: include `cf_token` from Turnstile callback, POST to
     `/api/contact`.
   - Success state: show "Thank you" message, clear form.
   - Error state: show server error inline.
   - WhatsApp link: `https://wa.me/<number>` — phone number stored as a
     constant in the component (or from env `NEXT_PUBLIC_WHATSAPP_NUMBER`).
   - Phone link: `tel:<number>`.

3. Implement `src/app/api/contact/route.ts` (replace the 501 stub):
   - Parse body, validate with `ContactSchema`.
   - Check honeypot: if `honeypot !== ''`, return 200 (silently drop spam).
   - Verify Turnstile token: POST to
     `https://challenges.cloudflare.com/turnstile/v0/siteverify` with
     `secret=TURNSTILE_SECRET_KEY&response=cf_token&remoteip=ip`.
     If `success !== true`, return 400 with `{ error: 'Captcha failed' }`.
   - Rate-limit: check `contactRatelimit.limit(ip)`. If denied, return 429.
   - Insert into `contact_messages` via server client.
   - Call `sendContactNotification` (do not await — fire and forget with
     catch logged to console so a Resend failure doesn't fail the request).
   - Return 200 `{ success: true }`.

4. Add `NEXT_PUBLIC_WHATSAPP_NUMBER` and any phone number to `.env.example`.

**Files to create/edit**:
- `/home/hysterical/Desktop/PQ/src/lib/email.ts`
- `/home/hysterical/Desktop/PQ/src/components/ContactForm.tsx`
- `/home/hysterical/Desktop/PQ/src/app/api/contact/route.ts` (rewrite)
- `/home/hysterical/Desktop/PQ/.env.example` (add WhatsApp/phone vars)

**Verify**: `npm run build`. Zero errors. Lint passes. Manual smoke test with
`npm run dev`: fill and submit the contact form with a dummy Turnstile key
in dev mode (Supabase + Upstash + Turnstile real keys not required for build
verification, but local dev smoke test should show the form renders without
JS errors).

---

### Phase 7 — Tests

**Goal**: Unit tests covering validation logic, Redis rate-limit helper, and
email helper. E2E tests covering the three main flows.

**Steps**:

1. Write `tests/unit/validations.test.ts`:
   - Test `ContactSchema`: valid input passes; honeypot non-empty fails;
     email invalid fails; message too short fails.
   - Test `PaperUploadSchema`: valid input passes; file size over 10 MB
     fails; invalid semester fails.
   - Test `SearchSchema`: coerces page to number; clamps per_page.
   - Run with: `npx vitest run tests/unit/validations.test.ts`.

2. Write `tests/unit/redis.test.ts`:
   - Mock `@upstash/redis` with `vi.mock`.
   - Confirm `contactRatelimit` and `downloadRatelimit` are instantiated.
   - Test that successive calls to a mock `limit()` correctly return
     `{ success: false }` after threshold.

3. Write `tests/unit/email.test.ts`:
   - Mock `resend.emails.send` with `vi.mock('resend', ...)`.
   - Confirm `sendContactNotification` calls send with correct `to`, `from`,
     and subject.
   - Confirm it throws if Resend returns an error.

4. Write `tests/e2e/search.spec.ts`:
   - Uses a live `baseURL` (dev server).
   - Test: navigate to `/`, type a query, wait for results to update, click
     a paper card, assert detail page shows title and download button.

5. Write `tests/e2e/contact.spec.ts`:
   - Test happy path: fill all fields, submit (Turnstile skipped in test env
     by checking for `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA`
     which is Cloudflare's test key that always passes).
   - Test honeypot: fill honeypot field, assert form silently succeeds
     (no error shown).

6. Write `tests/e2e/admin.spec.ts`:
   - Test: navigate to `/admin/papers`, assert redirect to `/login`.
   - Login flow: fill email/password (use test credentials from env or
     `process.env.TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD`).
   - After login: assert admin nav is visible.

7. Update `vitest.config.ts` to include `tests/unit/**` explicitly.

8. Add `TEST_ADMIN_EMAIL` and `TEST_ADMIN_PASSWORD` to `.env.example`.

**Files to create/edit**:
- `/home/hysterical/Desktop/PQ/tests/unit/validations.test.ts`
- `/home/hysterical/Desktop/PQ/tests/unit/redis.test.ts`
- `/home/hysterical/Desktop/PQ/tests/unit/email.test.ts`
- `/home/hysterical/Desktop/PQ/tests/e2e/search.spec.ts`
- `/home/hysterical/Desktop/PQ/tests/e2e/contact.spec.ts`
- `/home/hysterical/Desktop/PQ/tests/e2e/admin.spec.ts`
- `/home/hysterical/Desktop/PQ/vitest.config.ts` (update)
- `/home/hysterical/Desktop/PQ/.env.example` (add test vars)

**Verify**:
- `npx vitest run` — all unit tests pass.
- `npm run build` — still zero errors.
- E2E tests are written and syntactically valid (they will need a live env to
  actually pass, but `npx playwright test --list` must show all specs without
  parse errors).

---

### Phase 8 — Deployment Configuration

**Goal**: GitHub Actions CI, `render.yaml` (Render IaC), `README.md` with
full setup instructions, and all production config in place.

**Hosting platform: Render (NOT Vercel).** Do NOT create a `vercel.json`.
Create `render.yaml` instead.

**Steps**:

1. Write `.github/workflows/ci.yml`:
   ```yaml
   name: CI
   on:
     push:
       branches: [main]
     pull_request:
       branches: [main]
   jobs:
     build-and-test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: '20'
             cache: 'npm'
         - run: npm ci
         - run: npm run lint
         - run: npm run build
           env:
             NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
             NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
             NEXT_PUBLIC_TURNSTILE_SITE_KEY: 1x00000000000000000000AA
             NEXT_PUBLIC_SITE_URL: https://example.com
         - run: npx vitest run
   ```
   - E2E tests are not run in CI (require live Supabase); they run locally
     or in a separate nightly job.

2. Write `render.yaml` (Render Infrastructure-as-Code):
   ```yaml
   services:
     - type: web
       name: past-questions
       runtime: node
       region: oregon
       plan: free
       buildCommand: npm ci && npm run build
       startCommand: npm start
       healthCheckPath: /api/health
       envVars:
         - key: NODE_VERSION
           value: 20.11.0
         - key: NEXT_PUBLIC_SUPABASE_URL
           sync: false
         - key: NEXT_PUBLIC_SUPABASE_ANON_KEY
           sync: false
         - key: SUPABASE_SERVICE_ROLE_KEY
           sync: false
         - key: UPSTASH_REDIS_REST_URL
           sync: false
         - key: UPSTASH_REDIS_REST_TOKEN
           sync: false
         - key: RESEND_API_KEY
           sync: false
         - key: RESEND_FROM_EMAIL
           sync: false
         - key: ADMIN_EMAIL
           sync: false
         - key: NEXT_PUBLIC_TURNSTILE_SITE_KEY
           sync: false
         - key: TURNSTILE_SECRET_KEY
           sync: false
         - key: NEXT_PUBLIC_SITE_URL
           sync: false
   ```
   Note: `sync: false` means the value is set manually in the Render dashboard
   (not committed to the repo). This is the correct pattern for secrets.

3. Add a health check route at `src/app/api/health/route.ts`:
   ```ts
   import { NextResponse } from 'next/server';
   export async function GET() {
     return NextResponse.json({ status: 'ok' });
   }
   ```
   Render uses this to determine if the deployment is healthy.

4. Write `README.md`:
   - Project overview.
   - Local setup: install Node 20, clone repo, `cp .env.example .env.local`,
     fill in keys, `npm install`, `npm run dev`.
   - Supabase setup: create project, apply migrations (`supabase db push` or
     paste SQL in dashboard), create `papers` storage bucket (private),
     set CORS on bucket.
   - Resend setup: verify domain, get API key.
   - Upstash setup: create Redis database, copy REST URL and token.
   - Cloudflare Turnstile: create widget, get site key and secret key.
   - Render deploy: connect GitHub repo on render.com, select "Web Service",
     choose Node runtime, set build command `npm ci && npm run build`,
     start command `npm start`, add all env vars from `.env.example` in the
     Render dashboard Environment tab, deploy.
   - Cloudflare: point custom domain to Render service URL, enable WAF +
     DDoS protection, enable caching for `/` and `/papers/*`.
   - Admin setup: after first deploy, sign up via Supabase Auth dashboard,
     then run `UPDATE profiles SET role='admin' WHERE id='<user-id>';` in
     Supabase SQL editor.

5. Add `.gitignore` (if not already present from Next.js defaults):
   - `.next/`, `node_modules/`, `.env.local`, `.env.*.local`,
     `coverage/`, `test-results/`, `playwright-report/`.

**Files to create/edit**:
- `/home/hysterical/Desktop/PQ/.github/workflows/ci.yml`
- `/home/hysterical/Desktop/PQ/render.yaml` (NEW — replaces vercel.json)
- `/home/hysterical/Desktop/PQ/src/app/api/health/route.ts` (NEW)
- `/home/hysterical/Desktop/PQ/README.md`
- `/home/hysterical/Desktop/PQ/.gitignore`

**Do NOT create** `/home/hysterical/Desktop/PQ/vercel.json`.

**Verify**: `npm run build` passes. `npm run lint` passes. `npx vitest run`
passes. Push to GitHub — CI workflow passes (requires GitHub secrets set).

---

## Cross-Cutting Decisions (rationale recorded once)

| Decision | Choice | Rationale |
|---|---|---|
| Config format | `next.config.ts` (TypeScript) | Supported since Next 14.2.5; gives type safety on config shape |
| Tailwind version | v3.4.17 | v4 replaced `tailwind.config.ts` with CSS-only config; the spec explicitly lists `tailwind.config.ts` |
| Zod version | v4.6.7 | Latest stable; v4 import path is `from 'zod'` (unchanged) |
| Vitest version | v2.1.9 | v5 requires Node >=22; sticking with v2 keeps Node 18/20 compatible |
| Auth helper | `@supabase/ssr@0.12.7` | Official SSR package replacing deprecated `auth-helpers-nextjs` |
| Session refresh | Middleware cookie mutation | Required by `@supabase/ssr` pattern to keep session alive on RSC requests |
| Service-role usage | Admin client only (`src/lib/supabase/admin.ts`) | Never exposed to browser; only used in Route Handlers and middleware role-check |
| Download flow | API route → signed URL redirect | Allows download counter increment and rate limiting before file access |
| Storage bucket | Single private `papers` bucket | Simplest; all files are user-uploaded PDFs/images. No public read needed — presigned URLs handle access |
| FTS column | Generated `STORED` tsvector | Keeps index always in sync without app-level sync jobs |
| Rate limit store | Upstash Redis (HTTP) | Serverless-compatible; no persistent TCP connection needed on Render |
| Turnstile test key | `1x00000000000000000000AA` | Cloudflare's official always-pass test key for CI/dev |
| next.config.ts | CSP via `headers()` | Source-controlled and typed; works on any hosting platform including Render |
| Hosting | Render (NOT Vercel) | User's choice; use `render.yaml` for IaC, `npm start` as start command |
