// src/app/(admin)/admin/page.tsx
//
// Admin dashboard — summary counts with links to each management area.
// Uses the admin (service-role) client to read all papers and messages
// regardless of their status, which the anon-key + RLS would otherwise filter.
//
// Why admin client?
//   - Papers: RLS allows admins to see all rows, but using the service-role
//     client avoids having to propagate the session cookie into a DB query
//     just for a count.
//   - contact_messages: RLS only allows admins to SELECT; using the admin
//     client ensures the query works even if the session cookie is absent
//     during SSR revalidation (e.g. on a CDN edge).
//
// force-dynamic: this page calls createAdminClient() which reads env vars
// at runtime; it must not be statically pre-rendered at build time.

export const dynamic = 'force-dynamic'

import Link from 'next/link'

import { createAdminClient } from '@/lib/supabase/admin'
import { AdminNav } from '@/components/AdminNav'

export default async function AdminDashboard() {
  const db = createAdminClient()

  const [papersRes, coursesRes, messagesRes] = await Promise.all([
    db.from('papers').select('status'),
    db.from('courses').select('id', { count: 'exact', head: true }),
    db
      .from('contact_messages')
      .select('read', { count: 'exact' })
      .eq('read', false),
  ])

  const papers = papersRes.data ?? []
  const publishedCount = papers.filter((p) => p.status === 'published').length
  const draftCount = papers.filter((p) => p.status === 'draft').length
  const coursesCount = coursesRes.count ?? 0
  const unreadCount = messagesRes.count ?? 0

  const stats = [
    {
      label: 'Published papers',
      value: publishedCount,
      href: '/admin/papers',
      color: 'bg-green-50 text-green-700',
    },
    {
      label: 'Draft papers',
      value: draftCount,
      href: '/admin/papers',
      color: 'bg-yellow-50 text-yellow-700',
    },
    {
      label: 'Courses',
      value: coursesCount,
      href: '/admin/papers',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Unread messages',
      value: unreadCount,
      href: '/admin/messages',
      color: 'bg-purple-50 text-purple-700',
    },
  ]

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(({ label, value, href, color }) => (
            <Link
              key={label}
              href={href}
              className={`flex flex-col items-center justify-center rounded-lg p-5 text-center shadow-sm transition-opacity hover:opacity-80 ${color}`}
            >
              <span className="text-3xl font-bold">{value}</span>
              <span className="mt-1 text-sm font-medium">{label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/admin/upload"
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
          >
            Upload new paper
          </Link>
          <Link
            href="/admin/papers"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Manage papers
          </Link>
          <Link
            href="/admin/messages"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View messages
          </Link>
        </div>
      </main>
    </>
  )
}
