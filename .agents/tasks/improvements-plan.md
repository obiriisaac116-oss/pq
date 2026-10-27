# Implementation Plan — 13 Improvement Items

> This is the authoritative plan for all 13 improvement items.
> Items are ordered by dependency. Each coder step must read this file first.

---

## Pre-flight facts (discovered by reading the codebase)

- **Config file is `next.config.mjs`** (not `.ts` or `.ts`). All CSP changes go there.
- **`CoursesRow.programme` is `string | null`** — any new code must match.
- **`PapersRow.level` is `string | null`** (TEXT in DB, not numeric).
- **Zod v4** — `z.uuid()` and `z.email()` are top-level validators, not `.uuid()` on `z.string()`.
- **`src/lib/validations.ts`** already exports `paperUpdateSchema` (used by PATCH /api/papers/[id]).
- **`src/lib/redis.ts`** exports `redis`, `contactRatelimit`, `downloadRatelimit`. Add `subscribeRatelimit` here.
- **`src/lib/email.ts`** exports `sendContactNotification`. Add `sendSubscriberNotification` here.
- **`src/types/database.ts`** exports `Database`, `CoursesRow`, `PapersRow`, etc. Add `SubscribersRow/Insert/Update` and add `subscribers` table to `Database`.
- **`sharp` is not installed**. Use raw PNG bytes for icon generation.
- **`src/app/(public)/layout.tsx`** — has a header with nav; add ThemeToggle here.
- **`src/app/(admin)/admin/page.tsx`** — dashboard with stats cards; add analytics tables and subscriber count here.
- **`next.config.mjs`** CSP `frame-src` currently only allows `https://challenges.cloudflare.com`. Must add `blob:` for PDF preview iframe.
- **No `/api/courses/[id]` route exists yet** — must create it for item 2.
- **No `/api/subscribe` route exists yet** — must create it for item 11.
- **`src/app/(public)/papers/[id]/page.tsx`** — server component; already imports `createClient` from server. Use `createAdminClient` for signed URL (storage is private).
- **`DownloadButton.tsx`** exists as a client component in the paper detail directory.
- Build command: `npm run build`. Test command: `npm run test:unit`.

---

## Implementation Order

Items 1–13 are implemented in sequence. Dependencies noted inline.

---

## Item 1 — Watermark

**What**: Add a fixed `<span>` watermark to the root layout body.

**Files**:
- `src/app/layout.tsx` — add span inside `<body>` after `{children}`.

**Exact change**:
```tsx
<body>
  {children}
  <span className="fixed bottom-3 right-4 text-xs font-mono text-gray-300 select-none pointer-events-none z-50">~hysterical</span>
</body>
```

**Pitfalls**: None. The span is `pointer-events-none` and `select-none` so it never interferes.

**Verify**: `npm run build` — zero errors.

---

## Item 2 — Course management admin page

**What**: Create the courses CRUD admin page + [id] API route + add nav link.

**Files to create**:
- `src/app/api/courses/[id]/route.ts` — PATCH and DELETE handlers, admin-only.
- `src/app/(admin)/admin/courses/page.tsx` — server component listing all courses with a client component for inline edit + delete.

**Files to modify**:
- `src/components/AdminNav.tsx` — add `{ href: '/admin/courses', label: 'Courses' }` to `NAV_LINKS`.

### `src/app/api/courses/[id]/route.ts`

Use the same `requireAdmin` pattern from `/api/papers/[id]/route.ts`:
1. `await createClient()` → `requireAdmin`.
2. Parse body with `CreateCourseUpdateSchema = z.object({ code: z.string().min(1).max(20).optional(), name: z.string().min(2).max(200).optional(), programme: z.string().min(2).max(200).optional() })`.
3. `createAdminClient()` → `.update(parsed.data).eq('id', params.id).select().single()`.
4. DELETE: fetch first, then `.delete().eq('id', params.id)`, return 204.

### `src/app/(admin)/admin/courses/page.tsx`

