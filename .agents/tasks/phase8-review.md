# Phase 8: Deployment Configuration for Past Questions on Render

Phase 8 wires up the production deployment: a Render service definition (`render.yaml`), a GitHub Actions CI pipeline, a `/api/health` endpoint, and a complete README. No Vercel artifacts were introduced. The build evidence in `phase8-done.md` confirms lint, build, and all 30 unit tests passed at exit 0; the git push did not complete due to a local network timeout, leaving the commit at `5c40b47` local-only. Watch for: the git push is incomplete — the commit has not reached GitHub and Render auto-deploy has not triggered.

**Verdict**: APPROVED

---

## High-level view

The `render.yaml` is correctly formed: `healthCheckPath: /api/health` matches the implemented route, every secret is declared with `sync: false` so Render never pulls them from a service group, and the build/start commands match the package.json scripts. `NODE_VERSION: 20.11.0` is pinned explicitly. No `vercel.json` exists — confirmed by filesystem check.

CI runs on Node 20, stubs the four `NEXT_PUBLIC_*` variables needed for the Next.js build, and executes lint → build → `vitest run`. Playwright is not invoked. The `vitest run` step runs without the env stubs re-declared; if any test module reads a `NEXT_PUBLIC_*` value at import time it will see `undefined`, which could produce silent failures rather than explicit test errors on CI.

The health endpoint returns `{ status: 'ok' }` with no external I/O — a fast, unconditional 200 suitable for Render's shallow health check.

The README covers every dependency (Supabase, Resend, Upstash, Turnstile) with step-by-step setup, the Render deploy path, Cloudflare DNS, and the admin seeding SQL. No mention of Vercel anywhere. The one open action item is the git push: the commit exists locally but has not reached `origin/main`, so Render has not seen it yet.

---

<details>
<summary>Issues (2)</summary>

1. **Git push incomplete** — The Phase 8 commit (`5c40b47`) timed out during `git push origin main` and has not reached GitHub. Render auto-deploy has not triggered. Run `git push origin main` manually to complete the deployment.

2. **Vitest env stub gap (possible)** — The `NEXT_PUBLIC_*` env stubs are only set on the `npm run build` step. The subsequent `npx vitest run` step inherits no values for those vars. If any test imports application code that reads `NEXT_PUBLIC_*` at module load time, the value will be `undefined` silently. Add the stubs to the `vitest run` step as well, or declare them at the job level.

</details>

<details>
<summary>Details</summary>

### CI env stub scope

```yaml
- run: npm run build
  env:
    NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-anon-key
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: 1x00000000000000000000AA
    NEXT_PUBLIC_SITE_URL: https://example.com
- run: npx vitest run        # ← no env stubs here
```

`NEXT_PUBLIC_*` values baked into the Next.js bundle by the build step are irrelevant to Vitest, which imports TypeScript source directly. If any source module does `const url = process.env.NEXT_PUBLIC_SUPABASE_URL` at the top level (outside a function), Vitest will evaluate that during module resolution and get `undefined`. The current 30-test suite passes locally where `.env.local` provides those values; CI may behave differently. Moving the env block to the job level removes the ambiguity.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `.github/workflows/ci.yml` | New: CI pipeline — Node 20, lint, build with env stubs, vitest |
| `render.yaml` | New: Render web service definition with health check and all env vars |
| `src/app/api/health/route.ts` | New: minimal health endpoint returning `{ status: 'ok' }` |
| `README.md` | New: full project README covering local setup, all services, Render deploy, admin seeding |
| `.gitignore` | Pre-existing; all required entries confirmed present |

</details>
