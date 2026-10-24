'use client'

import * as React from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const SEMESTER_OPTIONS = [
  { value: '', label: 'All semesters' },
  { value: 'first', label: 'First semester' },
  { value: 'second', label: 'Second semester' },
  { value: 'resit', label: 'Resit' },
]

const LEVEL_OPTIONS = [
  { value: '', label: 'All levels' },
  { value: '100', label: 'Level 100' },
  { value: '200', label: 'Level 200' },
  { value: '300', label: 'Level 300' },
  { value: '400', label: 'Level 400' },
  { value: '500', label: 'Level 500' },
]

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = [
  { value: '', label: 'All years' },
  ...Array.from({ length: currentYear - 1989 }, (_, i) => {
    const y = currentYear - i
    return { value: String(y), label: String(y) }
  }),
]

interface FilterPanelProps {
  /** List of distinct programmes fetched server-side */
  programmes?: string[]
}

export function FilterPanel({ programmes = [] }: FilterPanelProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // Reset pagination when filters change.
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const selectClass =
    'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary'

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      role="group"
      aria-label="Filter past questions"
    >
      {/* Programme */}
      <div>
        <label
          htmlFor="filter-programme"
          className="mb-1 block text-xs font-medium text-gray-600"
        >
          Programme
        </label>
        <select
          id="filter-programme"
          value={searchParams.get('programme') ?? ''}
          onChange={(e) => updateParam('programme', e.target.value)}
          className={selectClass}
        >
          <option value="">All programmes</option>
          {programmes.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Level */}
      <div>
        <label
          htmlFor="filter-level"
          className="mb-1 block text-xs font-medium text-gray-600"
        >
          Level
        </label>
        <select
          id="filter-level"
          value={searchParams.get('level') ?? ''}
          onChange={(e) => updateParam('level', e.target.value)}
          className={selectClass}
        >
          {LEVEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Year */}
      <div>
        <label
          htmlFor="filter-year"
          className="mb-1 block text-xs font-medium text-gray-600"
        >
          Year
        </label>
        <select
          id="filter-year"
          value={searchParams.get('year') ?? ''}
          onChange={(e) => updateParam('year', e.target.value)}
          className={selectClass}
        >
          {YEAR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Semester */}
      <div>
        <label
          htmlFor="filter-semester"
          className="mb-1 block text-xs font-medium text-gray-600"
        >
          Semester
        </label>
        <select
          id="filter-semester"
          value={searchParams.get('semester') ?? ''}
          onChange={(e) => updateParam('semester', e.target.value)}
          className={selectClass}
        >
          {SEMESTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
