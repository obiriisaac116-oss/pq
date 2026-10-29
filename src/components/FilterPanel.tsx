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
  programmes?: string[]
}

export function FilterPanel({ programmes = [] }: FilterPanelProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = React.useState(false)

  // Count active filters so we can show a badge on the toggle
  const activeCount = ['programme', 'level', 'year_from', 'year_to', 'semester'].filter(
    (k) => searchParams.get(k),
  ).length

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) { params.set(key, value) } else { params.delete(key) }
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const selectClass =
    'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary'

  const filters = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Filter past questions">
      <div>
        <label htmlFor="filter-programme" className="mb-1 block text-xs font-medium text-gray-600">Programme</label>
        <select id="filter-programme" value={searchParams.get('programme') ?? ''} onChange={(e) => updateParam('programme', e.target.value)} className={selectClass}>
          <option value="">All programmes</option>
          {programmes.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="filter-level" className="mb-1 block text-xs font-medium text-gray-600">Level</label>
        <select id="filter-level" value={searchParams.get('level') ?? ''} onChange={(e) => updateParam('level', e.target.value)} className={selectClass}>
          {LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Year</label>
        <div className="flex gap-1">
          <div className="flex-1">
            <label htmlFor="filter-year-from" className="mb-1 block text-xs text-gray-500">From</label>
            <select id="filter-year-from" value={searchParams.get('year_from') ?? ''} onChange={(e) => updateParam('year_from', e.target.value)} className={selectClass}>
              {YEAR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.value ? o.label : 'From'}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="filter-year-to" className="mb-1 block text-xs text-gray-500">To</label>
            <select id="filter-year-to" value={searchParams.get('year_to') ?? ''} onChange={(e) => updateParam('year_to', e.target.value)} className={selectClass}>
              {YEAR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.value ? o.label : 'To'}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="filter-semester" className="mb-1 block text-xs font-medium text-gray-600">Semester</label>
        <select id="filter-semester" value={searchParams.get('semester') ?? ''} onChange={(e) => updateParam('semester', e.target.value)} className={selectClass}>
          {SEMESTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  )

  return (
    <div>
      {/* Mobile toggle */}
      <button
        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm sm:hidden"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
          </svg>
          Filters
          {activeCount > 0 && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">
              {activeCount}
            </span>
          )}
        </span>
        <svg className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Always visible on sm+, toggle on mobile */}
      <div className={`${open ? 'block' : 'hidden'} sm:block mt-2 sm:mt-0`}>
        {filters}
      </div>
    </div>
  )
}
