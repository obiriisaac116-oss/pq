# Implementation Plan — 25 Improvements to PastQuestions GH

> Authoritative plan for all 25 improvements.
> Items 18 and 19 are documented as skipped/merged below.
> Ordered so each item's dependencies are satisfied before it begins.

---

## Prerequisites / Package Installs

Before any feature work, install the four new packages (pinned):

```bash
npm install recharts@2.12.7 next-view-transitions@0.3.2 nprogress@0.2.0
npm install --save-dev @types/nprogress@0.2.3
```

Files modified: `package.json`

---

## Migration Numbering

- `004_ratings.sql` — paper_ratings table (item 2)
- `005_archive.sql` — papers.archived column (item 13)
- `006_activity_log.sql` — activity_log table (item 14)
- `007_scheduled_publish.sql` — papers.publish_at column (item 15)
- `008_tags.sql` — papers.tags column (item 17)

---

## Implementation Order (dependency-first)

---

### ITEM 22 — Better Typography: Inter Font
*No dependencies. Do first — affects root layout that everything else builds on.*

**Files to modify:**
- `src/app/layout.tsx`
- `tailwind.config.ts`

**Implementation:**
1. Import `Inter` from `next/font/google` in `src/app/layout.tsx`:
   ```ts
   import { Inter } from 'next/font/google'
   const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
   ```
2. Add `className={inter.variable}` to `<html>` tag, `<body>` gets `font-sans`.
3. In `tailwind.config.ts`, under `theme.extend.fontFamily`:
   ```ts
   fontFamily: { sans: ['var(--font-inter)', 'system-ui', 'sans-serif'] }
   ```
4. Remove the `.dark body { ... }` stale dark-mode CSS from `src/app/globals.css` (those blocks reference `.dark` which is forbidden).
5. Add view-transition CSS to `globals.css`:
   ```css
   @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
   @keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
   ::view-transition-old(root) { animation: fade-out 0.15s ease; }
   ::view-transition-new(root) { animation: fade-in  0.15s ease; }
   ```
   *(Pre-add here so item 21 just adds the wrapper component.)*

**TypeScript changes:** None

**Verify:** `npm run build` — zero errors; Inter loads in browser.

---

### ITEM 21 — Page Transitions
*Depends on item 22 (globals.css already has the CSS).*

**Files to modify:**
- `src/app/layout.tsx`

**Implementation:**
1. Import `ViewTransitions` from `next-view-transitions`:
   ```ts
   import { ViewTransitions } from 'next-view-transitions'
   ```
2. Wrap `{children}` in `<ViewTransitions>` inside `<body>` — keep the `~hysterical` watermark span inside too:
   ```tsx
   <body className={`${inter.variable} font-sans bg-white text-gray-900`}>
     <ViewTransitions>
       {children}
     </ViewTransitions>
     <span className="fixed bottom-3 right-4 text-xs font-mono text-gray-300/60 select-none pointer-events-none z-50">
       ~hysterical
     </span>
   </body>
   ```

**TypeScript changes:** None

**Verify:** `npm run build` — zero errors.

---

### ITEM 25 — Toast Notifications
*No dependencies. Implement early — items 13, 14, 16 use it.*

**Files to create:**
- `src/components/ToastContext.tsx`
- `src/components/Toast.tsx`

**Files to modify:**
- `src/app/layout.tsx`
- `src/components/PapersTable.tsx`
- `src/components/MessagesTable.tsx`
- `src/components/CoursesTable.tsx`
- `src/components/UploadForm.tsx`

**Implementation:**

`src/components/ToastContext.tsx`:
```tsx
'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'
export type ToastItem = { id: string; message: string; variant: ToastVariant }
type ToastCtx = {
  success: (msg: string) => void
  error: (msg: string) => void
  info: (msg: string) => void
  confirm: (msg: string) => Promise<boolean>
}
const ToastContext = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmState, setConfirmState] = useState<{
    message: string
    resolve: (v: boolean) => void
  } | null>(null)

  const addToast = useCallback((message: string, variant: ToastVariant) => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t, { id, message, variant }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => setConfirmState({ message, resolve }))
  }, [])

  const ctx: ToastCtx = {
    success: (m) => addToast(m, 'success'),
    error: (m) => addToast(m, 'error'),
    info: (m) => addToast(m, 'info'),
    confirm,
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast stack */}
      <div aria-live="polite" className="fixed bottom-16 right-4 z-50 flex flex-col gap-2 max-w-xs">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={[
              'rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg',
              t.variant === 'success' ? 'bg-green-600' :
              t.variant === 'error'   ? 'bg-red-600'   : 'bg-gray-800',
            ].join(' ')}
          >
            {t.message}
          </div>
        ))}
      </div>
      {/* Confirm dialog */}
      {confirmState && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <p className="text-sm text-gray-800 mb-5">{confirmState.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => { confirmState.resolve(false); setConfirmState(null) }}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                onClick={() => { confirmState.resolve(true); setConfirmState(null) }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
```

