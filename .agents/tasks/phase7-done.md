# Phase 7 — Tests: Verification Note

## Test files created

### Unit tests (`tests/unit/`)
- `validations.test.ts` — tests `contactSchema`, `presignSchema`, `searchSchema` from `@/lib/validations`
- `redis.test.ts` — mocks `@upstash/redis` and `@upstash/ratelimit` via `vi.hoisted()` + `vi.mock()`, tests `contactRatelimit` and `downloadRatelimit` exports
- `email.test.ts` — mocks `resend` Resend class, tests `sendContactNotification()` sends correct args and re-throws on error

### E2E tests (`tests/e2e/`)
- `search.spec.ts` — navigates to `/`, asserts search input visible, asserts filter elements present
- `contact.spec.ts` — navigates to `/contact`, asserts name/email/message fields present (no submission)
- `admin.spec.ts` — navigates to `/admin/papers`, asserts redirect to `/login`; asserts email input, password input, submit button render

### vitest.config.ts updated
- Added `include: ['tests/unit/**/*.test.ts']`
- Kept `passWithNoTests: true`
- Kept `@/*` alias

---

## Vitest run result

```
 Test Files  3 passed (3)
      Tests  28 passed (28)
   Start at  12:33:50
   Duration  1.71s
```

Exit code: **0** ✓

---

## Playwright list result

```
Listing tests:
  [chromium] › admin.spec.ts:10:7  › Admin auth guard › navigating to /admin/papers redirects to /login
  [chromium] › admin.spec.ts:16:7  › Admin auth guard › login page renders email input
  [chromium] › admin.spec.ts:24:7  › Admin auth guard › login page renders password input
  [chromium] › admin.spec.ts:32:7  › Admin auth guard › login page renders a submit button
  [chromium] › contact.spec.ts:9:7 › Contact page › renders the contact form
  [chromium] › contact.spec.ts:15:7 › Contact page › name field is present
  [chromium] › contact.spec.ts:23:7 › Contact page › email field is present
  [chromium] › contact.spec.ts:31:7 › Contact page › message field is present
  [chromium] › search.spec.ts:10:7 › Home / Search page › loads the home page
  [chromium] › search.spec.ts:16:7 › Home / Search page › search input is visible
  [chromium] › search.spec.ts:24:7 › Home / Search page › filter panel or select elements are present
Total: 11 tests in 3 files
```

Exit code: **0** ✓

---

## Build result

```
Route (app)                              Size     First Load JS
...
✓ Collecting build traces
✓ Finalizing page optimization
```

Exit code: **0** ✓

---

## Notes

- The plan's `ContactSchema`, `PaperUploadSchema`, `SearchSchema` names were not in the actual implementation. The real exports are `contactSchema`, `presignSchema` (covers file upload validation), and `searchSchema`. Tests were written against the actual exports.
- The honeypot field in `contactSchema` is `optional()` in the schema; the bot-guard is enforced in the route handler. The test verifies the schema accepts the value and the field is readable — consistent with the existing route logic.
- `vi.hoisted()` was used in `redis.test.ts` to avoid the temporal dead zone error that arises when `vi.mock()` factory functions reference variables declared outside `vi.hoisted()`.
