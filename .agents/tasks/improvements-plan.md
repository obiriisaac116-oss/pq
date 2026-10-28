# Implementation Plan — 20 UI/UX Improvements + Dark Mode Removal

> Artifact root: `/home/hysterical/Desktop/PQ/.agents/tasks/task-ui-improvements/`
> Context: `context.json` — read first for build commands, patterns, constraints.
> FEATs: `features/FEAT-001.json` through `features/FEAT-004.json`

---

## Feature breakdown

| FEAT | Scope | Items |
|------|-------|-------|
| FEAT-001 | Remove dark mode | ThemeToggle delete, dark: classes, tailwind config |
| FEAT-002 | Public UI | #1 hero counter, #2 tooltip, #3 breadcrumb, #4 empty state, #5 skeleton, #6 sticky search, #7 print/copy, #8 related papers, #9 recently viewed, #10 trending badge, #18 prefetch |
| FEAT-003 | Admin + SearchBar | #11 bulk actions, #12 preview modal, #13 search history, #14 keyboard shortcut, #19 inline toggle, #20 unsaved warning |
| FEAT-004 | Infrastructure | #16 sharp, #17 OG image, build/test/commit/push |

---

## FEAT-001 — Remove dark mode entirely (prerequisite for all others)

- [ ] 1. Remove `darkMode: 'class'` line from `tailwind.config.ts`.
      Files: `tailwind.config.ts`
      Verify: Build passes (step 7).

- [ ] 2. Strip dark mode from `src/app/layout.tsx`: remove `import Script`, remove the `<head>` block with theme-init Script, remove `suppressHydrationWarning` from `<html>`, change body className to `"bg-white text-gray-900"`.
      Files: `src/app/layout.tsx`

- [ ] 3. Remove ThemeToggle from public layout: remove import and `<ThemeToggle />` from nav.
      Files: `src/app/(public)/layout.tsx`

- [ ] 4. Remove ThemeToggle from AdminNav: remove import and `<ThemeToggle />` from right-actions div.
      Files: `src/components/AdminNav.tsx`

- [ ] 5. Strip all `dark:` variants from PaperCard: semesterColor and fileTypeBg records, article className, Badge classNames, course code/programme spans, title h2, downloads span.
      Files: `src/components/PaperCard.tsx`

- [ ] 6. Strip all `dark:` variants from FilterPanel: selectClass string, label classNames, mobile toggle button className.
      Files: `src/components/FilterPanel.tsx`

- [ ] 7. Delete `src/components/ThemeToggle.tsx`.
      Files: `src/components/ThemeToggle.tsx` (DELETE)
      Verify: `cd /home/hysterical/Desktop/PQ && npm run build && npm run test:unit`

---

## FEAT-002 — Public UI improvements (items #1–10, #18)

Depends on FEAT-001. Independent of FEAT-003.

