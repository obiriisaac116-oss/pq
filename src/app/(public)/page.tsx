import type { Metadata } from 'next'
import dynamicImport from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
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

const RecentlyViewedWrapper = dynamicImport(
  () => import('@/components/RecentlyViewedWrapper'),
  { ssr: false },
)

const StickySearchWrapper = dynamicImport(
  () => import('@/components/StickySearchWrapper'),
  { ssr: false },
)

const ResultFilter = dynamicImport(
  () => import('@/components/ResultFilter').then((m) => ({ default: m.ResultFilter })),
  { ssr: false },
)

const DownloadHistory = dynamicImport(
  () => import('@/components/DownloadHistory').then((m) => ({ default: m.DownloadHistory })),
  { ssr: false },
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
    year_from?: string
    year_to?: string
    tag?: string
    semester?: string
    page?: string
  }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  // Parse & validate search params.
  const parsed = searchSchema.safeParse(searchParams)
  const params = parsed.success
    ? parsed.data
    : { page: 1, per_page: 12, q: undefined, programme: undefined, course_code: undefined, level: undefined, year: undefined, year_from: undefined, year_to: undefined, tag: undefined, semester: undefined }

  const { q, programme, course_code, level, year, year_from, year_to, tag, semester, page, per_page } = params
  const offset = (page - 1) * per_page

  const supabase = await createClient()

  // Fetch total published paper count for the hero counter.
  const { count: paperCount } = await supabase
    .from('papers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')

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
  if (year_from) query = query.gte('year', year_from)
  if (year_to) query = query.lte('year', year_to)
  if (tag) query = query.contains('tags', [tag])
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

  // Fetch distinct tags for tag chips.
  const { data: tagRows } = await supabase
    .from('papers')
    .select('tags')
    .eq('status', 'published')
  const allTags = [
    ...new Set(
      (tagRows ?? []).flatMap((r) => r.tags ?? []),
    ),
  ].sort()

  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-primary to-brand-accent py-12 px-4 text-white">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center gap-8">
          {/* TTU Logo */}
          <div className="flex-shrink-0">
            <Image
              src="/ttu-logo.jpg"
              alt="Takoradi Technical University 70th Anniversary"
              width={160}
              height={216}
              className="rounded-xl shadow-lg border-2 border-white/30"
              priority
            />
          </div>
          {/* Text + search */}
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-semibold uppercase tracking-widest text-white/70 mb-2">
              Takoradi Technical University
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Find Your Past Questions
            </h1>
            <p className="mt-3 text-lg text-white/80">
              Browse and download past exam papers for your TTU courses
            </p>
            <p className="mt-2 text-2xl font-bold text-white">
              {(paperCount ?? 0).toLocaleString()}+ past papers available
            </p>
            {/* Search bar in hero */}
            <div className="mt-6">
              <Suspense fallback={<div className="h-11 w-full animate-pulse rounded-lg bg-white/20" />}>
                <SearchBar />
              </Suspense>
            </div>
            <div className="mt-3 text-center sm:text-left">
              <Link href="/request" className="text-sm text-white/80 hover:text-white underline underline-offset-2">
                Can&apos;t find your paper? Request it →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky search bar — appears when hero scrolls out of view */}
      <Suspense fallback={null}>
        <StickySearchWrapper />
      </Suspense>

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
        {/* Recently viewed papers */}
        <Suspense fallback={null}>
          <RecentlyViewedWrapper />
        </Suspense>

        {/* Download history */}
        <Suspense fallback={null}>
          <DownloadHistory />
        </Suspense>

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

        {/* Tag chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {allTags.map((t) => {
              const isActive = tag === t
              const nextParams = new URLSearchParams(searchParams as Record<string, string>)
              if (isActive) {
                nextParams.delete('tag')
              } else {
                nextParams.set('tag', t)
              }
              nextParams.delete('page')
              return (
                <Link
                  key={t}
                  href={`/?${nextParams.toString()}`}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  #{t}
                </Link>
              )
            })}
          </div>
        )}

        {/* Results */}
        <Suspense fallback={<PaperList papers={[]} loading />}>
          <ResultFilter papers={papers ?? []} />
        </Suspense>

        {/* Pagination */}
        <Suspense fallback={null}>
          <Pagination currentPage={page} totalPages={totalPages} />
        </Suspense>
      </div>
    </main>
  )
}