Server component (`force-dynamic`) that:
1. Checks session (redirect to `/login` if none).
2. Fetches all courses via admin client ordered by `code`.
3. Renders `<AdminNav />` + `<CoursesTable initialCourses={courses} />`.

### `CoursesTable` client component (inline in the page file or separate `src/components/CoursesTable.tsx`)

- Shows columns: Code, Name, Programme, Created, Actions.
- Inline edit row: clicking Edit turns the row into inputs; Save calls PATCH `/api/courses/[id]`.
- Delete button calls DELETE `/api/courses/[id]` with confirm dialog.
- `programme` field is optional (`string | null`) — show empty string in the input when null.

**Pitfalls**:
- Do NOT recreate the existing GET/POST in `route.ts`.
- `programme` is `string | null` — the update payload should send `null` when the field is cleared, not `undefined`. The Zod schema must accept `z.string().optional().nullable()` for programme in the update schema (or just omit null and send empty string — be consistent).
- Existing RLS policy "Admins can manage courses" covers UPDATE and DELETE.

**Verify**: `npm run build` — zero errors.

---

## Item 3 — Bulk upload (post-success actions + draft-then-upload-another)

**What**: After a successful upload in `UploadForm`, show two buttons: "Upload another" (pre-fills courseId/level/semester) and "Go to papers". Add a "Save as draft and upload another" submit button variant.

**Files to modify**:
- `src/components/UploadForm.tsx`

**Exact changes**:

1. Add state: `const [lastUpload, setLastUpload] = useState<{ courseId: string; level: string; semester: string } | null>(null)`.

2. On success in `handleSubmit`, before resetting the form: `setLastUpload({ courseId, level, semester })`.

3. After the success banner, render:
```tsx
{formState === 'success' && (
  <div className="flex gap-3 flex-wrap">
    <button type="button" onClick={() => {
      if (lastUpload) {
        setCourseId(lastUpload.courseId)
        setLevel(lastUpload.level)
        setSemester(lastUpload.semester)
      }
      setFormState('idle')
    }} className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90">
      Upload another
    </button>
    <a href="/admin/papers" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
      Go to papers
    </a>
  </div>
)}
```

4. Add a second submit button "Save as draft and upload another" that sets a ref `isDraftAndContinue` before submit, then in `handleSubmit` after success: if that ref is true, reset only title/file but keep courseId/level/semester, set formState to 'idle', clear the ref.

**Pitfalls**: The "Upload another" pre-fill only applies when `lastUpload` is non-null. This item is separate from item 13 (localStorage defaults); item 13 handles the mount-time read.

**Verify**: `npm run build` — zero errors.

---

## Item 4 — PDF/image preview on paper detail

**What**: Server-side generate a signed URL for the paper file. Show `<iframe>` for PDF, `<img>` for images. Download button unchanged.

**Files to modify**:
- `src/app/(public)/papers/[id]/page.tsx` — add signed URL generation + preview JSX.
- `next.config.mjs` — add `blob:` to `frame-src` CSP directive.

**Exact changes to `page.tsx`**:

In the server component, after fetching the paper, add:
```ts
import { createAdminClient } from '@/lib/supabase/admin'
// ...
const adminDb = createAdminClient()
const { data: signedUrlData } = await adminDb.storage
  .from('papers')
  .createSignedUrl(paper.file_path, 3600)
const previewUrl = signedUrlData?.signedUrl ?? null
```

Then in JSX, below the meta grid and above `<DownloadButton>`:
```tsx
{previewUrl && (
  <div className="mt-4 rounded-lg overflow-hidden border border-gray-200">
    {paper.file_type === 'pdf' ? (
      <iframe
        src={previewUrl}
        title={`Preview of ${paper.title}`}
        className="w-full h-[600px]"
        aria-label={`PDF preview of ${paper.title}`}
      />
    ) : (
      <img
        src={previewUrl}
        alt={`Preview of ${paper.title}`}
        className="w-full object-contain max-h-[600px]"
      />
    )}
  </div>
)}
```

**Exact change to `next.config.mjs`**:

Change:
```js
"frame-src https://challenges.cloudflare.com",
```
To:
```js
"frame-src https://challenges.cloudflare.com https://*.supabase.co",
```