Add `<ToastProvider>` inside `<ViewTransitions>` in `src/app/layout.tsx`.

In `PapersTable.tsx`, `MessagesTable.tsx`, `CoursesTable.tsx`, `UploadForm.tsx`:
- Import `useToast` and replace every `window.alert(...)` call with `toast.error(...)` or `toast.success(...)`.
- Replace every `window.confirm(...)` call with `await toast.confirm(...)`.

**TypeScript changes:** New `ToastItem`, `ToastVariant`, `ToastCtx` types in `ToastContext.tsx`.

**Verify:** `npm run build` — zero errors. `npm run test:unit` — 30 tests pass.

---

### ITEM 24 — Loading Progress Bar
*Depends on item 22 (root layout already has Inter). Should be added before items that add navigation.*

**Files to create:**
- `src/components/ProgressBar.tsx`

**Files to modify:**
- `src/app/layout.tsx`

**Implementation:**

`src/components/ProgressBar.tsx`:
```tsx
'use client'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

NProgress.configure({ showSpinner: false, minimum: 0.15 })

export function ProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    NProgress.done()
  }, [pathname, searchParams])

  return null
}
```

In `src/app/layout.tsx`, wrap `<ProgressBar />` in `<Suspense fallback={null}>` inside the layout — place it after `<ToastProvider>` opens, before `{children}`.

Note: NProgress CSS uses `.nprogress .bar` with no dark-mode classes — safe.

**Verify:** `npm run build` — zero errors.

---

### ITEM 2 — Paper Ratings (migration first)

**Files to create:**
- `supabase/migrations/004_ratings.sql`
- `src/components/StarRating.tsx`
- `src/app/api/papers/[id]/rate/route.ts`

**Files to modify:**
- `src/app/(public)/papers/[id]/page.tsx`
- `src/components/PaperCard.tsx`
- `src/types/database.ts`

**Migration `supabase/migrations/004_ratings.sql`:**
```sql
CREATE TABLE public.paper_ratings (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id   uuid        NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  session_id text        NOT NULL,
  rating     int         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(paper_id, session_id)
);
ALTER TABLE public.paper_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can rate"
  ON public.paper_ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read ratings"
  ON public.paper_ratings FOR SELECT USING (true);
CREATE POLICY "Users can update own rating"
  ON public.paper_ratings FOR UPDATE USING (true);
```

**TypeScript changes in `src/types/database.ts`:**
Add `PaperRatingsRow`, `PaperRatingsInsert`, `PaperRatingsUpdate` types and add `paper_ratings` to the `Database.public.Tables` object.

**API route `POST /api/papers/[id]/rate`:**
- Body: `{ rating: number (1–5), sessionId: string }`
- Validate with zod: `z.object({ rating: z.number().int().min(1).max(5), sessionId: z.string().min(1) })`
- Use `createAdminClient()` to upsert: `ON CONFLICT (paper_id, session_id) DO UPDATE SET rating = excluded.rating`
- Returns `{ averageRating, ratingCount }`

**`src/components/StarRating.tsx`:**
- Client component (`'use client'`)
- Props: `{ paperId: string; initialAverage: number; initialCount: number }`
- Reads/writes `localStorage` key `pq:sessionId` (set on first visit using `crypto.randomUUID()`)
- Renders 5 star buttons, shows `average (count ratings)` below
- On click: POST to `/api/papers/${paperId}/rate`, updates displayed average

**Paper detail page changes:**
- Query average rating: `supabase.from('paper_ratings').select('rating').eq('paper_id', paper.id)` then compute average server-side
- Render `<StarRating paperId={paper.id} initialAverage={avg} initialCount={count} />` after the meta grid
- Also update download handler to save to history (item 6 integration point)

