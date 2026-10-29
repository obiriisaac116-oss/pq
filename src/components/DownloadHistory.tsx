'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { PaperList } from '@/components/PaperList'
import type { PaperWithCoursePublic } from '@/components/PaperCard'

export function DownloadHistory() {
  const [papers, setPapers] = React.useState<PaperWithCoursePublic[] | null>(null)

  React.useEffect(() => {
    const raw = localStorage.getItem('pq:downloadHistory')
    if (!raw) return
    let ids: string[]
    try {
      ids = JSON.parse(raw) as string[]
    } catch {
      return
    }
    if (!ids.length) return

    const supabase = createClient()
    supabase
      .from('papers')
      .select('*, courses(*)')
      .in('id', ids)
      .eq('status', 'published')
      .then(({ data }) => {
        if (data && data.length > 0) {
          // Re-order to match localStorage order
          const ordered = ids
            .map((id) => data.find((p) => p.id === id))
            .filter((p): p is PaperWithCoursePublic => Boolean(p))
          setPapers(ordered)
        }
      })
  }, [])

  if (!papers || papers.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-base font-semibold text-gray-900">Your downloads</h2>
      <PaperList papers={papers} />
    </section>
  )
}
