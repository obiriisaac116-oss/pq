'use client'

import * as React from 'react'
import { RecentlyViewed } from '@/components/RecentlyViewed'
import type { PaperWithCoursePublic } from '@/components/PaperCard'

export default function RecentlyViewedWrapper() {
  const [papers, setPapers] = React.useState<PaperWithCoursePublic[]>([])

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const stored = JSON.parse(
          localStorage.getItem('pq:recentlyViewed') ?? '[]',
        ) as string[]
        const ids = stored.slice(0, 5)
        if (ids.length === 0) return

        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const res = await fetch(`/api/papers/${id}`)
              if (!res.ok) return null
              const body = (await res.json()) as { data?: PaperWithCoursePublic }
              return body.data ?? null
            } catch {
              return null
            }
          }),
        )

        if (!cancelled) {
          setPapers(results.filter((p): p is PaperWithCoursePublic => p !== null))
        }
      } catch {
        // localStorage unavailable or JSON malformed — skip silently.
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return <RecentlyViewed papers={papers} />
}
