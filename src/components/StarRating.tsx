'use client'

import * as React from 'react'

interface StarRatingProps {
  paperId: string
  initialAverage: number
  initialCount: number
}

export function StarRating({ paperId, initialAverage, initialCount }: StarRatingProps) {
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [userRating, setUserRating] = React.useState<number | null>(null)
  const [currentAvg, setCurrentAvg] = React.useState(initialAverage)
  const [currentCount, setCurrentCount] = React.useState(initialCount)
  const [hovered, setHovered] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    // Retrieve or create a session ID in localStorage
    let sid = localStorage.getItem('pq:sessionId')
    if (!sid) {
      sid = crypto.randomUUID()
      localStorage.setItem('pq:sessionId', sid)
    }
    setSessionId(sid)

    // Restore previously rated value for this paper
    const stored = localStorage.getItem(`pq:rating:${paperId}`)
    if (stored) {
      const n = parseInt(stored, 10)
      if (n >= 1 && n <= 5) setUserRating(n)
    }
  }, [paperId])

  async function handleRate(star: number) {
    if (!sessionId || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/papers/${paperId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: star, sessionId }),
      })
      if (res.ok) {
        const data = (await res.json()) as { averageRating: number; ratingCount: number }
        setCurrentAvg(data.averageRating)
        setCurrentCount(data.ratingCount)
        setUserRating(star)
        localStorage.setItem(`pq:rating:${paperId}`, String(star))
      }
    } finally {
      setLoading(false)
    }
  }

  const displayRating = hovered ?? userRating ?? 0

  return (
    <div className="mt-4">
      <p className="mb-1 text-xs font-medium text-gray-500">Rate this paper</p>
      <div className="flex items-center gap-0.5" role="group" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
            aria-pressed={userRating === star}
            disabled={loading}
            onClick={() => handleRate(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            className="rounded p-0.5 text-gray-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill={displayRating >= star ? '#f59e0b' : 'none'}
              stroke={displayRating >= star ? '#f59e0b' : '#d1d5db'}
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {currentCount > 0
          ? `${currentAvg.toFixed(1)} ★ (${currentCount} rating${currentCount !== 1 ? 's' : ''})`
          : 'No ratings yet'}
      </p>
    </div>
  )
}
