// src/app/(admin)/admin/upload/page.tsx
//
// Admin paper upload page. Loads courses server-side so the UploadForm select
// has options immediately without a client-side fetch.
//
// Admin access is enforced by the middleware; the server client session check
// here is belt-and-suspenders to guard the data fetch.
//
// force-dynamic: reads session cookies and calls Supabase at request time.
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminNav } from '@/components/AdminNav'
import { UploadForm } from '@/components/UploadForm'

export default async function UploadPage() {
  // Belt-and-suspenders admin check (middleware already guards the route).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') redirect('/login?error=not-admin')

  // Load courses via admin client so we see all courses (RLS allows public
  // read anyway, but using admin client is consistent with the rest of the
  // admin area and avoids an additional session propagation).
  const db = createAdminClient()
  const { data: courses } = await db
    .from('courses')
    .select('*')
    .order('code', { ascending: true })

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Upload paper</h1>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <UploadForm courses={courses ?? []} />
        </div>
      </main>
    </>
  )
}