**PaperCard changes:**
- Add `averageRating?: number` to `PaperWithCoursePublic` (optional — only shown if nonzero)
- Fetch average per paper is too expensive for list view; show static star display only on cards that have a precomputed rating — skip aggregate fetch on list, leave `averageRating` as undefined for now (can be added later via DB view)

**Verify:** `npm run build` — zero errors.

---

### ITEM 5 — Year Range Filter
*No dependencies on new migrations.*

**Files to modify:**
- `src/components/FilterPanel.tsx`
- `src/app/(public)/page.tsx`
- `src/lib/validations.ts`

**Implementation:**

In `src/lib/validations.ts`, extend `searchSchema`:
```ts
year_from: z.coerce.number().int().optional(),
year_to:   z.coerce.number().int().optional(),
```
Keep `year` for backwards compatibility; both systems can coexist.

In `src/components/FilterPanel.tsx`:
- Replace the single `filter-year` `<select>` with two selects side by side in a `<div className="flex gap-1">`:
  - `filter-year-from` with label "From" and `YEAR_OPTIONS`
  - `filter-year-to` with label "To" and `YEAR_OPTIONS`
- Update `activeCount` to count `year_from` and `year_to` instead of `year`
- `updateParam` calls for `year_from` and `year_to`

In `src/app/(public)/page.tsx`:
- Read `year_from` and `year_to` from `params`
- Replace `.eq('year', year)` with:
  ```ts
  if (year_from) query = query.gte('year', year_from)
  if (year_to)   query = query.lte('year', year_to)
  ```

**TypeScript changes:** Update `HomePageProps.searchParams` to include `year_from?: string; year_to?: string`.

**Verify:** `npm run build && npm run test:unit` — all pass.

---

### ITEM 17 — Paper Tags
*Depends on migration 008 being defined first; migration must be run in Supabase before features go live. Plan includes the migration SQL here.*

**Files to create:**
- `supabase/migrations/008_tags.sql`

**Files to modify:**
- `src/types/database.ts`
- `src/components/PaperCard.tsx`
- `src/components/UploadForm.tsx`
- `src/app/(public)/page.tsx`
- `src/app/(public)/papers/[id]/page.tsx`

**Migration `supabase/migrations/008_tags.sql`:**
```sql
ALTER TABLE public.papers
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
```

**TypeScript changes in `src/types/database.ts`:**
- Add `tags: string[]` to `PapersRow`
- Add `tags?: string[]` to `PapersInsert` and `PapersUpdate`

**`src/components/UploadForm.tsx`:**
- Add `tags` state: `const [tags, setTags] = useState<string>(editPaper?.tags?.join(', ') ?? '')`
- Add input below semester: `<input type="text" placeholder="e.g. MCQ, Theory, 2023" ... />`
- Include `tags: tags.split(',').map(t => t.trim()).filter(Boolean)` in paper insert/update payload

**`src/components/PaperCard.tsx`:**
- Below the semester badge, render tag chips if `paper.tags?.length`:
  ```tsx
  {paper.tags && paper.tags.length > 0 && (
    <div className="flex flex-wrap gap-1 mb-2">
      {paper.tags.map(tag => (
        <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{tag}</span>
      ))}
    </div>
  )}
  ```

**Paper detail page:** Show tags as chips in the meta section.

**Home page tag filter:**
- Add a horizontal row of clickable tag chips below the `<FilterPanel>` when tags are present.
- Fetch distinct tags: `supabase.from('papers').select('tags').eq('status', 'published')` then flatten + deduplicate
- Active tag stored in URL param `tag`; add `.contains('tags', [tag])` to the query when set
- Add `tag: z.string().optional()` to `searchSchema`

**Verify:** `npm run build && npm run test:unit` — all pass.

---

### ITEM 13 — Paper Archive
*Depends on migration 005.*

**Files to create:**
- `supabase/migrations/005_archive.sql`

**Files to modify:**
- `src/types/database.ts`
- `src/app/(public)/page.tsx`
- `src/components/PapersTable.tsx`

**Migration `supabase/migrations/005_archive.sql`:**
```sql
ALTER TABLE public.papers
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
```

**TypeScript changes:**
- Add `archived: boolean` to `PapersRow`
- Add `archived?: boolean` to `PapersInsert`, `PapersUpdate`

**Home page:** Add `.eq('archived', false)` to the public papers query in `src/app/(public)/page.tsx`.

