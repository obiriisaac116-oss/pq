import type { Metadata } from 'next'
import dynamicImport from 'next/dynamic'
import { Suspense } from 'react'

import { createClient } from '@/lib/supabase/server'
import { searchSchema } from '@/lib/validations'
import { PaperList } from '@/components/PaperList'
import { Pagination } from '@/components/Pagination'
import type { PaperWithCoursePublic } from '@/components/PaperCard'
import type { CoursesRow } from '@/types/database'

// Dynamically import client-only components to avoid SSR hydration issues
// with useSearchParams (they must be wrapped in Suspense on the client).
const SearchBar = dynamicImport(
  () => import('@/components/SearchBar').then((m) => ({ default: m.SearchBar })),
  {
    ssr: false,
    loading: () => (
      <div className="h-11 w-full animate-pulse rounded-lg bg-gray-100" />
    ),
  },
)

const FilterPanel = dynamicImport(
  () =>
    import('@/components/FilterPanel').then((m) => ({ default: m.FilterPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-gray-100" />
        ))}
      </div>
    ),
  },
)

export const metadata: Metadata = {
  title: 'Browse Past Questions | Past Questions',
  description:
    'Search and download past examination papers by course, level, year, and semester.',
}

// This page is dynamic — search params vary per request.
export const dynamic = 'force-dynamic'

interface HomePageProps {
  searchParams: {
    q?: string
    programme?: string
    course_code?: string
    level?: string
    year?: string
    semester?: string
    page?: string
  }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  // Parse & validate search params.
  const parsed = searchSchema.safeParse(searchParams)
  const params = parsed.success
    ? parsed.data
    : { page: 1, per_page: 12, q: undefined, programme: undefined, course_code: undefined, level: undefined, year: undefined, semester: undefined }

  const { q, programme, course_code, level, year, semester, page, per_page } = params
  const offset = (page - 1) * per_page

  const supabase = await createClient()

  // Build query — anon client, RLS restricts to published papers.
  let query = supabase
    .from('papers')
    .select('*, courses(*)', { count: 'exact' })
    .eq('status', 'published')

  if (q) {
    query = query.textSearch('search_vec', q, {
      type: 'websearch',
      config: 'english',
    })
  }
  if (level) query = query.eq('level', String(level))
  if (year) query = query.eq('year', year)
  if (semester) query = query.eq('semester', semester)
  if (course_code) query = query.ilike('courses.code', `${course_code}%`)
  if (programme) query = query.ilike('courses.programme', `%${programme}%`)

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + per_page - 1)

  const { data: papers, count } = await query

  const totalPages = Math.ceil((count ?? 0) / per_page)

  // Fetch distinct programmes for the filter panel.
  const { data: courseRows } = await supabase
    .from('courses')
    .select('programme')
  const programmes = [
    ...new Set(
      (courseRows ?? [])
        .map((c: Pick<CoursesRow, 'programme'>) => c.programme)
        .filter((p): p is string => Boolean(p)),
    ),
  ].sort()

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Past Questions</h1>
        <p className="mt-2 text-gray-600">
          Browse, search, and download past examination papers.
        </p>
      </div>

      {/* Search & filters — client components inside Suspense */}
      <div className="mb-6 flex flex-col gap-4">
        <Suspense
          fallback={
            <div className="h-11 w-full animate-pulse rounded-lg bg-gray-100" />
          }
        >
          <SearchBar />
        </Suspense>
        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-md bg-gray-100"
                />
              ))}
            </div>
          }
        >
          <FilterPanel programmes={programmes} />
        </Suspense>
      </div>

      {/* Results count */}
      {count !== null && count !== undefined && (
        <p className="mb-4 text-sm text-gray-500">
          {count === 0
            ? 'No papers found.'
            : `Showing ${offset + 1}–${Math.min(offset + per_page, count)} of ${count} paper${count !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* Results */}
      <Suspense
        fallback={
          <PaperList papers={[]} loading />
        }
      >
        <PaperList papers={(papers ?? []) as unknown as PaperWithCoursePublic[]} />
      </Suspense>

      {/* Pagination */}
      <Suspense fallback={null}>
        <Pagination currentPage={page} totalPages={totalPages} />
      </Suspense>
    </main>
  )
}
