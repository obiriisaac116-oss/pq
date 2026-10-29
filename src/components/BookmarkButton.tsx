'use client'

import * as React from 'react'

interface BookmarkButtonProps {
  paperId: string
  className?: string
}

export function BookmarkButton({ paperId, className }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = React.useState(false)

  React.useEffect(() => {
    const stored: string[] = JSON.parse(
      localStorage.getItem('pq:bookmarks') ?? '[]',
    )
    setIsBookmarked(stored.includes(paperId))
  }, [paperId])

  function toggle() {
    const stored: string[] = JSON.parse(
      localStorage.getItem('pq:bookmarks') ?? '[]',
    )
    let updated: string[]
    if (isBookmarked) {
      updated = stored.filter((id) => id !== paperId)
    } else {
      updated = [paperId, ...stored.filter((id) => id !== paperId)]
    }
    localStorage.setItem('pq:bookmarks', JSON.stringify(updated))
    setIsBookmarked(!isBookmarked)
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle()
      }}
      aria-pressed={isBookmarked}
      aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this paper'}
      className={`rounded-full p-1.5 transition-colors ${
        isBookmarked
          ? 'text-amber-500'
          : 'text-gray-400 hover:text-amber-500'
      } ${className ?? ''}`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={isBookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  )
}