The signed URL from Supabase Storage is hosted on `*.supabase.co`, not `blob:`. No `blob:` needed.

**Pitfalls**:
- `createAdminClient` uses service-role key — server component only, never client.
- The signed URL expires in 1 hour (3600 s). This is fine for SSR; each page load gets a fresh URL.
- Preview does NOT use the download route — downloads counter is not touched.
- `paper.file_type` is `'pdf' | 'jpg' | 'png'` — check for `'pdf'` only; anything else renders `<img>`.

**Verify**: `npm run build` — zero errors.

---

## Item 5 — Sitemap and robots.txt

**What**: Create `src/app/sitemap.ts` and `src/app/robots.ts` using Next.js App Router conventions.

**Files to create**:
- `src/app/sitemap.ts`
- `src/app/robots.ts`

### `src/app/sitemap.ts`

```ts
import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pq-questions26.onrender.com'
  const db = createAdminClient()
  const { data: papers } = await db
    .from('papers')
    .select('id, updated_at')
    .eq('status', 'published')

  const paperUrls = (papers ?? []).map((p) => ({
    url: `${siteUrl}/papers/${p.id}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ...paperUrls,
  ]
}
```

### `src/app/robots.ts`

```ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pq-questions26.onrender.com'
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/login', '/api'] },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
```

**Pitfalls**: `sitemap.ts` calls `createAdminClient()` which reads `SUPABASE_SERVICE_ROLE_KEY`. Mark the file with `export const dynamic = 'force-dynamic'` if Next.js tries to statically render it at build time (it may throw because env var is absent during build — add a try/catch that returns an empty array).

Actually: Next.js sitemap route functions are always dynamic by default. No `force-dynamic` needed.

**Verify**: `npm run build` — zero errors.

---

## Item 6 — PWA support

**What**: Create a web app manifest + placeholder PNG icons.

**Files to create**:
- `src/app/manifest.ts`
- `public/icon-192.png` (minimal valid 1×1 PNG — written as raw bytes)
- `public/icon-512.png` (same — 1×1 PNG)
- `scripts/gen-icons.mjs` — one-off Node script to write the PNGs

**`src/app/manifest.ts`**:

```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PastQuestions GH',
    short_name: 'PastQs',
    description: 'Browse and download past exam papers',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1d4ed8',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