- [ ] 8. Hero paper count (#1): In `src/app/(public)/page.tsx`, add a count query after the existing supabase client creation:
      ```ts
      const { count: paperCount } = await supabase
        .from('papers').select('*', { count: 'exact', head: true })
        .eq('status', 'published')
      ```
      Add below the subtitle `<p>` in the hero JSX:
      ```tsx
      <p className="mt-2 text-2xl font-bold text-white">
        {(paperCount ?? 0).toLocaleString()}+ past papers available
      </p>
      ```
      Files: `src/app/(public)/page.tsx`

- [ ] 9. PaperCard hover tooltip (#2): In `src/components/PaperCard.tsx`, add just before `</article>`:
      ```tsx
      <div role="tooltip"
        className="pointer-events-none absolute inset-x-0 top-full z-20 mt-1
          hidden rounded-lg bg-white px-3 py-2 shadow-lg ring-1 ring-gray-200
          opacity-0 group-hover:opacity-100 transition-opacity duration-150 md:block">
        <p className="text-xs font-semibold text-gray-800">{course?.name ?? ''}</p>
        <p className="text-xs text-gray-500">{course?.programme ?? ''}</p>
      </div>
      ```
      Files: `src/components/PaperCard.tsx`

- [ ] 10. Trending badge (#10): In `src/components/PaperCard.tsx`, after the top color bar div:
      ```tsx
      {(paper.downloads ?? 0) > 10 && (
        <span className="absolute top-2 left-2 z-10 inline-flex items-center
          gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
          🔥 Trending
        </span>
      )}
      ```
      Files: `src/components/PaperCard.tsx`

- [ ] 11. Prefetch (#18): Add `prefetch={true}` to the `<Link>` in `src/components/PaperCard.tsx`.
      Files: `src/components/PaperCard.tsx`

- [ ] 12. Improved loading skeleton (#5): Rewrite `SkeletonCard` in `src/components/PaperList.tsx` with colored top bar (`h-1 rounded-t-2xl w-full bg-gray-200`), then p-4 area containing: two badge placeholders, course code line, two title lines, semester badge placeholder, footer row.
      Files: `src/components/PaperList.tsx`

- [ ] 13. Empty state SVG (#4): In `src/components/PaperList.tsx`, replace the small 56x56 magnifying glass SVG with an 80x80 books+magnifying-glass SVG using `stroke="#1d4ed8"`:
      ```tsx
      <svg aria-hidden width="80" height="80" viewBox="0 0 24 24" fill="none"
        stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        className="mb-4">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        <circle cx="18.5" cy="4.5" r="1.5"/>
        <line x1="19.5" y1="5.5" x2="21" y2="7"/>
      </svg>
      ```
      Files: `src/components/PaperList.tsx`

- [ ] 14. Breadcrumb › separators + 40-char title truncation (#3): In `src/app/(public)/papers/[id]/page.tsx`, change the two `/` separator `<li>` items to use `›`. Change the last `<li>`'s content to `{paper.title.length > 40 ? paper.title.slice(0, 40) + '…' : paper.title}`.
      Files: `src/app/(public)/papers/[id]/page.tsx`

- [ ] 15. Copy link + Print buttons (#7): Create `src/app/(public)/papers/[id]/ActionButtons.tsx` as a 'use client' component with Copy link (clipboard + "Copied!" feedback) and Print buttons. Import and render after `<DownloadButton>` in `src/app/(public)/papers/[id]/page.tsx`.
      Files: `src/app/(public)/papers/[id]/ActionButtons.tsx` (new), `src/app/(public)/papers/[id]/page.tsx`

- [ ] 16. Related papers (#8): In `src/app/(public)/papers/[id]/page.tsx`, fetch up to 4 published papers from same course excluding current, pass to a grid below the main card using `<PaperCard>`. Import PaperCard from `@/components/PaperCard`.
      Files: `src/app/(public)/papers/[id]/page.tsx`

- [ ] 17. Save to history (#9a): Create `src/app/(public)/papers/[id]/SaveToHistory.tsx` ('use client', returns null, saves paper ID to `pq:recentlyViewed` localStorage on mount). Render it as first child of `<main>` in `src/app/(public)/papers/[id]/page.tsx`.
      Files: `src/app/(public)/papers/[id]/SaveToHistory.tsx` (new), `src/app/(public)/papers/[id]/page.tsx`

- [ ] 18. RecentlyViewed components (#9b): Create `src/components/RecentlyViewed.tsx` (server-compatible, accepts `papers` prop, renders PaperCards). Create `src/components/RecentlyViewedWrapper.tsx` ('use client', reads localStorage on mount, fetches papers via `/api/papers/[id]`, renders RecentlyViewed). In `src/app/(public)/page.tsx`, add dynamic import (ssr: false) for RecentlyViewedWrapper and render it above the FilterPanel section.
      Files: `src/components/RecentlyViewed.tsx` (new), `src/components/RecentlyViewedWrapper.tsx` (new), `src/app/(public)/page.tsx`

- [ ] 19. Sticky search bar (#6): Create `src/components/StickySearchWrapper.tsx` ('use client', renders a sentinel div + fixed sticky search bar controlled by IntersectionObserver). Dynamic import (ssr: false) in `src/app/(public)/page.tsx`, rendered just before the `email subscription` section or after the hero section.
      Files: `src/components/StickySearchWrapper.tsx` (new), `src/app/(public)/page.tsx`
      Verify: `cd /home/hysterical/Desktop/PQ && npm run build && npm run test:unit`

---

## FEAT-003 — Admin UI + SearchBar enhancements (items #11–15, #19, #20)

Depends on FEAT-001. Independent of FEAT-002.

- [ ] 20. Bulk actions (#11): In `src/components/PapersTable.tsx`, add `selected: Set<string>` and `bulkBusy: boolean` state. Add checkbox column to desktop table header (select-all) and each row. Add bulk action bar above table when selection non-empty with "Publish all", "Unpublish all", "Delete all" buttons using `Promise.all`. Update desktop table colSpan to 9. Mirror checkbox logic in mobile card view.
      Files: `src/components/PapersTable.tsx`

- [ ] 21. Inline status toggle (#19): In `src/components/PapersTable.tsx`, replace the status `<span>` in the Status column (both desktop and mobile) with a `<button>` that calls `toggleStatus(paper)` with hover state showing the opposite color. Remove the separate Publish/Unpublish button from the Actions column in both desktop and mobile.
      Files: `src/components/PapersTable.tsx`

- [ ] 22. Quick preview modal (#12): In `src/components/PapersTable.tsx`, add `previewPaperId`, `previewUrl`, `previewLoading`, `previewFileType` state. Add `openPreview(paper)` function that fetches `/api/papers/[id]/download` for the signed URL. Add a "Preview" button in each row's Actions. Add a fixed modal overlay at the end of the JSX that shows the signed URL in an iframe (pdf) or img. Modal closes on backdrop click or close button.
      Files: `src/components/PapersTable.tsx`

- [ ] 23. Search history chips (#13): In `src/components/SearchBar.tsx`, add `searchHistory: string[]` state (loaded from `pq:searchHistory` localStorage on mount). Save searches on debounce. Show chips panel when `isFocused && value === ''` — position it absolutely below the input. Each chip has a click handler (fills search) and an X button (removes from history). On Escape, hide chips.
      Files: `src/components/SearchBar.tsx`

- [ ] 24. Keyboard shortcut '/' (#14): In `src/components/SearchBar.tsx`, add `inputRef` to the `<input>`. Add a global `keydown` useEffect that focuses the input on `/` when the active element is not an input/textarea/select. Add a `<kbd aria-hidden>` hint badge positioned `right-10` inside the search wrapper, visible only on `sm+` and only when `!value`.
      Files: `src/components/SearchBar.tsx`

- [ ] 25. Unsaved changes warning (#20): In `src/components/UploadForm.tsx`, add `isDirty: boolean` state. Set it to true in every field's onChange handler. Set to false on successful submit. Add a useEffect that attaches `beforeunload` listener when `isDirty` is true and removes it otherwise.
      Files: `src/components/UploadForm.tsx`
      Verify: `cd /home/hysterical/Desktop/PQ && npm run build && npm run test:unit`

---

## FEAT-004 — Infrastructure: sharp + OG image + commit/push

Depends on FEAT-001, FEAT-002, FEAT-003 (must run last — builds and pushes).

- [ ] 26. Install sharp (#16): Run `npm install --save-exact sharp@0.33.5` from `/home/hysterical/Desktop/PQ`.
      Files: `package.json`, `package-lock.json`

- [ ] 27. Open Graph image for paper detail (#17): Create `src/app/(public)/papers/[id]/opengraph-image.tsx` using `ImageResponse` from `next/og`. Fetch paper title/year/semester/course code from Supabase. Render a 1200×630 image with blue (#1d4ed8) background and white text. Use only inline styles inside ImageResponse (no Tailwind). Export `runtime = 'nodejs'`, `alt`, `size`, `contentType`.
      Files: `src/app/(public)/papers/[id]/opengraph-image.tsx` (new)

- [ ] 28. Final build + test verification: Run `npm run build` (must pass zero errors). Run `npm run test:unit` (all tests must pass). If icons are missing, run `node scripts/gen-icons.mjs` first.
      Verify: `cd /home/hysterical/Desktop/PQ && npm run build && npm run test:unit`

- [ ] 29. Commit and push: Configure git user (`git config user.email 'obiriisaac116@gmail.com'` and `git config user.name 'Isaac Obiri'`). Stage all changed files (stage by path, not `git add -A`). Commit with message `'feat: 20 UI/UX improvements + remove dark mode'`. Push to `main` on `https://github.com/obiriisaac116-oss/pq.git` using the provided token in the remote URL. Do not echo the token.
      Verify: `cd /home/hysterical/Desktop/PQ && git log --oneline -1`

---

## Key constraints (from codebase reading)

1. **Config file is `next.config.mjs`** — not `.ts` or `.js`. Never create `next.config.ts`.
2. **`PapersRow.level` is `string | null`** — not a number type in TypeScript.
3. **Zod v4 API**: `z.string().email()` not `z.email()`.
4. **vitest only runs** `tests/unit/**/*.test.ts` — component tests go there if needed.
5. **No `git add -A`** — stage specific file paths.
6. **The `dark:` class prefix appears in 5 files** — all listed in FEAT-001 steps 1-7.
7. **ThemeToggle is imported in 2 files** — `(public)/layout.tsx` and `AdminNav.tsx`.
8. **OG image must use inline styles** inside ImageResponse — Tailwind classes are ignored there.
9. **RecentlyViewedWrapper fetches from `/api/papers/[id]`** — the GET handler returns `{ data: paper }`, so destructure accordingly.
10. **StickySearchWrapper must be dynamically imported with `ssr: false`** because it uses IntersectionObserver.
