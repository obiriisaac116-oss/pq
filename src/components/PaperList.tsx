import * as React from 'react'
import { PaperCard } from '@/components/PaperCard'
import type { PaperWithCoursePublic } from '@/components/PaperCard'

interface PaperListProps {
  papers: PaperWithCoursePublic[]
  loading?: boolean
}

/** Pulsing skeleton card used while results are loading. */
function SkeletonCard() {
  return (
    <div
      aria-hidden
      className="animate-pulse rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* Top color bar */}
      <div className="h-1 rounded-t-2xl w-full bg-gray-200" />
      <div className="p-4">
        {/* Badge row */}
        <div className="mb-3 flex items-center justify-between">
          <div className="h-5 w-16 rounded-full bg-gray-200" />
          <div className="h-5 w-12 rounded-full bg-gray-200" />
        </div>
        {/* Course code */}
        <div className="mb-2 h-3 w-1/4 rounded bg-gray-200" />
        {/* Title lines */}
        <div className="mb-1 h-4 w-full rounded bg-gray-200" />
        <div className="mb-4 h-4 w-3/4 rounded bg-gray-200" />
        {/* Semester badge */}
        <div className="mb-4 h-5 w-16 rounded-full bg-gray-200" />
        {/* Footer row */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-8 rounded bg-gray-200" />
          <div className="h-7 w-16 rounded-full bg-gray-200" />
        </div>
      </div>
    </div>
  )
}

export function PaperList({ papers, loading = false }: PaperListProps) {
  if (loading) {
    return (
      <section aria-label="Loading papers" aria-busy>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    )
  }

  if (papers.length === 0) {
    return (
      <section
        aria-label="No papers found"
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <svg
          aria-hidden
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1d4ed8"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-4"
        >
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          <circle cx="18.5" cy="4.5" r="1.5" />
          <line x1="19.5" y1="5.5" x2="21" y2="7" />
        </svg>
        <p className="text-lg font-semibold text-gray-700">No papers found.</p>
        <p className="mt-1 text-sm text-gray-500">
          Try adjusting your search or filters.
        </p>
      </section>
    )
  }

  return (
    <section aria-label="Papers">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {papers.map((paper) => (
          <PaperCard key={paper.id} paper={paper} />
        ))}
      </div>
    </section>
  )
}
