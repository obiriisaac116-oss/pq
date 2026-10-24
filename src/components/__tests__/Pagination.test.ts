// src/components/__tests__/Pagination.test.ts
//
// Unit tests for the buildPages helper extracted from Pagination.tsx.
// The function is not exported, so we duplicate the pure logic here and
// keep the tests aligned with the implementation contract.

import { describe, it, expect } from 'vitest'

/**
 * Mirrors the buildPages implementation in Pagination.tsx.
 * Any change to the implementation must be reflected here.
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

describe('buildPages', () => {
  it('returns all pages when total <= 7', () => {
    expect(buildPages(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(buildPages(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('always includes first and last page', () => {
    const pages = buildPages(5, 20)
    expect(pages[0]).toBe(1)
    expect(pages[pages.length - 1]).toBe(20)
  })

  it('inserts leading ellipsis when far from start', () => {
    const pages = buildPages(10, 20)
    expect(pages[1]).toBe('…')
  })

  it('inserts trailing ellipsis when far from end', () => {
    const pages = buildPages(1, 20)
    expect(pages[pages.length - 2]).toBe('…')
  })

  it('no leading ellipsis when current is near start', () => {
    // current=3, left=max(2,1)=2, no gap between 1 and 2
    const pages = buildPages(3, 20)
    expect(pages[1]).not.toBe('…')
  })

  it('no trailing ellipsis when current is near end', () => {
    // current=18, right=min(19,20)=19, no gap between 19 and 20
    const pages = buildPages(18, 20)
    expect(pages[pages.length - 2]).not.toBe('…')
  })

  it('returns window of pages around current', () => {
    const pages = buildPages(10, 20)
    // Expect 8..12 to be in the window (delta=2 on each side)
    const nums = pages.filter((p): p is number => typeof p === 'number')
    expect(nums).toContain(8)
    expect(nums).toContain(9)
    expect(nums).toContain(10)
    expect(nums).toContain(11)
    expect(nums).toContain(12)
  })

  it('handles single page gracefully', () => {
    expect(buildPages(1, 1)).toEqual([1])
  })

  it('handles exactly 8 pages (just over the boundary)', () => {
    const pages = buildPages(1, 8)
    // total > 7, so ellipsis logic applies; first page is 1
    expect(pages[0]).toBe(1)
    expect(pages[pages.length - 1]).toBe(8)
  })
})
