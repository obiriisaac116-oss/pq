# Phase 1 Verification Checklist

Project root: `/home/hysterical/Desktop/PQ`
Stack: Next.js 14.2.29 (App Router) · React 18.3.1 · TypeScript 5.8.3 ·
Tailwind CSS 3.4.17 · ESLint 8. Run commands from the project root.

## 1. Node version

```bash
node --version    # expected: v20.x  (>=18.17.0 required by Next 14)
npm --version
```

## 2. Install dependencies

```bash
npm install
```

Expected: completes with no `ERESOLVE` errors and a populated
`node_modules/` directory.

```bash
# confirm key packages resolved to the pinned versions
npm ls next react @supabase/supabase-js zod vitest @playwright/test
```

## 3. Build (the gate for this phase)

```bash
npm run build
```

Expected: completes with **zero** TypeScript and ESLint errors and produces a
`.next/` output directory. The build must succeed **without** real credentials
because no environment variable is read at module top-level.

## 4. Lint

```bash
npm run lint
```

Expected: no errors.

## 5. Unit test runner is wired (no tests yet)

```bash
npm run test:unit
```

Expected: Vitest runs and reports "No test files found, exiting with code 0"
(`passWithNoTests` keeps the runner green during scaffolding) — it must
exit 0.

## 6. Inspect the folder structure

```bash
# tree view (if `tree` is installed)
tree -a -I 'node_modules|.next' -L 4

# portable alternative
find . -not -path './node_modules/*' -not -path './.next/*' \
  -not -path './.git/*' -type f | sort
```

Key things that should exist:

- `src/app/layout.tsx` and `src/app/globals.css` (root layout + Tailwind)
- `src/app/(public)/page.tsx` (home page stub)
- Route groups: `src/app/(public)/` and `src/app/(admin)/`
- Admin pages folders: `src/app/(admin)/admin/{upload,papers,messages}/`
- `src/app/(admin)/login/`
- API folders: `src/app/api/papers/[id]/`, `src/app/api/upload/presign/`,
  `src/app/api/contact/`
- `src/components/ui/`, `src/lib/supabase/`, `src/types/`
- `tests/unit/`, `tests/e2e/`
- `supabase/migrations/`

## 7. Config sanity

```bash
# path alias is set
grep -q '"@/\*"' tsconfig.json && echo "alias OK"
# Tailwind content path points at src
grep -q "./src/**/*.{ts,tsx}" tailwind.config.ts && echo "tailwind OK"
# env example lists every required key (13 vars)
grep -cE '^(NEXT_PUBLIC_|SUPABASE_|UPSTASH_|RESEND_|ADMIN_|TURNSTILE_)' .env.example
```

## 8. .env.local is gitignored (and not created with secrets)

```bash
git check-ignore .env.local && echo "ignored OK"
test ! -f .env.local && echo "no .env.local created OK"
```

## 9. Git

```bash
git log --oneline | head -1     # latest commit should be the Phase 1 scaffold
git status                      # working tree clean (after commit)
```