**PapersTable:**
- Add 'Archive' / 'Unarchive' button column
- Archived rows get `opacity-60` Tailwind class
- Button calls `PATCH /api/papers/[id]` with `{ archived: true/false }`
- API already accepts partial updates via `paperUpdateSchema` — add `archived: z.boolean().optional()` to `paperUpdateSchema` in `validations.ts`

**Verify:** `npm run build && npm run test:unit` — all pass.

---

### ITEM 14 — Admin Activity Log
*Depends on migration 006. Log endpoint called by items 13, 15, 16 after actions.*

**Files to create:**
- `supabase/migrations/006_activity_log.sql`
- `src/app/api/admin/log/route.ts`
- `src/app/(admin)/admin/activity/page.tsx`

**Files to modify:**
- `src/components/AdminNav.tsx`
- `src/types/database.ts`

**Migration `supabase/migrations/006_activity_log.sql`:**
```sql
CREATE TABLE public.activity_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  action     text        NOT NULL,
  details    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read activity log"
  ON public.activity_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can insert activity log"
  ON public.activity_log FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

**TypeScript changes in `src/types/database.ts`:**
Add `ActivityLogRow`, `ActivityLogInsert` types and add `activity_log` to `Database.public.Tables`.

**`POST /api/admin/log`:**
- Verifies admin session
- Body: `{ action: string; details?: Record<string, unknown> }`
- Inserts into `activity_log` using admin client
- Returns `{ ok: true }`
- Fire-and-forget callers should not await — wrap in try/catch

**`src/app/(admin)/admin/activity/page.tsx`:**
- Server component
- Fetches last 50 rows ordered by `created_at DESC`
- Renders a table: timestamp, action, details (JSON stringified)

**AdminNav:** Add `{ href: '/admin/activity', label: 'Activity' }` to `NAV_LINKS`.

**Log these events (add fire-and-forget `fetch('/api/admin/log', ...)` calls):**
- After paper upload success (in `UploadForm.tsx`): `{ action: 'paper_uploaded', details: { title, courseId } }`
- After publish toggle (in `PapersTable.tsx`): `{ action: 'paper_published' or 'paper_drafted', details: { id, title } }`
- After paper deleted (in `PapersTable.tsx`): `{ action: 'paper_deleted', details: { id, title } }`
- After course created (in `CoursesTable.tsx` or `UploadForm.tsx` inline course add): `{ action: 'course_created', details: { code, name } }`

**Verify:** `npm run build` — zero errors.

---

### ITEM 15 — Scheduled Publish
*Depends on migration 007.*

**Files to create:**
- `supabase/migrations/007_scheduled_publish.sql`
- `src/app/api/cron/publish/route.ts`

**Files to modify:**
- `src/components/UploadForm.tsx`
- `src/types/database.ts`
- `render.yaml`

**Migration `supabase/migrations/007_scheduled_publish.sql`:**
```sql
ALTER TABLE public.papers
  ADD COLUMN IF NOT EXISTS publish_at timestamptz;
```

**TypeScript changes:**
- Add `publish_at: string | null` to `PapersRow`
- Add `publish_at?: string | null` to `PapersInsert`, `PapersUpdate`

**UploadForm:** Add an optional `datetime-local` input after the semester selector:
```tsx
<label htmlFor="publish-at">Schedule publish (optional)</label>
<input type="datetime-local" id="publish-at" value={publishAt} onChange={...} />
```
Include `publish_at` in the paper insert payload (omit if empty string).

**`GET /api/cron/publish`:**
- Accepts a secret header `x-cron-secret` matching env var `CRON_SECRET` to prevent unauthorized calls
- Uses admin client
- Query: `papers.select('id').eq('status', 'draft').eq('archived', false).lte('publish_at', new Date().toISOString()).not('publish_at', 'is', null)`
- For each result: `PATCH /api/papers/[id]` — or direct admin DB update with `{ status: 'published' }` and log the action
- Returns `{ published: number }`

**render.yaml:** Add a cron job entry:
```yaml
  - type: cron
    name: publish-scheduled-papers
    runtime: node
    schedule: "*/15 * * * *"
    buildCommand: ""
    startCommand: >
      curl -s -X GET
      ${NEXT_PUBLIC_SITE_URL}/api/cron/publish
      -H "x-cron-secret: ${CRON_SECRET}"
