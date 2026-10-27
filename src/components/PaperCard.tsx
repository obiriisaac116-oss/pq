import * as React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import type { PapersRow, CoursesRow } from '@/types/database'

export type PaperWithCoursePublic = PapersRow & { courses: CoursesRow | null }

interface PaperCardProps {
  paper: PaperWithCoursePublic
}

const semesterLabel: Record<string, string> = {
  first: 'First Semester',
  second: 'Second Semester',
  resit: 'Resit',
}

const semesterColor: Record<string, 'blue' | 'purple' | 'yellow'> = {
  first: 'blue',
  second: 'purple',
  resit: 'yellow',
}

function FileTypeIcon({ fileType }: { fileType: string }) {
  if (fileType === 'pdf') {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold tracking-wide bg-red-100 text-red-700">
        PDF
      </span>
    )
  }
  if (fileType === 'jpg' || fileType === 'jpeg') {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold tracking-wide bg-blue-100 text-blue-700">
        JPG
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold tracking-wide bg-green-100 text-green-700">
      PNG
    </span>
  )
}

export function PaperCard({ paper }: PaperCardProps) {
  const course = paper.courses
  const semester = paper.semester ?? 'first'
  const level = paper.level ?? ''

  return (
    <article className="group relative flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md">
      {/* Badges row */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={semesterColor[semester] ?? 'blue'}>
            {semesterLabel[semester] ?? semester}
          </Badge>
          {level && <Badge color="gray">Level {level}</Badge>}
          {paper.year && (
            <Badge color="green">{paper.year}</Badge>
          )}
        </div>
        {paper.file_type && (
          <FileTypeIcon fileType={paper.file_type} />
        )}
      </div>

      {/* Course code + name */}
      {course && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-primary">
          {course.code}
          {course.name && (
            <span className="ml-1 font-normal normal-case text-gray-500">
              — {course.name}
            </span>
          )}
        </p>
      )}

      {/* Title */}
      <h2 className="mb-3 flex-1 text-base font-semibold leading-snug text-gray-900">
        <Link
          href={`/papers/${paper.id}`}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 after:absolute after:inset-0 after:rounded-xl"
        >
          {paper.title}
        </Link>
      </h2>

      {/* Footer: downloads */}
      <div className="mt-auto flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <svg
            aria-hidden
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {paper.downloads} download{paper.downloads !== 1 ? 's' : ''}
        </span>
        <span className="pointer-events-none text-brand-primary font-medium">
          View →
        </span>
      </div>
    </article>
  )
}
