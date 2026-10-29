'use client'

// src/app/(admin)/admin/import/page.tsx
//
// Bulk CSV import for papers. Accepts a CSV file, previews rows,
// then POSTs valid rows to /api/admin/import.

import { useState, useRef } from 'react'
import { AdminNav } from '@/components/AdminNav'

type ParsedRow = {
  title: string
  course_code: string
  year: number
  semester: string
  level: string
}

type RowResult = {
  row: number
  data: ParsedRow | null
  error: string | null
}

type ImportResult = {
  inserted: number
  errors: { row: number; reason: string }[]
}

const VALID_SEMESTERS = ['first', 'second', 'resit']
const VALID_LEVELS = ['100', '200', '300', '400', '500']

function parseCSV(text: string): RowResult[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  // Skip header row
  const dataLines = lines.slice(1)

  return dataLines.map((line, idx) => {
    const parts = line.split(',').map((p) => p.trim())
    const [title, course_code, yearStr, semester, level] = parts

    if (!title) {
      return { row: idx + 2, data: null, error: 'Title is required' }
    }
    const year = Number(yearStr)
    if (!yearStr || isNaN(year) || year < 1990 || year > 2030) {
      return { row: idx + 2, data: null, error: `Invalid year: ${yearStr}` }
    }
    if (!VALID_SEMESTERS.includes(semester?.toLowerCase())) {
      return { row: idx + 2, data: null, error: `Invalid semester: ${semester}` }
    }
    if (!VALID_LEVELS.includes(level)) {
      return { row: idx + 2, data: null, error: `Invalid level: ${level}` }
    }

    return {
      row: idx + 2,
      data: { title, course_code, year, semester: semester.toLowerCase(), level },
      error: null,
    }
  })
}

export default function ImportPage() {
  const [rows, setRows] = useState<RowResult[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setResult(null)
    setParseError(null)
    setRows([])
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const parsed = parseCSV(text)
        setRows(parsed)
      } catch {
        setParseError('Failed to read file. Make sure it is a valid CSV.')
      }
    }
    reader.readAsText(file)
  }

  const validRows = rows.filter((r) => r.data !== null).map((r) => r.data!)
  const invalidRows = rows.filter((r) => r.error !== null)

  async function handleImport() {
    if (validRows.length === 0) return
    setImporting(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows }),
      })
      const data = (await res.json()) as ImportResult
      setResult(data)
      // Clear file input
      if (fileRef.current) fileRef.current.value = ''
      setRows([])
    } catch {
      setResult({ inserted: 0, errors: [{ row: 0, reason: 'Network error. Please try again.' }] })
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-2 text-xl font-bold text-gray-900">Bulk Import Papers</h1>
        <p className="mb-6 text-sm text-gray-500">
          Upload a CSV file with columns: <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">title, course_code, year, semester, level</code>.
          The header row is required and will be skipped.
        </p>

        {/* File input */}
        <div className="mb-6">
          <label htmlFor="csv-file" className="mb-1 block text-sm font-medium text-gray-700">
            CSV file
          </label>
          <input
            ref={fileRef}
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
          />
        </div>

        {parseError && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{parseError}</div>
        )}

        {/* Preview table */}
        {rows.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-gray-700">
              Preview: {validRows.length} valid row{validRows.length !== 1 ? 's' : ''},{' '}
              {invalidRows.length} invalid
            </p>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Course</th>
                    <th className="px-3 py-2">Year</th>
                    <th className="px-3 py-2">Semester</th>
                    <th className="px-3 py-2">Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <tr key={r.row} className={r.error ? 'bg-red-50' : ''}>
                      <td className="px-3 py-2 text-gray-500">{r.row}</td>
                      <td className="px-3 py-2">
                        {r.error ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            Invalid
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Valid
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-900">{r.data?.title ?? <span className="text-red-500 text-xs">{r.error}</span>}</td>
                      <td className="px-3 py-2 text-gray-600">{r.data?.course_code ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-600">{r.data?.year ?? '—'}</td>
                      <td className="px-3 py-2 capitalize text-gray-600">{r.data?.semester ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-600">{r.data?.level ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Import button */}
        {rows.length > 0 && (
          <button
            onClick={handleImport}
            disabled={importing || validRows.length === 0}
            className="rounded-md bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importing ? 'Importing…' : `Import ${validRows.length} paper${validRows.length !== 1 ? 's' : ''}`}
          </button>
        )}

        {/* Import result */}
        {result && (
          <div className={`mt-4 rounded-md p-4 text-sm ${result.inserted > 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
            <p className="font-medium">
              {result.inserted} paper{result.inserted !== 1 ? 's' : ''} imported successfully.{' '}
              {result.errors.length > 0 && `${result.errors.length} row${result.errors.length !== 1 ? 's' : ''} failed.`}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {result.errors.map((e, i) => (
                  <li key={i}>Row {e.row}: {e.reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </>
  )
}