```
Also add `CRON_SECRET` to the `envVars` list under the web service.

**Verify:** `npm run build` — zero errors.

---

### ITEM 16 — Notification Center (bell icon)
*No new migration needed. Reads existing `contact_messages` table.*

**Files to create:**
- `src/components/NotificationBell.tsx`
- `src/app/api/admin/unread-count/route.ts`

**Files to modify:**
- `src/components/AdminNav.tsx`

**`GET /api/admin/unread-count`:**
- Requires admin session
- Returns `{ count: number }` — count of `contact_messages` where `read = false`

**`src/components/NotificationBell.tsx`:**
- Client component
- On mount, fetch `/api/admin/unread-count`
- Read `localStorage` key `pq:messagesLastVisited` (timestamp)
- If the unread count > 0 AND user hasn't visited `/admin/messages` since last fetch, show a red badge
- Clicking navigates to `/admin/messages`
- On `/admin/messages` page mount: set `pq:messagesLastVisited = Date.now()`

**AdminNav:** Replace the static `Messages` link in `NAV_LINKS` with `<NotificationBell />` that wraps the link with the badge overlay. Keep the link href as `/admin/messages`.

**Verify:** `npm run build` — zero errors.

---

### ITEM 11 — Dashboard Analytics Charts
*Depends on recharts being installed (prerequisite).*

**Files to create:**
- `src/components/DashboardCharts.tsx`

**Files to modify:**
- `src/app/(admin)/admin/page.tsx`

**Implementation:**

`src/components/DashboardCharts.tsx` — client component:
```tsx
'use client'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
         BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts'

interface DashboardChartsProps {
  downloadsData: { date: string; downloads: number }[]   // last 30 days
  courseData: { code: string; count: number }[]           // top 5 courses
  levelData: { level: string; count: number }[]           // papers by level
}
```

Three charts in a responsive grid (1 col mobile, 3 cols desktop):
1. `LineChart` of daily downloads — x-axis: date abbreviated, y-axis: count
2. `BarChart` (horizontal) of top 5 courses by paper count — `layout="vertical"` 
3. `PieChart` (donut) of papers by level — use Recharts `innerRadius={50}`

Colors: use brand colors `#1d4ed8`, `#7c3aed`, and Tailwind palette values as strings — no CSS variables needed.

**Data preparation in `src/app/(admin)/admin/page.tsx`:**
- Downloads over time: query `papers` for `downloads, created_at` — approximate by grouping `created_at::date` and summing downloads for last 30 days. Since we don't have a `download_events` table, group by `updated_at::date` as a proxy. Query using raw supabase rpc or a simple aggregate: `db.from('papers').select('updated_at, downloads').gte('updated_at', thirtyDaysAgo)`; then bucket client-side in the server component.
- Top 5 courses: `db.from('papers').select('course_id, courses(code)').eq('status','published')` then group and count in JS.
- Papers by level: `db.from('papers').select('level').eq('status','published')` then group.

Pass computed data arrays to `<DashboardCharts>` below the existing stat cards.

**Verify:** `npm run build` — zero errors.

---

### ITEM 12 — Bulk CSV Import
*No dependencies on new migrations.*

**Files to create:**
- `src/app/(admin)/admin/import/page.tsx`
- `src/app/api/admin/import/route.ts`

**Files to modify:**
- `src/components/AdminNav.tsx`

**`src/app/(admin)/admin/import/page.tsx`:** Client component.
- CSV columns: `title, course_code, year, semester, level`
- Manual CSV parser: split by newline, split each row by comma, trim, skip header row
- Preview table shows parsed rows with validation errors highlighted
- Validation: each row must pass a subset of `paperInsertSchema` (no file fields); show row-level errors
- `<input type="file" accept=".csv">` triggers parsing on `onChange`
- Submit button: POST to `/api/admin/import` with `{ rows: ValidRow[] }`
- Show success count and list of failed rows

**`POST /api/admin/import`:**
- Requires admin session
- Body: `{ rows: { title, course_code, year, semester, level }[] }`
- For each row: look up `course_id` from `course_code` using admin client
- Bulk insert valid rows with `status: 'draft'` using `.insert(records)`
- Returns `{ inserted: number; errors: { row: number; reason: string }[] }`

**AdminNav:** Add `{ href: '/admin/import', label: 'Import' }` to `NAV_LINKS`.

**Verify:** `npm run build` — zero errors.

---

### ITEM 1 — Course Browse Page
*No dependencies on migrations. Reads existing `courses` table.*

**Files to create:**
- `src/app/(public)/courses/page.tsx`
- `src/app/(public)/courses/loading.tsx`

**Files to modify:**
- `src/app/(public)/layout.tsx`

