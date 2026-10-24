'use client'

import * as React from 'react'
import { Button } from '@/components/ui/Button'

interface DownloadButtonProps {
  paperId: string
}

export function DownloadButton({ paperId }: DownloadButtonProps) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleDownload() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/papers/${paperId}/download`)
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        setError(body.error ?? 'Download failed. Please try again.')
        return
      }
      const { url } = (await res.json()) as { url: string }
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      setError('Download failed. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleDownload}
        loading={loading}
        disabled={loading}
        size="lg"
        aria-label="Download this past paper"
      >
        <svg
          aria-hidden
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {loading ? 'Preparing download…' : 'Download paper'}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
