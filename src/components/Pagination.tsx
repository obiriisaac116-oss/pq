'use client'

import * as React from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface PaginationProps {
  currentPage: number
  totalPages: number
}

/**
 * Returns an array of page numbers (and '…' gaps) to display.
 * Always shows at most 5 consecutive pages around the current page.
 */
function buildPages(current: number, total: number): (number | '…')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const delta = 2
  const left = Math.max(2, current - delta)
  const right = Math.min(total - 1, current + delta)

  const pages: (number | '…')[] = [1]

  if (left > 2) pages.push('…')
  for (let p = left; p <= right; p++) pages.push(p)
  if (right < total - 1) pages.push('…')
  pages.push(total)

  return pages
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (totalPages <= 1) return null

  function goTo(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    router.replace(`${pathname}?${params.toString()}`, { scroll: true })
  }

  const pages = buildPages(currentPage, totalPages)

  return (
    <nav
      aria-label="Pagination navigation"
      className="flex items-center justify-center gap-1 py-8"
    >
      {/* Previous */}
      <button
        type="button"
        onClick={() => goTo(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Go to previous page"
        className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1"
      >
        ← Prev
      </button>

      {/* Page numbers */}
      {pages.map((page, idx) =>
        page === '…' ? (
          <span
            key={`ellipsis-${idx}`}
            className="px-2 py-2 text-sm text-gray-400 select-none"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => goTo(page)}
            aria-current={page === currentPage ? 'page' : undefined}
            aria-label={`Go to page ${page}`}
            className={[
              'min-w-[2.25rem] rounded-md px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1',
              page === currentPage
                ? 'bg-brand-primary text-white cursor-default'
                : 'text-gray-700 hover:bg-gray-100',
            ].join(' ')}
          >
            {page}
          </button>
        ),
      )}

      {/* Next */}
      <button
        type="button"
        onClick={() => goTo(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Go to next page"
        className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1"
      >
        Next →
      </button>
    </nav>
  )
}
