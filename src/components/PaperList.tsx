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
      className="animate-pulse rounded-xl bg-white p-5 ring-1 ring-gray-200"
    >
      <div className="mb-3 flex gap-2">
        <div className="h-5 w-20 rounded-full bg-gray-200" />
        <div className="h-5 w-14 rounded-full bg-gray-200" />
      </div>
      <div className="mb-2 h-3 w-1/3 rounded bg-gray-200" />
      <div className="mb-1 h-4 w-full rounded bg-gray-200" />
      <div className="h-4 w-3/4 rounded bg-gray-200" />
      <div className="mt-4 h-3 w-1/4 rounded bg-gray-200" />
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
          width="56"
          height="56"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-4 text-gray-300"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
