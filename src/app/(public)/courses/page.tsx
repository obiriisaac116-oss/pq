// src/app/(public)/courses/page.tsx
//
// Server component. Lists all courses with their published paper counts.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Courses | PastQuestions GH',
  description: 'Browse past exam papers by course at Takoradi Technical University.',
}

export default async function CoursesPage() {
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from('courses')
    .select('id, code, name, programme')

  const { data: paperCounts } = await supabase
    .from('papers')
    .select('course_id')
    .eq('status', 'published')
    .eq('archived', false)

  // Group paper counts by course_id
  const countMap: Record<string, number> = {}
  for (const row of paperCounts ?? []) {
    if (row.course_id) {
      countMap[row.course_id] = (countMap[row.course_id] ?? 0) + 1
    }
  }

  // Sort by paper count descending
  const sorted = [...(courses ?? [])].sort(
    (a, b) => (countMap[b.id] ?? 0) - (countMap[a.id] ?? 0),
  )

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Courses</h1>
      <p className="mb-6 text-sm text-gray-500">
        Browse past exam papers by course. Click a course to see all available papers.
      </p>

      {sorted.length === 0 ? (
        <p className="text-gray-500">No courses available yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((c) => {
            const count = countMap[c.id] ?? 0
            return (
              <Link
                key={c.id}
                href={`/?course_code=${encodeURIComponent(c.code)}`}
                className="group rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col"
              >
                <span className="text-xs font-bold uppercase tracking-widest text-brand-primary mb-1">
                  {c.code}
                </span>
                <h2 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                  {c.name}
                </h2>
                {c.programme && (
                  <span className="text-xs text-gray-500 mb-3">{c.programme}</span>
                )}
                <span className="mt-auto text-xs font-medium text-gray-400">
                  {count} paper{count !== 1 ? 's' : ''}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
