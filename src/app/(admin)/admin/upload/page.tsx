// src/app/(admin)/admin/upload/page.tsx
//
// Admin paper upload / edit page. Loads courses server-side so the UploadForm
// select has options immediately without a client-side fetch.
//
// When ?edit=[id] is in the query string, the paper is fetched and the form is
// pre-filled in edit mode.
//
// force-dynamic: reads session cookies and calls Supabase at request time.
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminNav } from '@/components/AdminNav'
import { UploadForm } from '@/components/UploadForm'
import type { PapersRow, CoursesRow } from '@/types/database'

interface UploadPageProps {
  searchParams: { edit?: string }
}

export default async function UploadPage({ searchParams }: UploadPageProps) {
  // Belt-and-suspenders admin check (middleware already guards the route).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const db = createAdminClient()

  // Load courses for the select dropdown.
  const { data: courses } = await db
    .from('courses')
    .select('*')
    .order('code', { ascending: true })

  // If ?edit=[id] is present, load that paper for edit mode.
  let editPaper: (PapersRow & { courses: CoursesRow | null }) | null = null
  if (searchParams.edit) {
    const { data } = await db
      .from('papers')
      .select('*, courses(*)')
      .eq('id', searchParams.edit)
      .maybeSingle()
    if (data) {
      editPaper = data as PapersRow & { courses: CoursesRow | null }
    }
  }

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          {editPaper ? 'Edit paper' : 'Upload paper'}
        </h1>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <UploadForm courses={courses ?? []} editPaper={editPaper} />
        </div>
      </main>
    </>
  )
}