**`src/app/(public)/courses/page.tsx`:** Server component.
```tsx
import { createClient } from '@/lib/supabase/server'
// Fetch all courses + count of published papers per course
// Use: db.from('courses').select('*, papers(count)').eq('papers.status', 'published')
// PostgREST aggregate — or simpler: fetch all courses, then fetch per-course counts separately
```

- Use admin-free anon client
- Query courses with paper counts: `supabase.from('courses').select('*, papers!inner(id)').eq('papers.status', 'published')` — or do two queries and merge
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Each card: course code (bold, brand-primary), name, programme pill, "N papers" badge
- Each card links to `/?course_code=${course.code}`
- Sort by paper count descending

**`src/app/(public)/courses/loading.tsx`:** Skeleton grid with 6 placeholder cards using `animate-pulse`.

**Header change in `src/app/(public)/layout.tsx`:**
Add link after `Home`: `<Link href="/courses">Courses</Link>` using the same `rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors` className.

**Verify:** `npm run build` — zero errors.

---

### ITEM 3 — Request a Paper
*No dependencies.*

**Files to create:**
- `src/app/(public)/request/page.tsx`

**Files to modify:**
- `src/app/(public)/page.tsx`
- `src/lib/redis.ts`

**`src/lib/redis.ts`:** Add `requestRatelimit`:
```ts
export const requestRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 m'),
  prefix: 'rl:request',
})
```

**`src/app/(public)/request/page.tsx`:** Client component (or server with form action).
Fields: course code, year (number), semester (first/second/resit select), level (100–500 select), notes (textarea)
On submit: POST to `/api/contact` using existing contact route, with:
```json
{ "name": "Paper Request", "email": "request@noreply.invalid", "subject_prefix": "[REQUEST]",
  "message": "Course: X\nYear: Y\nSemester: Z\nLevel: L\nNotes: ..." }
```
Actually — to reuse the contact table cleanly, insert directly:
- Name = "Paper Request"
- Email = form-filler's email (optional, make it optional in the form)
- Message = formatted string of all fields with `[REQUEST]` prefix in first line
- Rate-limit by IP using `requestRatelimit`
- Create a separate `POST /api/request` route that does the insert + rate limit

**Home page change:** Below the search bar in the hero section, add:
```tsx
<Link href="/request" className="mt-4 inline-flex items-center gap-1 text-sm text-white/80 hover:text-white underline underline-offset-2">
  Can't find your paper? Request it →
</Link>
```

**Verify:** `npm run build` — zero errors.

---

### ITEM 4 — Search Within Results (Client-Side Filter)
*No dependencies. Wraps existing `PaperList`.*

**Files to create:**
- `src/components/ResultFilter.tsx`

**Files to modify:**
- `src/app/(public)/page.tsx`

**`src/components/ResultFilter.tsx`:** Client component.
- Props: `{ papers: PaperWithCoursePublic[]; minCount?: number }` (default `minCount = 5`)
- If `papers.length <= minCount`: render `<PaperList papers={papers} />` directly
- Otherwise: show text input "Filter results by title…" above the list; filter state client-side
- Import and render `<PaperList>` with filtered subset

**Home page:** Replace direct `<PaperList papers={papers ?? []} />` with `<ResultFilter papers={papers ?? []} />`. Wrap in `Suspense` as before.

**Verify:** `npm run build` — zero errors.

---

### ITEM 6 — Download History
*No dependencies on new migrations.*

**Files to create:**
- `src/components/DownloadHistory.tsx`

**Files to modify:**
- `src/app/(public)/papers/[id]/DownloadButton.tsx`
- `src/app/(public)/page.tsx`

**`src/app/(public)/papers/[id]/DownloadButton.tsx`:**
After a successful download (after `window.open`), save to localStorage:
```ts
const MAX_HISTORY = 20
const key = 'pq:downloadHistory'
const existing: string[] = JSON.parse(localStorage.getItem(key) ?? '[]')
const updated = [paperId, ...existing.filter(id => id !== paperId)].slice(0, MAX_HISTORY)
localStorage.setItem(key, JSON.stringify(updated))
```

**`src/components/DownloadHistory.tsx`:** Client component.
- On mount, read `pq:downloadHistory` from localStorage
- If empty, render nothing
- If non-empty, fetch those paper IDs from Supabase browser client:
  ```ts
  supabase.from('papers').select('*, courses(*)').in('id', ids).eq('status', 'published')
  ```
