import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { DownloadButton } from './DownloadButton'
import type { PapersRow, CoursesRow } from '@/types/database'

type PaperWithCourse = PapersRow & { courses: CoursesRow | null }

interface PaperPageProps {
  params: { id: string }
}

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: PaperPageProps): Promise<Metadata> {
  const supabase = await createClient()
  const { data: paper } = await supabase
    .from('papers')
    .select('title, courses(code, name)')
    .eq('id', params.id)
    .eq('status', 'published')
    .maybeSingle()

  if (!paper) {
    return { title: 'Paper Not Found | Past Questions' }
  }

  const course = Array.isArray(paper.courses) ? paper.courses[0] : paper.courses
  const courseLabel = course ? `${course.code} — ` : ''

  return {
    title: `${courseLabel}${paper.title} | Past Questions`,
    description: `Download the ${paper.title} past examination paper.`,
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function PaperPage({ params }: PaperPageProps) {
  const supabase = await createClient()

  const { data: paper, error } = await supabase
    .from('papers')
    .select('*, courses(*)')
    .eq('id', params.id)
    .eq('status', 'published')
    .maybeSingle()

  if (error || !paper) {
    notFound()
  }

  const typedPaper = paper as unknown as PaperWithCourse
  const course = typedPaper.courses
  const semesterLabel: Record<string, string> = {
    first: 'First Semester',
    second: 'Second Semester',
    resit: 'Resit',
  }
  const semesterText = typedPaper.semester
    ? (semesterLabel[typedPaper.semester] ?? typedPaper.semester)
    : '—'

  const uploadedDate = typedPaper.created_at
    ? new Date(typedPaper.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-brand-primary hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden className="select-none">
            /
          </li>
          {course && (
            <>
              <li>
                <Link
                  href={`/?course_code=${encodeURIComponent(course.code)}`}
                  className="hover:text-brand-primary hover:underline"
                >
                  {course.code}
                </Link>
              </li>
              <li aria-hidden className="select-none">
                /
              </li>
            </>
          )}
          <li
            aria-current="page"
            className="max-w-[200px] truncate font-medium text-gray-800"
          >
            {typedPaper.title}
          </li>
        </ol>
      </nav>

      {/* Paper card */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        {/* Title */}
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          {typedPaper.title}
        </h1>

        {/* Meta grid */}
        <dl className="mb-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          {course && (
            <div>
              <dt className="font-medium text-gray-500">Course</dt>
              <dd className="mt-0.5 text-gray-900">
                {course.code} — {course.name}
              </dd>
            </div>
          )}

          {typedPaper.year && (
            <div>
              <dt className="font-medium text-gray-500">Year</dt>
              <dd className="mt-0.5 text-gray-900">{typedPaper.year}</dd>
            </div>
          )}

          <div>
            <dt className="font-medium text-gray-500">Semester</dt>
            <dd className="mt-0.5">
              <Badge color="blue">{semesterText}</Badge>
            </dd>
          </div>

          {typedPaper.level && (
            <div>
              <dt className="font-medium text-gray-500">Level</dt>
              <dd className="mt-0.5">
                <Badge color="gray">Level {typedPaper.level}</Badge>
              </dd>
            </div>
          )}

          <div>
            <dt className="font-medium text-gray-500">Downloads</dt>
            <dd className="mt-0.5 text-gray-900">{typedPaper.downloads}</dd>
          </div>

          {uploadedDate && (
            <div>
              <dt className="font-medium text-gray-500">Uploaded</dt>
              <dd className="mt-0.5 text-gray-900">
                <time dateTime={typedPaper.created_at}>{uploadedDate}</time>
              </dd>
            </div>
          )}
        </dl>

        {/* Download */}
        <DownloadButton paperId={typedPaper.id} />
      </div>
    </main>
  )
}
