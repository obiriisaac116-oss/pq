# Phase 7 Test Suite

This review covers the Phase 7 test suite for the Past Questions website: three vitest unit test files (`validations.test.ts`, `redis.test.ts`, `email.test.ts`) and three Playwright e2e specs (`search.spec.ts`, `contact.spec.ts`, `admin.spec.ts`). The suite passed its complete run (28 unit tests, 11 e2e specs listed) per the evidence in `phase7-done.md`. The configuration is clean and no credentials are required to run the unit suite.

Watch for: one schema gap in `presignSchema` coverage (zero-byte and negative sizes not tested — confirmed), one `email.test.ts` assertion that reads its own input back instead of testing the function's behavior (confirmed), and the e2e specs' dependency on a live dev server that is not seeded (possible false-negative risk on `search.spec.ts` filter assertion).

**Verdict**: APPROVED

---

## High-level view

The `validations.test.ts` file covers all three production schemas. `contactSchema` and `searchSchema` are well exercised across both happy-path and invalid inputs. `presignSchema` tests the upper size boundary and content-type guard correctly, but skips the lower boundary (size ≤ 0) and does not exercise JPEG or PNG content types, leaving a thin gap against future `min(1)` regressions.

The Redis mock in `redis.test.ts` is correctly hoisted with `vi.hoisted()` and the sliding-window configuration assertions run before `vi.clearAllMocks()`, which is the right order. The email mock in `email.test.ts` is straightforward but one test checks that `callArg.to` equals `process.env.ADMIN_EMAIL ?? 'admin@example.com'` — the fallback side of that expression is never exercised and the main path just reads the env var back, making it a weak assertion.

The Playwright config targets `http://localhost:3100` spun up via `npm run dev`, which means e2e tests require a live server with real (or stubbed) environment variables. The `search.spec.ts` filter assertion uses `toBeAttached()` rather than `toBeVisible()`, so it passes even if the element is hidden, which weakens its signal in a real run. The admin redirect test is the strongest e2e assertion in the set — it verifies actual middleware behavior, not just rendering.

---

<details>
<summary>Issues (3)</summary>

1. **`presignSchema` lower-boundary gap** — `presignSchema` has `size: z.number().int().min(1)` but no test covers `size: 0` or `size: -1`. Add two cases to prevent regressions if the min constraint is accidentally removed.

2. **Self-referential `to` assertion in `email.test.ts`** — The "sends to ADMIN_EMAIL" test asserts `callArg.to === process.env.ADMIN_EMAIL ?? 'admin@example.com'`, but `ADMIN_EMAIL` was just set to `'admin@example.com'` in the same test, so the assertion is tautological. The test should assert a literal string (`'admin@example.com'`), not read back the variable it just assigned.

3. **`toBeAttached()` instead of `toBeVisible()` in filter assertion** — `search.spec.ts` uses `toBeAttached()` for the filter-element check. An attached-but-hidden element passes this assertion, so a UI regression that hides the filters would go undetected. Use `toBeVisible()` unless there's a deliberate reason to accept hidden elements.

</details>

<details>
<summary>Details</summary>

### `presignSchema` lower-boundary gap

`presignSchema` defines `size: z.number().int().min(1).max(MAX_FILE_SIZE)`. The test suite covers `MAX_FILE_SIZE + 1` (fails), `MAX_FILE_SIZE` exactly (passes), and a normal value (passes). Nothing tests `size: 0` or negative values, meaning the `min(1)` constraint is unverified. This is a confirmed gap — the relevant lines are the `presignSchema` describe block in `validations.test.ts`, which contains no sub-10-byte or zero cases.

### Self-referential `to` assertion in `email.test.ts`

In `email.test.ts`, the test "sends to ADMIN_EMAIL env var when set" does:

```ts
process.env.ADMIN_EMAIL = 'admin@example.com'
// ...
expect(callArg.to).toBe(process.env.ADMIN_EMAIL ?? 'admin@example.com')
```

Because `ADMIN_EMAIL` is set to `'admin@example.com'` on the line above, the right-hand side always evaluates to `'admin@example.com'` — the `??` fallback is dead. More importantly, the assertion is logically circular: it checks that the function sent to the same value as what the test just set the env var to, without verifying that the function correctly reads that env var rather than a hardcoded string. The fix is to assert the literal: `expect(callArg.to).toBe('admin@example.com')`. This is confirmed by reading the test.

### E2E filter assertion strength

`search.spec.ts` checks for filter elements with:

```ts
await expect(filterElements).toBeAttached()
```

`toBeAttached()` confirms the element is in the DOM but not that it's actually visible to the user. `toBeVisible()` would catch a regression where filters are present in the DOM but hidden via CSS. This is a low-stakes gap for a smoke test, but it's worth tightening. Confirmed in the spec file.


</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `tests/unit/validations.test.ts` | New — Zod schema unit tests for `contactSchema`, `presignSchema`, `searchSchema` |
| `tests/unit/redis.test.ts` | New — rate-limit unit tests with hoisted Upstash mocks |
| `tests/unit/email.test.ts` | New — `sendContactNotification` unit tests with Resend mock |
| `tests/e2e/search.spec.ts` | New — home/search page E2E smoke tests |
| `tests/e2e/contact.spec.ts` | New — contact page form-render E2E smoke tests |
| `tests/e2e/admin.spec.ts` | New — admin auth-guard and login page E2E smoke tests |
| `vitest.config.ts` | Updated — added `include: ['tests/unit/**/*.test.ts']` |
| `playwright.config.ts` | New — Playwright config targeting port 3100 with webServer setup |

Full diff: `git diff main -- tests/ vitest.config.ts playwright.config.ts`

</details>