```

**PNG generation (scripts/gen-icons.mjs)**:

Sharp is not installed. Write minimal valid PNG bytes directly. A 1×1 blue PNG is small enough to hard-code. Use Node's `fs.writeFileSync` with a `Buffer` containing valid PNG bytes.

A minimal valid 1×1 blue PNG is exactly these bytes (hex):
```
89504e47 0d0a1a0a  ← PNG signature (8 bytes)
0000000d 49484452  ← IHDR chunk length + type
00000001 00000001  ← width=1, height=1
08020000 00906f3e  ← bit depth=8, color type=2 (RGB), compress=0, filter=0, interlace=0, CRC
e5000000 0c494441  ← IDAT length + type
54789c62 f8cfc000  ← compressed 1×1 blue pixel (R=0,G=0,B=255 via zlib)
00000200 01e221bc  ← rest of IDAT + CRC
33000000 0049454e  ← IEND chunk
44ae4260           ← IEND CRC
```

The script writes the same 1×1 PNG to both `public/icon-192.png` and `public/icon-512.png`. These are placeholder icons — the user should replace them with real 192×192 and 512×512 PNGs before launch. The filenames match what the manifest declares.

**Run**: `node scripts/gen-icons.mjs` from the project root to generate the files, then commit them.

**Pitfalls**: The `public/` directory does not exist yet — the script must create it with `fs.mkdirSync('public', { recursive: true })`. The PNG bytes must form a valid PNG or browsers will reject the manifest icon. Use the exact byte sequence that is a valid 1×1 RGB PNG.

**Verify**: `npm run build` — zero errors. `file public/icon-192.png` shows "PNG image data".

---

## Item 7 — Paper edit functionality

**What**: Edit mode in UploadForm. The upload page reads an `edit` search param and passes the paper as a prop; UploadForm pre-fills fields and PATCHes instead of POSTing.

**Files to modify**:
- `src/app/(admin)/admin/upload/page.tsx`
- `src/components/UploadForm.tsx`

### Changes to `upload/page.tsx`

Add `searchParams` prop and edit mode fetch:
```ts
interface UploadPageProps {
  searchParams: { edit?: string }
}
export default async function UploadPage({ searchParams }: UploadPageProps) {
  // ... existing admin check ...
  let editPaper: (PapersRow & { courses: CoursesRow | null }) | null = null
  if (searchParams.edit) {
    const { data } = await db
      .from('papers')
      .select('*, courses(*)')
      .eq('id', searchParams.edit)
      .maybeSingle()
    editPaper = data ?? null
  }
  // Pass editPaper to UploadForm
  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          {editPaper ? `Edit: ${editPaper.title}` : 'Upload paper'}
        </h1>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <UploadForm courses={courses ?? []} editPaper={editPaper} />
        </div>
      </main>
    </>
  )
}
```

### Changes to `UploadForm.tsx`

1. Extend `UploadFormProps`:
```ts
type UploadFormProps = {
  courses: CoursesRow[]
  editPaper?: (PapersRow & { courses: CoursesRow | null }) | null
}
```

2. Initialize state from `editPaper` when provided:
```ts
const [title, setTitle] = useState(editPaper?.title ?? '')
const [courseId, setCourseId] = useState(editPaper?.course_id ?? '')
const [level, setLevel] = useState<string>(editPaper?.level ?? '100')
const [year, setYear] = useState<string>(editPaper?.year ? String(editPaper.year) : String(new Date().getFullYear()))
const [semester, setSemester] = useState<string>(editPaper?.semester ?? 'first')
```

3. In edit mode, file is optional (paper already has a file). Show a note: "Leave blank to keep existing file."

4. In `handleSubmit`, when `editPaper` is present:
   - Skip presign + storage upload if no new file was selected.
   - Use `PATCH /api/papers/${editPaper.id}` with the updated fields.
   - Include `file_path` and `file_type` only if a new file was uploaded.

5. Show "Editing: [title]" heading inside the form (or rely on the page-level heading change).

**Pitfalls**:
- `PapersRow.level` is `string | null` — use `editPaper?.level ?? '100'` directly (no conversion needed).
- In edit mode, the file input should not have `required` — add `required={!editPaper}` to the file input.
- The PATCH endpoint already exists at `/api/papers/[id]` and uses `paperUpdateSchema`.
- The `PapersRow` and `CoursesRow` imports are already at the top of `UploadForm.tsx` — just add `PapersRow`.

**Verify**: `npm run build` — zero errors.

---

## Item 8 — Analytics dashboard

**What**: Add "Top papers by downloads" table (top 10) and "Recent uploads" list (last 5) to the admin dashboard.

**Files to modify**:
- `src/app/(admin)/admin/page.tsx`

**Exact changes**:

Add two additional queries in the `Promise.all`:
```ts
const [papersRes, coursesRes, messagesRes, topPapersRes, recentPapersRes] = await Promise.all([
  // existing three...
  db.from('papers').select('id, title, downloads, courses(code)').order('downloads', { ascending: false }).limit(10),
  db.from('papers').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(5),
])
const topPapers = topPapersRes.data ?? []
const recentPapers = recentPapersRes.data ?? []
```

Then add below the existing quick-action buttons:
```tsx
{/* Top papers by downloads */}
<section className="mt-10">
  <h2 className="mb-3 text-lg font-semibold text-gray-900">Top papers by downloads</h2>
  <div className="overflow-x-auto rounded-lg border border-gray-200">
    <table className="min-w-full text-sm">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left font-medium text-gray-700">#</th>
          <th className="px-4 py-3 text-left font-medium text-gray-700">Title</th>
          <th className="px-4 py-3 text-left font-medium text-gray-700">Course</th>
          <th className="px-4 py-3 text-right font-medium text-gray-700">Downloads</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {topPapers.map((p, i) => (
          <tr key={p.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 text-gray-500">{i + 1}</td>
            <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{p.title}</td>
            <td className="px-4 py-3 text-gray-600">{(p.courses as any)?.code ?? '—'}</td>
            <td className="px-4 py-3 text-right font-semibold text-brand-primary">{p.downloads}</td>
          </tr>
        ))}
        {topPapers.length === 0 && (
          <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No papers yet.</td></tr>
        )}
      </tbody>
    </table>
  </div>
</section>

{/* Recent uploads */}
<section className="mt-8">
  <h2 className="mb-3 text-lg font-semibold text-gray-900">Recent uploads</h2>
  <ul className="space-y-2">
    {recentPapers.map((p) => (
      <li key={p.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
        <span className="text-gray-900 truncate max-w-sm">{p.title}</span>
        <span className={`ml-4 rounded-full px-2.5 py-0.5 text-xs font-medium ${p.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {p.status}
        </span>
      </li>
    ))}
    {recentPapers.length === 0 && <li className="text-sm text-gray-400">No uploads yet.</li>}
  </ul>
</section>
```

**Pitfalls**: The `courses` join on `topPapersRes` is `CoursesRow | null`; use a type assertion `(p.courses as CoursesRow | null)?.code ?? '—'` instead of `as any`.

**Verify**: `npm run build` — zero errors.

---

## Item 9 — Dark mode

**What**: Add `darkMode: 'class'` to Tailwind config, create ThemeToggle component, add it to public layout header and AdminNav, add dark classes to globals.css and key components.

**Files to modify**:
- `tailwind.config.ts` — add `darkMode: 'class'`
- `src/components/ThemeToggle.tsx` — new file (client component)
- `src/app/(public)/layout.tsx` — add `<ThemeToggle />` in header nav
- `src/components/AdminNav.tsx` — add `<ThemeToggle />` in right side
- `src/app/globals.css` — add dark mode base classes

### `src/components/ThemeToggle.tsx`

```tsx
'use client'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = stored === 'dark' || (!stored && prefersDark)
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
    >
      {dark ? (
        // Sun icon
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        // Moon icon
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}
```

### `src/app/globals.css` additions

```css
/* Dark mode base */
.dark body {
  @apply bg-gray-900 text-gray-100;
}
.dark .bg-white {
  @apply bg-gray-800;
}
.dark .text-gray-900 {
  @apply text-gray-100;
}
.dark .border-gray-200 {
  @apply border-gray-700;
}
.dark .bg-gray-50 {
  @apply bg-gray-900;
}
```

**Pitfalls**: The `ThemeToggle` reads `localStorage` and `matchMedia` in a `useEffect` to avoid SSR mismatch. The initial state is `false` (light) on the server; the effect immediately corrects it on the client. This means a brief flash on dark-mode users; acceptable given the requirements. Adding dark classes to `globals.css` via `@apply` may conflict with utility purging — prefer adding the dark class variants directly to the most important components (hero section, paper cards, admin nav background) rather than broad overrides in CSS.

**Verify**: `npm run build` — zero errors.

---

## Item 10 — Search autocomplete

**What**: Add dropdown to SearchBar on focus + ≥2 chars, fetching `/api/courses?q=<term>`. Update GET in `/api/courses/route.ts` to accept `q` param.

**Files to modify**:
- `src/components/SearchBar.tsx`
- `src/app/api/courses/route.ts` — add `q` param ILIKE filter

### Changes to `GET` in `src/app/api/courses/route.ts`

```ts
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  const supabase = await createClient()
  let query = supabase.from('courses').select('*').order('code', { ascending: true })
  if (q) {
    query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%`)
  }
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

### Changes to `SearchBar.tsx`

1. Add state: `suggestions`, `showDropdown`, `isLoadingSuggestions`.
2. On input change (debounced 300 ms), if `value.length >= 2`: fetch `/api/courses?q=${encodeURIComponent(value)}` and set suggestions.
3. On focus, if `value.length >= 2`: show existing suggestions.
4. `onKeyDown`: close dropdown on Escape.
5. Click-outside: `useEffect` with a `mousedown` listener on `document`.
6. Clicking a suggestion: set `value` to the course code, call `updateUrl`, close dropdown.

```tsx
// Add inside SearchBar component:
const [suggestions, setSuggestions] = useState<CoursesRow[]>([])
const [showDropdown, setShowDropdown] = useState(false)
const wrapperRef = useRef<HTMLDivElement>(null)

// Click-outside handler
useEffect(() => {
  function handleMouseDown(e: MouseEvent) {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
      setShowDropdown(false)
    }
  }
  document.addEventListener('mousedown', handleMouseDown)
  return () => document.removeEventListener('mousedown', handleMouseDown)
}, [])

// Fetch suggestions when value changes
async function fetchSuggestions(term: string) {
  if (term.length < 2) { setSuggestions([]); setShowDropdown(false); return }
  const res = await fetch(`/api/courses?q=${encodeURIComponent(term)}`)
  if (res.ok) {
    const data: CoursesRow[] = await res.json()
    setSuggestions(data.slice(0, 6))
    setShowDropdown(data.length > 0)
  }
}
```

The existing debounce in `handleChange` is 300 ms — add `fetchSuggestions(next)` call inside that debounce. The dropdown renders below the input as an absolutely-positioned list with `role="listbox"`.

**Pitfalls**:
- `CoursesRow` must be imported from `@/types/database`.
- The dropdown must have `role="listbox"` and each option `role="option"` for accessibility.
- The `GET /api/courses` signature change (`NextRequest` instead of just `Request`) requires changing the function signature — but it already uses `NextRequest` (checking the existing route, it does: `export async function GET()` with no params). Update it to `export async function GET(req: NextRequest)` and import `NextRequest` if not already imported (it is imported for POST).

**Verify**: `npm run build` — zero errors.

---

## Item 11 — Email subscription

**What**: Subscribers table, subscribe API, EmailSubscribeForm, add to home page, add count to dashboard, notify on publish.

**Depends on**: Items 2 (Courses nav link already added), 8 (dashboard query already extended).

**Files to create**:
- `supabase/migrations/003_subscribers.sql`
- `src/app/api/subscribe/route.ts`
- `src/components/EmailSubscribeForm.tsx`

**Files to modify**:
- `src/types/database.ts` — add `SubscribersRow/Insert/Update` + `subscribers` table in `Database`
- `src/lib/redis.ts` — add `subscribeRatelimit`
- `src/lib/email.ts` — add `sendSubscriberNotification(paperTitle, paperUrl)`
- `src/app/(public)/page.tsx` — add `<EmailSubscribeForm />` below hero
- `src/app/(admin)/admin/page.tsx` — add subscribers count to stats
- `src/app/api/papers/[id]/route.ts` — in PATCH, when `status` changes to `'published'`, fire-and-forget subscriber notification

### `supabase/migrations/003_subscribers.sql`

```sql
CREATE TABLE subscribers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed  boolean     NOT NULL DEFAULT true
);

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (INSERT only)
CREATE POLICY "Anyone can subscribe"
  ON subscribers FOR INSERT WITH CHECK (true);

-- Admins can read/delete subscribers
CREATE POLICY "Admins can manage subscribers"
  ON subscribers FOR ALL USING (is_admin());
```

### `src/types/database.ts` additions

```ts
export type SubscribersRow = {
  id: string
  email: string
  created_at: string
  confirmed: boolean
}
export type SubscribersInsert = {
  id?: string
  email: string
  created_at?: string
  confirmed?: boolean
}
export type SubscribersUpdate = {
  id?: string
  email?: string
  confirmed?: boolean
}
```

Add to `Database.public.Tables`:
```ts
subscribers: {
  Row: SubscribersRow
  Insert: SubscribersInsert
  Update: SubscribersUpdate
  Relationships: []
}
```

### `src/lib/redis.ts` addition

```ts
export const subscribeRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '60 m'),
  prefix: 'rl:subscribe',
})
```

### `src/lib/email.ts` addition

```ts
export async function sendSubscriberNotification(
  paperTitle: string,
  paperUrl: string,
  subscriberEmails: string[],
): Promise<void> {
  if (subscriberEmails.length === 0) return
  const resend = new Resend(process.env.RESEND_API_KEY!)
  // Send to each subscriber individually (BCC alternative; Resend supports `bcc` array)
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.RESEND_FROM_EMAIL!, // send to self
    bcc: subscriberEmails,
    subject: `New paper available: ${paperTitle}`,
    html: `<p>A new past question paper has been published: <a href="${paperUrl}">${escapeHtml(paperTitle)}</a></p>`,
  })
}
```

### `src/app/api/subscribe/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { subscribeRatelimit } from '@/lib/redis'

const SubscribeSchema = z.object({
  email: z.email().max(254),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
  const { success } = await subscribeRatelimit.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = SubscribeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })

  const db = createAdminClient()
  const { error } = await db.from('subscribers').insert({ email: parsed.data.email })

  if (error) {
    // Unique constraint violation = already subscribed
    if (error.code === '23505') return NextResponse.json({ message: 'Already subscribed!' })
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Subscribed successfully!' })
}
```

### `src/components/EmailSubscribeForm.tsx`

Client component with an email input + submit button. On submit POSTs to `/api/subscribe`. Shows success/error inline. Simple design matching the existing brand colors.

### Home page addition

In `src/app/(public)/page.tsx`, after `</section>` (hero section close tag) and before the filters div, add:
```tsx
<div className="mx-auto max-w-3xl px-4 py-6">
  <EmailSubscribeForm />
</div>
```

Import `EmailSubscribeForm` with `dynamicImport` (client component).

### Dashboard stat addition

In `src/app/(admin)/admin/page.tsx`, add to the Promise.all:
```ts
db.from('subscribers').select('id', { count: 'exact', head: true }),
```
Add `{ label: 'Subscribers', value: subscribersCount, href: '/admin', color: 'bg-pink-50 text-pink-700' }` to the stats array.

### PATCH `/api/papers/[id]` — subscriber notification on publish

After the successful update in PATCH, check if `parsed.data.status === 'published'`:
```ts
if (parsed.data.status === 'published') {
  // fire-and-forget
  void (async () => {
    try {
      const { data: subs } = await adminClient.from('subscribers').select('email')
      const emails = (subs ?? []).map((s) => s.email)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pq-questions26.onrender.com'
      await sendSubscriberNotification(data.title, `${siteUrl}/papers/${data.id}`, emails)
    } catch (e) {
      console.error('[PATCH /api/papers/[id]] subscriber notification failed:', e)
    }
  })()
}
```

**Pitfalls**:
- `z.email()` in Zod v4 is a top-level validator, not on `z.string()`. The existing `validations.ts` uses this pattern. Match it.
- The `sendSubscriberNotification` uses BCC so subscriber emails are not exposed to each other.
- Import `sendSubscriberNotification` in the PATCH route only if `RESEND_API_KEY` is set — or let the function throw and catch it silently (fire-and-forget).
- `subscribers` table requires the `is_admin()` function to exist (from `002_rls.sql`) — `003_subscribers.sql` depends on it.

**Verify**: `npm run build` — zero errors.

---

## Item 12 — WhatsApp share button

**What**: Add a WhatsApp share button on the paper detail page.

**Files to modify**:
- `src/app/(public)/papers/[id]/page.tsx`

**Exact change**:

In the server component, get `siteUrl`:
```ts
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pq-questions26.onrender.com'
```

Below the `<DownloadButton>`, add:
```tsx
<a
  href={`https://wa.me/?text=${encodeURIComponent(`Check out this past question: ${paper.title} ${siteUrl}/papers/${paper.id}`)}`}
  target="_blank"
  rel="noopener noreferrer"
  className="mt-3 flex items-center justify-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
>
  <WhatsAppShareIcon />
  Share on WhatsApp
</a>
```

Add a `WhatsAppShareIcon` inline SVG component at the bottom of the file (same style as the one in `layout.tsx`).

**Pitfalls**: `NEXT_PUBLIC_SITE_URL` is available server-side too. The `encodeURIComponent` must wrap the entire text string.

**Verify**: `npm run build` — zero errors.

---

## Item 13 — Smart upload defaults (localStorage persistence)

**What**: After successful upload, store `courseId/level/semester` to localStorage. On mount (not in edit mode), read these values as initial state.

**Files to modify**:
- `src/components/UploadForm.tsx`

**Exact changes**:

This item extends what was done in item 3. The localStorage key convention:
- `pq:lastCourseId`
- `pq:lastLevel`
- `pq:lastSemester`

1. On mount (in a `useEffect`), if `!editPaper`:
```ts
useEffect(() => {
  if (editPaper) return
  const storedCourseId = localStorage.getItem('pq:lastCourseId')
  const storedLevel = localStorage.getItem('pq:lastLevel')
  const storedSemester = localStorage.getItem('pq:lastSemester')
  if (storedCourseId) setCourseId(storedCourseId)
  if (storedLevel) setLevel(storedLevel)
  if (storedSemester) setSemester(storedSemester)
}, [editPaper])
```

2. On success in `handleSubmit`, before resetting:
```ts
localStorage.setItem('pq:lastCourseId', courseId)
localStorage.setItem('pq:lastLevel', level)
localStorage.setItem('pq:lastSemester', semester)
```

**Pitfalls**:
- `localStorage` is client-side only — must be inside `useEffect` or a click handler to avoid SSR errors.
- In edit mode (`editPaper` is truthy), skip the mount-time read so it doesn't override the paper's values.
- The `courseId` stored might refer to a course that no longer exists — the select element will silently fall back to "— Select a course —" which is acceptable.

**Verify**: `npm run build` — zero errors.

---

## Final verification

After all 13 items:
```
npm run build    # must exit 0 with zero TypeScript and ESLint errors
npm run lint     # must exit 0
```

---

## TypeScript interface changes summary

| File | Change |
|---|---|
| `src/types/database.ts` | Add `SubscribersRow`, `SubscribersInsert`, `SubscribersUpdate`, add `subscribers` table to `Database` |
| `src/components/UploadForm.tsx` | Add `editPaper` prop; import `PapersRow` |
| `src/components/AdminNav.tsx` | Add `ThemeToggle` import |
| `src/app/(public)/layout.tsx` | Add `ThemeToggle` import |

## Files created (new)

- `src/app/api/courses/[id]/route.ts`
- `src/app/(admin)/admin/courses/page.tsx`
- `src/components/CoursesTable.tsx` (if extracted from page)
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `src/app/manifest.ts`
- `src/components/ThemeToggle.tsx`
- `src/components/EmailSubscribeForm.tsx`
- `src/app/api/subscribe/route.ts`
- `supabase/migrations/003_subscribers.sql`
- `scripts/gen-icons.mjs`
- `public/icon-192.png` (generated by script)
- `public/icon-512.png` (generated by script)

## Files modified

- `src/app/layout.tsx` (item 1)
- `src/components/AdminNav.tsx` (items 2, 9)
- `src/components/UploadForm.tsx` (items 3, 7, 13)
- `src/app/(public)/papers/[id]/page.tsx` (items 4, 12)
- `next.config.mjs` (item 4 — CSP)
- `src/app/api/courses/route.ts` (item 10)
- `src/app/(admin)/admin/page.tsx` (items 8, 11)
- `src/app/(admin)/admin/upload/page.tsx` (item 7)
- `src/components/SearchBar.tsx` (item 10)
- `tailwind.config.ts` (item 9)
- `src/app/globals.css` (item 9)
- `src/app/(public)/layout.tsx` (item 9)
- `src/app/(public)/page.tsx` (item 11)
- `src/types/database.ts` (item 11)
- `src/lib/redis.ts` (item 11)
- `src/lib/email.ts` (item 11)
- `src/app/api/papers/[id]/route.ts` (item 11)
