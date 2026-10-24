# Phase 5 — Verification Note

## Files Created

### UI atoms (`src/components/ui/`)
- `Button.tsx` — primary / secondary / ghost variants, loading state (spinner), disabled state, full TypeScript, accessible `aria-busy`
- `Input.tsx` — text input with label, error message, `aria-describedby` / `aria-invalid`
- `Badge.tsx` — coloured pill (blue / purple / green / yellow / red / gray)
- `Spinner.tsx` — accessible loading spinner with `role="status"` and `aria-label`
- `Card.tsx` — wrapper with shadow and rounded corners, polymorphic `as` prop

### Components (`src/components/`)
- `SearchBar.tsx` — controlled input, 300 ms debounce → `router.replace` on URL params, clear button, `role="search"`, `aria-label`; `'use client'`
- `FilterPanel.tsx` — selects for programme / level / year / semester; updates URL params; `'use client'`
- `PaperCard.tsx` — title, course code + name, year / semester / level badges, downloads count, "View" link; whole-card clickable link with focus ring
- `PaperList.tsx` — responsive 3-column grid, empty state with icon, 6-card pulsing skeleton (loading prop)
- `Pagination.tsx` — Previous/Next + up-to-7 page numbers with `…` gaps, `aria-current="page"`, URL `?page=N`; `'use client'`
- `ContactForm.tsx` — Phase 5 placeholder ("coming soon" notice); full implementation deferred to Phase 6

### Pages (`src/app/(public)/`)
- `page.tsx` — Server Component home page; reads `searchParams`; direct Supabase query via server client; FTS (`search_vec`) + filters; `dynamicImport` with `ssr: false` for `SearchBar` + `FilterPanel`; Suspense boundaries; `metadata` export; `force-dynamic`
- `loading.tsx` — centred spinner fallback for the `(public)` route group
- `error.tsx` — client error boundary with "Try again" reset button
- `contact/page.tsx` — static metadata, renders `<ContactForm />`
- `papers/[id]/page.tsx` — Server Component; fetches published paper; `generateMetadata`; breadcrumb nav; meta grid (course, year, semester, level, downloads, uploaded date); `DownloadButton` client component
- `papers/[id]/DownloadButton.tsx` — client component; calls `GET /api/papers/:id/download`; opens signed URL in new tab; loading + error states
- `papers/[id]/loading.tsx` — spinner fallback
- `papers/[id]/not-found.tsx` — "Paper Not Found" page with link back home

## Build Result

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (13/13)
Exit code: 0
```

## Lint Result

```
✔ No ESLint warnings or errors
Exit code: 0
```

## Deviations from Plan

1. **`ContactForm` is a placeholder** — Phase 5 instruction explicitly states: "For now, import and render a placeholder ContactForm that just says the form is coming soon, so the build passes." Full implementation is Phase 6. ✔
2. **`@marsidev/react-turnstile` was already installed** (v1.6.3) from a prior phase, so the `npm install` step was a no-op.
3. **`[id)` directories exist alongside correct `[id]` directories** — a leftover from a previous phase (the parenthesis typo). These are empty `.gitkeep` stubs and do not affect the build or routing.
4. **`Spinner` unused import removed from `page.tsx`** — was imported but not used after the Suspense skeletons were inlined; removed to keep lint clean.

## Commit

```
feat: Phase 5 - public browse, search and download pages
19 files changed, 1290 insertions(+), 6 deletions(-)
```
