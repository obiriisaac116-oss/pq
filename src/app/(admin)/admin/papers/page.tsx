// src/app/(admin)/admin/papers/page.tsx
//
// Admin paper management table. Lists all papers (all statuses) with
// publish/unpublish, edit, and delete actions. Filters by title, course,
// level, semester, and status.
//
// Mutations (PATCH / DELETE) are handled by the PapersTable client component
// to keep the table interactive without full page reloads.
//
// Why admin client for the initial fetch?
//   RLS restricts public reads to status = 'published'. Admins need to see
//   drafts too; using the service-role client bypasses that restriction.
//
// force-dynamic: reads session cookies and calls Supabase at request time.
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminNav } from '@/components/AdminNav'
import { PapersTable } from '@/components/PapersTable'
import type { PapersRow, CoursesRow } from '@/types/database'

export type PaperWithCourse = PapersRow & { courses: CoursesRow | null }

export default async function PapersPage() {
  // Belt-and-suspenders admin check.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const db = createAdminClient()
  const { data: papers } = await db
    .from('papers')
    .select('*, courses(*)')
    .order('created_at', { ascending: false })

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Papers</h1>
          <a
            href="/admin/upload"
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
          >
            Upload new
          </a>
        </div>
        <PapersTable initialPapers={(papers ?? []) as PaperWithCourse[]} />
      </main>
    </>
  )
}
