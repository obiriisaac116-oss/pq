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

const EmailSubscribeForm = dynamicImport(
  () => import('@/components/EmailSubscribeForm'),
  {
    ssr: false,
    loading: () => (
      <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
    ),
  },
)

export const metadata: Metadata = {
  title: 'PastQuestions GH — Find Your Past Exam Papers',
  description: 'Browse and download past examination papers for your university courses.',
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

  // When programme or course_code filters are active, resolve matching course
  // IDs first.  PostgREST dot-notation filters on embedded relations are
  // outer-join predicates and silently no-op for rows with no joined course.
  // Fetching the IDs separately and using `.in('course_id', ids)` gives a
  // reliable inner-join-style predicate.
  let courseIds: string[] | null = null
  if (course_code || programme) {
    let courseQuery = supabase.from('courses').select('id')
    if (course_code) courseQuery = courseQuery.ilike('code', `${course_code}%`)
    if (programme) courseQuery = courseQuery.ilike('programme', `%${programme}%`)
    const { data: matchedCourses } = await courseQuery
    courseIds = (matchedCourses ?? []).map((c) => c.id)
  }

  // Build query — anon client, RLS restricts to published papers.
  let query = supabase
    .from('papers')
    .select<'*, courses(*)', PaperWithCoursePublic>('*, courses(*)', { count: 'exact' })
    .eq('status', 'published')

  if (q) {
    query = query.textSearch('search_vec', q, {
      type: 'websearch',
      config: 'english',
    })
  }
  if (level) query = query.eq('level', level)
  if (year) query = query.eq('year', year)
  if (semester) query = query.eq('semester', semester)
  // Apply course filter: if courseIds is an empty array, no papers can match.
  if (courseIds !== null) {
    if (courseIds.length === 0) {
      // No courses matched — return zero papers by using an impossible filter.
      query = query.in('course_id', [''])
    } else {
      query = query.in('course_id', courseIds)
    }
  }

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
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-primary to-brand-accent py-12 px-4 text-white text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Find Your Past Questions
          </h1>
          <p className="mt-3 text-lg text-white/80">
            Browse and download past exam papers for your university courses
          </p>
          {/* Search bar in hero */}
          <div className="mt-6">
            <Suspense fallback={<div className="h-11 w-full animate-pulse rounded-lg bg-white/20" />}>
              <SearchBar />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Email subscription */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-gray-100" />}>
            <EmailSubscribeForm />
          </Suspense>
        </div>
      </div>

      {/* Filters + results */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Filters */}
        <div className="mb-6">
          <Suspense
            fallback={
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-md bg-gray-100" />
                ))}
              </div>
            }
          >
            <FilterPanel programmes={programmes} />
          </Suspense>
        </div>

        {/* Results count */}
        {count !== null && count !== undefined && (
          <p className="mb-4 text-sm font-medium text-gray-600">
            {count === 0
              ? 'No papers found.'
              : `${count} paper${count !== 1 ? 's' : ''} found — showing ${offset + 1}–${Math.min(offset + per_page, count)}`}
          </p>
        )}

        {/* Results */}
        <Suspense fallback={<PaperList papers={[]} loading />}>
          <PaperList papers={papers ?? []} />
        </Suspense>

        {/* Pagination */}
        <Suspense fallback={null}>
          <Pagination currentPage={page} totalPages={totalPages} />
        </Suspense>
      </div>
    </main>
  )
}