- Show section heading "Your downloads" with `<PaperList papers={fetched} />`

**Home page:** Add `<DownloadHistory />` as a dynamic import (SSR false) below `<RecentlyViewedWrapper>` in the filters+results section.

**Verify:** `npm run build` — zero errors.

---

### ITEM 9 — Paper Collections (Bookmarks)
*No dependencies on new migrations.*

**Files to create:**
- `src/components/BookmarkButton.tsx`
- `src/app/(public)/bookmarks/page.tsx`

**Files to modify:**
- `src/components/PaperCard.tsx`
- `src/app/(public)/papers/[id]/page.tsx`
- `src/app/(public)/layout.tsx`

**`src/components/BookmarkButton.tsx`:** Client component.
- Props: `{ paperId: string; className?: string }`
- Reads/writes `pq:bookmarks` localStorage key (array of IDs)
- Renders bookmark icon (filled when bookmarked, outline when not)
- Uses `aria-pressed` and `aria-label="Bookmark this paper"` / `"Remove bookmark"`

**`src/components/PaperCard.tsx`:** Add `<BookmarkButton paperId={paper.id} className="absolute top-2 right-2 z-10" />` inside the card. Use `dynamic` import to avoid SSR mismatch since it reads localStorage.

**Paper detail page:** Add `<BookmarkButton paperId={paper.id} />` alongside the download/share buttons.

**`src/app/(public)/bookmarks/page.tsx`:** Client component (must read localStorage).
- On mount, read `pq:bookmarks`
- Fetch from Supabase browser client; show `<PaperList>`
- Empty state: "No saved papers yet. Browse and bookmark papers to see them here."

**Header:** Add `<Link href="/bookmarks">Saved</Link>` to the nav in `src/app/(public)/layout.tsx`.

**Verify:** `npm run build` — zero errors.

---

### ITEM 7 — WhatsApp Share Improvement
*No dependencies.*

**Files to modify:**
- `src/app/(public)/papers/[id]/page.tsx`

**Change the WhatsApp href:**
```tsx
href={`https://wa.me/?text=${encodeURIComponent(
  `Check out this TTU past question: ${paper.title} — ${siteUrl}/papers/${paper.id}`
)}`}
```
The existing href already uses `encodeURIComponent` but the message text was "Check out this past question". Update to "Check out this TTU past question: [title] [URL]" as specified.

**Verify:** `npm run build` — zero errors.

---

### ITEM 8 — Offline PWA Caching
*No dependencies.*

**Files to create:**
- `public/sw.js`
- `src/components/ServiceWorkerRegistration.tsx`

**Files to modify:**
- `src/app/layout.tsx`
- `next.config.mjs`

**`public/sw.js`:**
```js
const CACHE_NAME = 'pq-v1'
const SHELL_URLS = ['/', '/courses', '/bookmarks']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // Network-first for API and Supabase
  if (url.pathname.startsWith('/api/') || url.hostname.endsWith('.supabase.co')) {
    return // let fall through to network
  }
  // Cache-first for static assets
  if (url.pathname.match(/\.(js|css|png|jpg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => cached ?? fetch(event.request))
    )
    return
  }
  // Network-first for pages
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
```

**`src/components/ServiceWorkerRegistration.tsx`:** Client component.
```tsx
'use client'
import { useEffect } from 'react'
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
```

**Root layout:** Add `<ServiceWorkerRegistration />` inside `<body>` (after children).

**`next.config.mjs`:** Add `sw.js` to the CSP `script-src` allowlist is not needed since it's served from the same origin — no changes required. However, update the `frame-src` to allow the paper viewer from item 10:
```js
"frame-src https://challenges.cloudflare.com https://*.supabase.co 'self'",
```

**Verify:** `npm run build` — zero errors.

---

### ITEM 10 — Full-Screen Mobile PDF Viewer
*No dependencies. Needs CSP frame-src update from item 8 (already covered above).*

**Files to create:**
- `src/app/(public)/papers/[id]/view/page.tsx` — NOTE: must be outside `(public)` layout group to show no header/footer. Actually this is inside `(public)` group by path, so we need to place it at a different route. Use `src/app/view/[id]/page.tsx` — this puts it outside the public layout and gets the root layout only (no header/footer).

**Correction:** Create `src/app/view/[id]/page.tsx` so it only gets the root layout (no public header/footer).

**Files to create:**
- `src/app/view/[id]/page.tsx`

