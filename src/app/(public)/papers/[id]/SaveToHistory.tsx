'use client'

import * as React from 'react'

interface SaveToHistoryProps {
  paperId: string
}

export function SaveToHistory({ paperId }: SaveToHistoryProps) {
  React.useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('pq:recentlyViewed') ?? '[]') as string[]
      const updated = [paperId, ...stored.filter((id) => id !== paperId)].slice(0, 5)
      localStorage.setItem('pq:recentlyViewed', JSON.stringify(updated))
    } catch {
      // localStorage may be unavailable in some contexts; ignore silently.
    }
  }, [paperId])

  return null
}
