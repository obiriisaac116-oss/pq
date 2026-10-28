import * as React from 'react'
import { PaperCard } from '@/components/PaperCard'
import type { PaperWithCoursePublic } from '@/components/PaperCard'

interface RecentlyViewedProps {
  papers: PaperWithCoursePublic[]
}

export function RecentlyViewed({ papers }: RecentlyViewedProps) {
  if (papers.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-base font-semibold text-gray-700">Recently viewed</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {papers.map((p) => (
          <PaperCard key={p.id} paper={p} />
        ))}
      </div>
    </section>
  )
}
