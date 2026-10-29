'use client'

import * as React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PaperList } from '@/components/PaperList'
import type { PaperWithCoursePublic } from '@/components/PaperCard'

export default function BookmarksPage() {
  const [papers, setPapers] = React.useState<PaperWithCoursePublic[] | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const raw = localStorage.getItem('pq:bookmarks')
    if (!raw) {
      setLoading(false)
      return
    }
    let ids: string[]
    try {
      ids = JSON.parse(raw) as string[]
    } catch {
      setLoading(false)
      return
    }
    if (!ids.length) {
      setLoading(false)
      return
    }

    const supabase = createClient()
    supabase
      .from('papers')
      .select('*, courses(*)')
      .in('id', ids)
      .eq('status', 'published')
      .then(({ data }) => {
        if (data) {
          const ordered = ids
            .map((id) => data.find((p) => p.id === id))
            .filter((p): p is PaperWithCoursePublic => Boolean(p))
          setPapers(ordered)
        }
        setLoading(false)
      })
  }, [])

  const isEmpty = !loading && (!papers || papers.length === 0)

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Saved Papers</h1>

      {loading && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      )}

      {isEmpty && (
        <>
          <p className="mt-4 text-gray-500">
            No saved papers yet. Browse papers and click the bookmark icon to save them here.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-brand-primary hover:underline"
          >
            Browse papers →
          </Link>
        </>
      )}

      {papers && papers.length > 0 && (
        <div className="mt-4">
          <PaperList papers={papers} />
        </div>
      )}
    </main>
  )
}
