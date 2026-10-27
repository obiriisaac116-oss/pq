// src/app/(admin)/admin/courses/page.tsx
//
// Admin courses management page. Loads all courses server-side and passes them
// to the interactive CoursesTable client component for inline editing.
//
// force-dynamic: reads session cookies at request time.
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminNav } from '@/components/AdminNav'
import { CoursesTable } from '@/components/CoursesTable'

export default async function CoursesPage() {
  // Belt-and-suspenders admin check (middleware already guards the route).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const db = createAdminClient()
  const { data: courses } = await db
    .from('courses')
    .select('*')
    .order('code', { ascending: true })

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Courses</h1>
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <CoursesTable initialCourses={courses ?? []} />
        </div>
      </main>
    </>
  )
}