**Files to modify:**
- `src/app/(public)/papers/[id]/page.tsx`

**`src/app/view/[id]/page.tsx`:** Server component.
- Fetch paper by ID using anon client; `notFound()` if not published
- Generate signed URL (1 hour) using admin client
- Full-viewport layout:
  ```tsx
  <div className="fixed inset-0 bg-black flex flex-col">
    <div className="flex items-center gap-2 bg-black/80 px-4 py-2">
      <Link href={`/papers/${params.id}`} className="text-white text-sm hover:underline">← Back</Link>
      <span className="text-white/70 text-sm truncate">{paper.title}</span>
    </div>
    {paper.file_type === 'pdf'
      ? <iframe src={previewUrl} className="flex-1 w-full border-0" title={paper.title} />
      : <img src={previewUrl} alt={paper.title} className="flex-1 w-full object-contain" />
    }
  </div>
  ```

**Paper detail page:** Add "Full screen" link button after the preview iframe/img:
```tsx
<Link
  href={`/view/${paper.id}`}
  className="mt-2 inline-flex items-center gap-1 text-sm text-brand-primary hover:underline"
>
  <svg ... /> Full screen
</Link>
```

**Verify:** `npm run build` — zero errors.

---

### ITEM 23 — Improved Footer
*No dependencies.*

**Files to modify:**
- `src/app/(public)/layout.tsx`

**Replace the footer section** with a two-column-mobile / three-column-desktop layout:
- Col 1 (brand): Logo + "PastQuestions GH" + "Built with ❤️ for TTU students" tagline
- Col 2 (quick links): Home, Courses, Contact, Bookmarks
- Col 3 (contact info): existing WhatsApp, phone, email links + GitHub icon linking to `https://github.com/obiriisaac116-oss/pq`

GitHub icon — inline SVG (no external dep):
```tsx
<a href="https://github.com/obiriisaac116-oss/pq" target="_blank" rel="noopener noreferrer"
   className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
  <GitHubIcon /> GitHub
</a>
```

Grid classes: `grid grid-cols-2 gap-8 sm:grid-cols-3` (two cols on mobile, three on sm+).

**Verify:** `npm run build` — zero errors.

---

## SKIPPED ITEMS

### ITEM 18 — Two-Factor Auth for Admin — SKIPPED
Not implemented in code. To enable 2FA, go to Supabase dashboard → Authentication → MFA settings and enable TOTP for admin accounts. Document in README under a "Security" section.

### ITEM 19 — Paper Tags Filter — COVERED by Item 17
Item 19 is a subset of item 17. The tag filter chips on the home page are implemented as part of item 17. No separate work needed.

### ITEM 20 — Student Accounts — SKIPPED
Complex feature requiring new auth flows, profile management, and permission changes. Deferred as a separate future feature.

---

## Build Verification Checklist

After all items are implemented:

1. `npm run build` — zero TypeScript errors, zero ESLint errors
2. `npm run test:unit` — 30 existing tests pass (no regressions)
3. Manually verify:
   - No `dark:` CSS classes anywhere in `src/`
   - No `ThemeToggle` component referenced
   - `~hysterical` watermark present in `src/app/layout.tsx`
   - `next.config.mjs` (not `.ts`) is the config file
   - All migrations numbered 004–008 exist in `supabase/migrations/`

---

## TypeScript Type Summary

| File | Changes |
|------|---------|
| `src/types/database.ts` | Add `PaperRatingsRow/Insert/Update`; add `archived`, `publish_at`, `tags` to `PapersRow/Insert/Update`; add `ActivityLogRow/Insert`; add `paper_ratings` and `activity_log` to `Database.public.Tables` |
| `src/lib/validations.ts` | Add `year_from`, `year_to`, `tag` to `searchSchema`; add `archived` to `paperUpdateSchema`; add `publish_at` to `paperInsertSchema`/`paperUpdateSchema`; add `tags` to both |
| `src/components/PaperCard.tsx` | `PaperWithCoursePublic` already includes all `PapersRow` fields — new columns auto-included once `PapersRow` is updated |

---

## Migration Execution Order

Run in Supabase SQL editor or via `supabase db push` in this order:
1. `004_ratings.sql`
2. `005_archive.sql`
3. `006_activity_log.sql`
4. `007_scheduled_publish.sql`
5. `008_tags.sql`

Each is additive (`ADD COLUMN IF NOT EXISTS` / `CREATE TABLE`). Safe to run on existing data.
