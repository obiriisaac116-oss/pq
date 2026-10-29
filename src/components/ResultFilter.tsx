'use client'

import * as React from 'react'
import { PaperList } from '@/components/PaperList'
import type { PaperWithCoursePublic } from '@/components/PaperCard'

interface ResultFilterProps {
  papers: PaperWithCoursePublic[]
  minCount?: number
}

export function ResultFilter({ papers, minCount = 5 }: ResultFilterProps) {
  const [filterText, setFilterText] = React.useState('')

  if (papers.length <= minCount) {
    return <PaperList papers={papers} />
  }

  const filtered = filterText
    ? papers.filter((p) =>
        p.title.toLowerCase().includes(filterText.toLowerCase()),
      )
    : papers

  return (
    <div>
      <input
        type="text"
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        placeholder="Filter results by title…"
        aria-label="Filter results by title"
        className="mb-4 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
      />
      <PaperList papers={filtered} />
    </div>
  )
}
