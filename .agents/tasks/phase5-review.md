# Public browse, search, and download pages (Phase 5)

Phase 5 adds the entire public-facing surface of the Past Questions site: a searchable, filterable paper list, a paper detail page with a download button, a contact page placeholder, and the UI atom library that underlies them. The implementation follows a Server Component–first pattern for data fetching and uses `next/dynamic` with `ssr: false` to isolate the two `useSearchParams`-dependent client components from the static render. Build and lint both exit clean. **Watch for:** the "Try again" button in the error boundary has no keyboard focus ring (confirmed), and the `yellow-100/yellow-800` Badge combination is a borderline WCAG AA contrast ratio that warrants a check in the actual rendered colours (likely).

**Verdict**: NEEDS_CHANGES

---

## High-level view

The home page is a Server Component that reads `searchParams`, validates them through `searchSchema` (Zod), and executes a Supabase query directly — no client-side fetch, no SWR. Full-text search goes through the `search_vec` tsvector column using PostgREST's `textSearch` with `websearch` type. Programme and course-code filters resolve course IDs in a separate query first to avoid PostgREST's silent outer-join no-op behaviour on embedded-relation predicates — a well-considered workaround.

`SearchBar` and `FilterPanel` are loaded via `next/dynamic` with `ssr: false` and wrapped in `<Suspense>`, which is the correct pattern for components that call `useSearchParams()` without a parent `<Suspense>` boundary in the page tree. Both components update URL search params via `router.replace`, preserving filter state in the URL and enabling browser back-button navigation.

The paper detail page (`/papers/[id]`) is also a pure Server Component. It fetches the paper, generates metadata, and renders a `DownloadButton` client component that calls `GET /api/papers/:id/download`. The API route handles rate-limiting, authorisation (published-only for anon users, drafts visible to admins), signed-URL generation, and the `increment_downloads` RPC call — all in the correct prior-phase route, not introduced here.

No automated tests exist for any Phase 5 component.

---

<details>
<summary>Issues (4)</summary>

1. **Error boundary button missing focus ring** — The "Try again" button in `src/app/(public)/error.tsx` has no `focus-visible:ring-*` class. A keyboard user who lands on the error page cannot see which element has focus. Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2` to match every other interactive element in the codebase.

2. **Yellow badge WCAG AA contrast** — `bg-yellow-100 text-yellow-800` (Tailwind defaults: approximately #fef9c3 background, #92400e text) produces a contrast ratio near 4.5:1 depending on the exact Tailwind palette version. The "Resit" semester badge uses this colour. Verify the actual ratio with a contrast checker; if it falls below 4.5:1 for normal text, switch to `text-yellow-900` or `bg-yellow-200`.

3. **SearchBar aria-label redundancy** — The `<input>` has both a connected `<label>` (via `htmlFor`/`id`) and an explicit `aria-label`, plus a manually set `role="searchbox"` on a native `<input type="search">` that already carries that role implicitly. Screen readers may announce the label twice. Remove the `aria-label` and `role="searchbox"` from the input; keep the visible `<label>` and the `<div role="search">` wrapper.

4. **No automated tests** — Zero test files exist in the project. The Phase 5 components have no unit or integration coverage. At minimum, `buildPages` in `Pagination.tsx` (a pure function with branching logic over 7 pages, ellipsis placement, boundary conditions) and the URL-param update logic in `FilterPanel` and `SearchBar` should have tests. The absence is a gap that will make future refactors invisible to CI.

</details>

---

<details>
<summary>Details</summary>

## Error boundary keyboard accessibility

The `PublicError` component's "Try again" button renders with only `hover:bg-blue-700` — no `focus-visible` ring:

```tsx
className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
```

Every other interactive element in Phase 5 (`Button`, `PaperCard` link, `Pagination` buttons, `SearchBar` clear button) applies `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2`. The error boundary is the sole exception. Keyboard users who arrive at this page have no visible focus indicator on the only actionable element. **Confirmed** — the class is absent from the file.

## Yellow badge contrast

`Badge` maps `'yellow'` to `bg-yellow-100 text-yellow-800`. Tailwind's `yellow-100` is `#fef9c3` and `yellow-800` is `#854d0e`. The contrast ratio between these values is approximately 4.6:1 — just above the WCAG AA 4.5:1 threshold for normal text at 12px (`text-xs`). At the exact Tailwind version in use the values can shift slightly. The resit badge on every `PaperCard` uses this combination; it warrants a contrast-checker pass before shipping. **Likely** — the calculation is based on Tailwind's documented hex values, not a live rendering.

