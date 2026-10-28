'use client'

import * as React from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { CoursesRow } from '@/types/database'

export function SearchBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = React.useState(searchParams.get('q') ?? '')
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [suggestions, setSuggestions] = React.useState<CoursesRow[]>([])
  const [showDropdown, setShowDropdown] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Search history state
  const [searchHistory, setSearchHistory] = React.useState<string[]>([])
  const [isFocused, setIsFocused] = React.useState(false)

  // Keep local value in sync when URL changes externally (e.g. filter panel
  // clears the search param).
  React.useEffect(() => {
    setValue(searchParams.get('q') ?? '')
  }, [searchParams])

  // Load search history from localStorage on mount.
  React.useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('pq:searchHistory') ?? '[]')
      if (Array.isArray(stored)) setSearchHistory(stored)
    } catch {
      // ignore malformed data
    }
  }, [])

  // Keyboard shortcut: '/' focuses the search input.
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Close dropdown on click outside.
  React.useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  function updateUrl(nextValue: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextValue) {
      params.set('q', nextValue)
    } else {
      params.delete('q')
    }
    // Reset to page 1 on new search.
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function saveToHistory(term: string) {
    if (!term.trim()) return
    setSearchHistory((prev) => {
      const next = [term, ...prev.filter((h) => h !== term)].slice(0, 5)
      try {
        localStorage.setItem('pq:searchHistory', JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }

  function removeFromHistory(index: number) {
    setSearchHistory((prev) => {
      const next = prev.filter((_, j) => j !== index)
      try {
        localStorage.setItem('pq:searchHistory', JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }

  async function fetchSuggestions(term: string) {
    if (term.length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    try {
      const res = await fetch(`/api/courses?q=${encodeURIComponent(term)}`)
      if (!res.ok) return
      const data: CoursesRow[] = await res.json()
      const first6 = data.slice(0, 6)
      setSuggestions(first6)
      setShowDropdown(first6.length > 0)
    } catch {
      // silently ignore network errors in autocomplete
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setValue(next)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateUrl(next)
      fetchSuggestions(next)
      if (next.trim()) saveToHistory(next.trim())
    }, 300)
  }

  function handleClear() {
    setValue('')
    setSuggestions([])
    setShowDropdown(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    updateUrl('')
  }

  // Clean up on unmount.
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const showHistory = isFocused && value === '' && searchHistory.length > 0

  return (
    <div ref={wrapperRef} role="search" className="relative w-full">
      <label htmlFor="search-input" className="sr-only">
        Search past questions
      </label>

      {/* Search icon */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>

      <input
        ref={inputRef}
        id="search-input"
        type="search"
        role="searchbox"
        aria-label="Search past questions"
        aria-autocomplete="list"
        aria-controls={showDropdown ? 'search-suggestions' : undefined}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          // Small delay so chip clicks can fire before focus is lost
          setTimeout(() => setIsFocused(false), 150)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setShowDropdown(false)
            setIsFocused(false)
          }
        }}
        placeholder="Search by title, year, or course…"
        className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
      />

      {/* '/' keyboard shortcut hint — desktop only, hidden when input has value */}
      {!value && (
        <kbd
          aria-hidden
          className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-mono text-gray-400 select-none"
        >
          /
        </kbd>
      )}

      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {/* Search history chips — shown when focused with empty input */}
      {showHistory && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
          <p className="text-xs text-gray-400 mb-1.5 px-1">Recent searches</p>
          <div className="flex flex-wrap gap-1.5">
            {searchHistory.map((h, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
              >
                <button
                  onMouseDown={() => {
                    setValue(h)
                    updateUrl(h)
                    setShowDropdown(false)
                    setIsFocused(false)
                  }}
                  className="hover:text-brand-primary"
                >
                  {h}
                </button>
                <button
                  onMouseDown={() => removeFromHistory(i)}
                  aria-label={`Remove "${h}" from history`}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Autocomplete dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-48 overflow-auto"
        >
          {suggestions.map((c) => (
            <li
              key={c.id}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault()
                setValue(c.code)
                updateUrl(c.code)
                setShowDropdown(false)
              }}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-gray-50"
            >
              <span className="font-medium">{c.code}</span>{' '}
              <span className="text-gray-500">— {c.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
