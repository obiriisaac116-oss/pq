import * as React from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { PapersRow, CoursesRow } from '@/types/database'

export type PaperWithCoursePublic = PapersRow & { courses: CoursesRow | null }

const BookmarkButton = dynamic(
  () => import('@/components/BookmarkButton').then((m) => ({ default: m.BookmarkButton })),
  { ssr: false },
)

interface PaperCardProps {
  paper: PaperWithCoursePublic
}

const semesterLabel: Record<string, string> = {
  first: '1st Sem',
  second: '2nd Sem',
  resit: 'Resit',
}

const semesterColor: Record<string, string> = {
  first: 'bg-blue-100 text-blue-700',
  second: 'bg-violet-100 text-violet-700',
  resit: 'bg-amber-100 text-amber-700',
}

const fileTypeBg: Record<string, string> = {
  pdf: 'bg-red-100 text-red-700',
  jpg: 'bg-sky-100 text-sky-700',
  jpeg: 'bg-sky-100 text-sky-700',
  png: 'bg-emerald-100 text-emerald-700',
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  )
}

export function PaperCard({ paper }: PaperCardProps) {
  const course = paper.courses
  const semester = paper.semester ?? 'first'
  const level = paper.level ?? ''
  const fileType = paper.file_type ?? 'pdf'

  return (
    <article className="group relative flex flex-col rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      {/* Top color bar based on semester */}
      <div className={`h-1 rounded-t-2xl w-full ${
        semester === 'resit' ? 'bg-amber-400' :
        semester === 'second' ? 'bg-violet-500' : 'bg-brand-primary'
      }`} />

      {/* Trending badge */}
      {(paper.downloads ?? 0) > 10 && (
        <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
          🔥 Trending
        </span>
      )}

      {/* Bookmark button */}
      <div className="absolute top-2 right-2 z-10">
        <BookmarkButton paperId={paper.id} />
      </div>

      <div className="flex flex-col flex-1 p-4">
        {/* Header: file type + year */}
        <div className="flex items-center justify-between mb-3">
          <Badge className={fileTypeBg[fileType] ?? fileTypeBg.pdf}>
            {fileType.toUpperCase()}
          </Badge>
          <div className="flex items-center gap-1.5">
            {paper.year && (
              <Badge className="bg-gray-100 text-gray-600">
                {paper.year}
              </Badge>
            )}
            {level && (
              <Badge className="bg-gray-100 text-gray-600">
                L{level}
              </Badge>
            )}
          </div>
        </div>

        {/* Course code */}
        {course && (
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand-primary truncate">
            {course.code}
            {course.programme && (
              <span className="ml-1 font-normal normal-case tracking-normal text-gray-400">
                · {course.programme}
              </span>
            )}
          </p>
        )}

        {/* Title */}
        <h2 className="flex-1 text-sm font-semibold leading-snug text-gray-900 mb-3 line-clamp-2">
          <Link
            href={`/papers/${paper.id}`}
            prefetch={true}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 after:absolute after:inset-0 after:rounded-2xl"
          >
            {paper.title}
          </Link>
        </h2>

        {/* Semester badge */}
        <div className="mb-4">
          <Badge className={semesterColor[semester] ?? semesterColor.first}>
            {semesterLabel[semester] ?? semester}
          </Badge>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {paper.downloads}
          </span>
          <span className="relative z-10 inline-flex items-center gap-1 rounded-full bg-brand-primary px-3 py-1 text-xs font-semibold text-white group-hover:bg-brand-primary/90 transition-colors">
            View
            <svg aria-hidden width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>

      {/* Hover tooltip (desktop only) */}
      <div
        role="tooltip"
        className="pointer-events-none absolute inset-x-0 top-full z-20 mt-1 hidden rounded-lg bg-white px-3 py-2 shadow-lg ring-1 ring-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-150 md:block"
      >
        <p className="text-xs font-semibold text-gray-800">{course?.name ?? ''}</p>
        <p className="text-xs text-gray-500">{course?.programme ?? ''}</p>
      </div>
    </article>
  )
}