## SearchBar role redundancy

The `<input>` carries both `role="searchbox"` and a visible `<label>` already connected via `htmlFor`/`id`. Adding `role="searchbox"` on a native `<input type="search">` is redundant — the native element already has an implicit `searchbox` role. The `aria-label` on the input is also redundant with the `<label>` element. Neither causes a broken experience, but screen readers may announce the label twice. The `<div role="search">` wrapper is correct; the redundant attributes on the input can be removed.

## Pagination ellipsis key stability

The ellipsis spans use `key={`ellipsis-${idx}`}` where `idx` is the index in the rendered page array. If the page array changes (e.g., navigating from page 3 to page 8 shifts which positions contain `'…'`), React may reuse the wrong DOM node. A stable key like `key={`ellipsis-left`}` / `key={`ellipsis-right`}` based on position relative to the current page would be safer. The current approach won't cause visible bugs in most cases because the ellipsis spans carry no state, but it is a latent correctness issue for future changes. **Possible** — only matters if ellipsis nodes are ever made interactive or carry state.

## Test coverage

No test files exist anywhere in the project. `buildPages` in `Pagination.tsx` is a pure function with five distinct branches (≤7 pages straight-list, ellipsis left only, ellipsis right only, both ellipses, boundaries). The URL-update logic in `SearchBar` (debounce, clear, external sync via `useEffect`) and `FilterPanel` (page reset on filter change) are the highest-value targets for unit tests because they govern the primary user interaction flow and have no runtime visibility when they break. The absence of tests is noted as a process gap rather than a blocking issue for this phase.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `src/components/ui/Button.tsx` | New: primary/secondary/ghost button with loading spinner and `aria-busy` |
| `src/components/ui/Input.tsx` | New: labelled input with `aria-describedby` error binding |
| `src/components/ui/Badge.tsx` | New: colour-mapped pill badge |
| `src/components/ui/Spinner.tsx` | New: accessible loading spinner with `role="status"` |
| `src/components/ui/Card.tsx` | New: polymorphic card wrapper |
| `src/components/SearchBar.tsx` | New: debounced search, URL-param driven, clear button |
| `src/components/FilterPanel.tsx` | New: four select filters writing to URL params |
| `src/components/PaperCard.tsx` | New: paper summary card with full-card link overlay |
| `src/components/PaperList.tsx` | New: responsive grid with skeleton loading and empty state |
| `src/components/Pagination.tsx` | New: URL-driven paginator with ellipsis and `aria-current` |
| `src/components/ContactForm.tsx` | New: "coming soon" placeholder (Phase 6 deferred) |
| `src/app/(public)/page.tsx` | New: Server Component home page, FTS + filter query, dynamic imports |
| `src/app/(public)/loading.tsx` | New: route-group spinner fallback |
| `src/app/(public)/error.tsx` | New: client error boundary with reset button |
| `src/app/(public)/contact/page.tsx` | New: contact route rendering ContactForm placeholder |
| `src/app/(public)/papers/[id]/page.tsx` | New: paper detail Server Component with breadcrumb and meta grid |
| `src/app/(public)/papers/[id]/DownloadButton.tsx` | New: client component calling download API, loading + error states |
| `src/app/(public)/papers/[id]/loading.tsx` | New: paper detail spinner fallback |
| `src/app/(public)/papers/[id]/not-found.tsx` | New: 404 page for unpublished/missing papers |

Full diff: `git diff main -- src/components/ui/ src/components/SearchBar.tsx src/components/FilterPanel.tsx src/components/PaperCard.tsx src/components/PaperList.tsx src/components/Pagination.tsx src/components/ContactForm.tsx src/app/\(public\)/`

</details>
