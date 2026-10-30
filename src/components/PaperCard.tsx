import * as React from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { PapersRow, CoursesRow } from '@/types/database'

export type PaperWithCoursePublic = PapersRow & { courses: CoursesRow | null }

const BookmarkButton = dynamic(
  () => import('@/components/BookmarkButton').then((m) => ({ default: m.BookmarkButton })),
  { ssr: false, loading: () => <div className="w-8 h-8" /> },
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
  first: 'bg-blue-50 text-blue-600 border border-blue-100',
  second: 'bg-violet-50 text-violet-600 border border-violet-100',
  resit: 'bg-amber-50 text-amber-600 border border-amber-100',
}

const accentBar: Record<string, string> = {
  first: 'bg-blue-500',
  second: 'bg-violet-500',
  resit: 'bg-amber-500',
}

const fileTypeBg: Record<string, string> = {
  pdf: 'bg-red-50 text-red-600 border border-red-100',
  jpg: 'bg-sky-50 text-sky-600 border border-sky-100',
  jpeg: 'bg-sky-50 text-sky-600 border border-sky-100',
  png: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
}

export function PaperCard({ paper }: PaperCardProps) {
  const course = paper.courses
  const semester = paper.semester ?? 'first'
  const level = paper.level ?? ''
  const fileType = paper.file_type ?? 'pdf'
  const isTrending = (paper.downloads ?? 0) > 10

  return (
    <article className="group relative flex flex-col rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200">
      {/* Accent bar */}
      <div className={`h-[3px] rounded-t-2xl w-full ${accentBar[semester] ?? accentBar.first}`} />

      {/* Bookmark — top right, small, subtle */}
      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <BookmarkButton paperId={paper.id} />
      </div>

      <div className="flex flex-col flex-1 p-4 pt-3">
        {/* Top row: file type + year + level */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider ${fileTypeBg[fileType] ?? fileTypeBg.pdf}`}>
            {fileType.toUpperCase()}
          </span>
          {isTrending && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 border border-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
              🔥 Hot
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            {paper.year && (
              <span className="text-xs text-gray-400 font-medium">{paper.year}</span>
            )}
            {level && (
              <span className="text-xs text-gray-400 font-medium">· L{level}</span>
            )}
          </div>
        </div>

        {/* Course code + programme */}
        {course && (
          <div className="mb-1.5">
            <span className="text-xs font-bold text-brand-primary">{course.code}</span>
            {course.programme && (
              <span className="text-xs text-gray-400 ml-1.5">· {course.programme}</span>
            )}
          </div>
        )}

        {/* Title — main content, generous size */}
        <h2 className="flex-1 text-[15px] font-semibold leading-snug text-gray-800 mb-3 line-clamp-2 min-h-[2.5rem]">
          <Link
            href={`/papers/${paper.id}`}
            prefetch={true}
            className="hover:text-brand-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 after:absolute after:inset-0 after:rounded-2xl"
          >
            {paper.title}
          </Link>
        </h2>

        {/* Tags */}
        {paper.tags && paper.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {paper.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-gray-50 border border-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer: semester + downloads + view button */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-50">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${semesterColor[semester] ?? semesterColor.first}`}>
            {semesterLabel[semester] ?? semester}
          </span>
          <div className="flex items-center gap-3">
            {(paper.downloads ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <svg aria-hidden width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {paper.downloads}
              </span>
            )}
            <span className="relative z-10 inline-flex items-center gap-1 rounded-full bg-brand-primary px-3.5 py-1.5 text-xs font-semibold text-white group-hover:bg-blue-700 transition-colors">
              View
              <svg aria-hidden width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}
