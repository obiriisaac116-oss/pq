// src/app/(admin)/admin/page.tsx
//
// Admin dashboard — summary counts, quick-action buttons, top papers by
// downloads, and recent uploads.
//
// Uses the admin (service-role) client to read all papers and messages
// regardless of their status, which the anon-key + RLS would otherwise filter.
//
// force-dynamic: reads env vars at runtime; must not be statically pre-rendered.

export const dynamic = 'force-dynamic'

import Link from 'next/link'

import { createAdminClient } from '@/lib/supabase/admin'
import { AdminNav } from '@/components/AdminNav'
import type { CoursesRow } from '@/types/database'

export default async function AdminDashboard() {
  const db = createAdminClient()

  const [papersRes, coursesRes, messagesRes, topPapersRes, recentPapersRes, subscribersRes] =
    await Promise.all([
      db.from('papers').select('status'),
      db.from('courses').select('id', { count: 'exact', head: true }),
      db
        .from('contact_messages')
        .select('read', { count: 'exact' })
        .eq('read', false),
      db
        .from('papers')
        .select('id, title, downloads, courses(code, name)')
        .order('downloads', { ascending: false })
        .limit(10),
      db
        .from('papers')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      db.from('subscribers').select('id', { count: 'exact', head: true }),
    ])

  const papers = papersRes.data ?? []
  const publishedCount = papers.filter((p) => p.status === 'published').length
  const draftCount = papers.filter((p) => p.status === 'draft').length
  const coursesCount = coursesRes.count ?? 0
  const unreadCount = messagesRes.count ?? 0
  const subscribersCount = subscribersRes.count ?? 0

  const topPapers = topPapersRes.data ?? []
  const recentPapers = recentPapersRes.data ?? []

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
      href: '/admin/courses',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Unread messages',
      value: unreadCount,
      href: '/admin/messages',
      color: 'bg-purple-50 text-purple-700',
    },
    {
      label: 'Subscribers',
      value: subscribersCount,
      href: '/admin',
      color: 'bg-pink-50 text-pink-700',
    },
  ]

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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

        {/* Quick actions */}
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
          <Link
            href="/admin/courses"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Manage courses
          </Link>
        </div>

        {/* Top papers by downloads */}
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Top papers by downloads
          </h2>
          {topPapers.length === 0 ? (
            <p className="text-sm text-gray-500">No download data yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="w-10 px-4 py-3 text-left font-semibold text-gray-600"
                    >
                      #
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-semibold text-gray-600"
                    >
                      Title
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-semibold text-gray-600"
                    >
                      Course
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-semibold text-gray-600"
                    >
                      Downloads
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {topPapers.map((paper, index) => {
                    const course = paper.courses as CoursesRow | null
                    return (
                      <tr key={paper.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {paper.title}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {course ? (
                            <span className="font-mono text-xs">{course.code}</span>
                          ) : (
                            <span className="italic text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                          {paper.downloads}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent uploads */}
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Recent uploads</h2>
          {recentPapers.length === 0 ? (
            <p className="text-sm text-gray-500">No papers uploaded yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentPapers.map((paper) => (
                <li
                  key={paper.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm"
                >
                  <span className="text-gray-900">{paper.title}</span>
                  <span
                    className={[
                      'ml-4 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      paper.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700',
                    ].join(' ')}
                  >
                    {paper.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  )
}
