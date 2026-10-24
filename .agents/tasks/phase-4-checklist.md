# Phase 4 Checklist — Admin Upload and Management

Use this checklist to manually verify Phase 4 functionality against a live
Supabase project. Complete every item before marking the phase done.

---

## Prerequisites

- `.env.local` contains valid values for all Supabase, Upstash, etc. variables.
- A Supabase project exists with migrations 001 and 002 applied.
- The `papers` bucket exists in Supabase Storage and is set to **Private**.
- At least one admin account exists (profile row with `role = 'admin'`).
- At least one course row exists in the `courses` table.

---

## 1  Admin login

- [ ] Navigate to `http://localhost:3000/admin` while logged out.
      Expected: redirected to `/login?error=auth-required`.
- [ ] Log in with a non-admin account.
      Expected: redirected to `/login?error=not-admin`.
- [ ] Log in with the admin account.
      Expected: redirected to `/admin` (dashboard) and all four stat cards are
      visible (Published papers, Draft papers, Courses, Unread messages).

---

## 2  Upload a PDF via the presigned flow

- [ ] Click **Upload new paper** or navigate to `/admin/upload`.
- [ ] Fill in all fields: Title (≥ 3 chars), select a course from the dropdown,
      Level, Year, Semester.
- [ ] Click the file picker, select a **PDF** file ≤ 10 MB.
- [ ] Verify the file name and size appear below the input.
- [ ] Click **Upload paper**.
      Expected: progress bar advances to 100%, then "Saving paper record…" text
      briefly appears, then a green "Paper uploaded successfully" banner.
- [ ] Open the Supabase Storage browser for the `papers` bucket.
      Expected: a new object exists at path `papers/<uuid>.pdf`.
- [ ] Navigate to `/admin/papers`.
      Expected: the new paper appears in the table with status **draft**.

---

## 3  Validate client-side rejection of bad files

- [ ] In the upload form, try to select a `.txt` file.
      Expected: "Only PDF, JPG, and PNG files are accepted." error shown without
      submitting.
- [ ] Try to select a file > 10 MB.
      Expected: "File must be 10 MB or smaller." error.

---

## 4  Publish a paper

- [ ] On `/admin/papers`, find the draft paper from step 2.
- [ ] Click **Publish**.
      Expected: the status badge changes from "draft" to "published" immediately.
- [ ] Reload the page; confirm the status is still "published" in the DB.
- [ ] Click **Unpublish** on the same paper.
      Expected: status reverts to "draft".

---

## 5  Edit a paper

- [ ] Click **Edit** next to any paper.
      Expected: browser navigates to `/admin/upload?edit=<id>` (Phase 4 provides
      the link; full edit pre-fill is a future enhancement if not yet wired).
- [ ] Alternatively, use the API directly:
      ```
      PATCH /api/papers/<id>
      Content-Type: application/json
      { "title": "Updated Title" }
      ```
      Expected: 200 response with the updated paper record.
- [ ] Confirm the change appears on `/admin/papers` after reload.

---

## 6  Delete a paper

- [ ] On `/admin/papers`, click **Delete** on any paper.
      Expected: browser shows a confirmation dialog.
- [ ] Confirm the deletion.
      Expected: the row disappears from the table immediately.
- [ ] Open Supabase Storage for the `papers` bucket.
      Expected: the corresponding Storage object has been removed.
- [ ] Attempt `GET /api/papers/<deleted-id>` (unauthenticated).
      Expected: 404 response.

---

## 7  API access control (no session)

- [ ] Open a fresh incognito window and attempt:
      `POST /api/upload/presign` with valid JSON.
      Expected: 401 Unauthorized.
- [ ] `POST /api/papers` with valid JSON.
      Expected: 403 Forbidden.
- [ ] `PATCH /api/papers/<any-id>` with `{ "status": "published" }`.
      Expected: 403 Forbidden.
- [ ] `DELETE /api/papers/<any-id>`.
      Expected: 403 Forbidden.
- [ ] `PATCH /api/messages/<any-id>` with `{ "read": true }`.
      Expected: 401 Unauthorized.

---

## 8  View and manage contact messages

- [ ] Submit a contact message via the public contact form (or insert one
      directly into `contact_messages` via the Supabase dashboard).
- [ ] Navigate to `/admin/messages`.
      Expected: the message appears with a blue "New" badge.
- [ ] Verify the unread count badge next to the "Messages" heading reflects
      the correct count.
- [ ] Click **Mark read** on the message.
      Expected: the "New" badge disappears and the card background turns white.
- [ ] Click **Mark unread** on the same message.
      Expected: the "New" badge reappears.

---

## 9  Dashboard counts

- [ ] Navigate to `/admin`.
- [ ] Verify the four count cards reflect the actual DB state:
      - Published papers: count of `papers` with `status = 'published'`
      - Draft papers: count of `papers` with `status = 'draft'`
      - Courses: count of rows in `courses`
      - Unread messages: count of `contact_messages` with `read = false`
- [ ] Each card should be a link navigating to the correct management page.

---

## 10  Admin navigation

- [ ] Confirm all four links in `<AdminNav>` are present and active-highlighted
      correctly on each admin route.
- [ ] Click **Sign out**.
      Expected: redirected to `/login` and `/admin` is no longer accessible.

---

## Notes

- The download route (`GET /api/papers/[id]/download`) is validated in Phase 5
  when the public paper detail page is implemented.
- Full edit pre-population on `/admin/upload?edit=<id>` is a nice-to-have
  enhancement; the core PATCH route is complete and tested via the API.
