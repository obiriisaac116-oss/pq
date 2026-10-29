'use client'

import * as React from 'react'

const inputClass =
  'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary'
const labelClass = 'mb-1 block text-sm font-medium text-gray-700'

export default function RequestPage() {
  const [courseCode, setCourseCode] = React.useState('')
  const [year, setYear] = React.useState('')
  const [semester, setSemester] = React.useState('')
  const [level, setLevel] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode,
          year: parseInt(year, 10),
          semester,
          level,
          notes,
          email: email || undefined,
        }),
      })
      if (res.ok) {
        setSuccess(true)
      } else {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <svg aria-hidden width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h1 className="text-xl font-bold text-gray-900">Request submitted!</h1>
          <p className="mt-2 text-sm text-gray-600">Your request has been submitted! We&apos;ll do our best to add it soon.</p>
          <a href="/" className="mt-4 inline-block text-sm text-brand-primary hover:underline">← Back to papers</a>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Request a Paper</h1>
      <p className="mb-6 text-sm text-gray-600">Can&apos;t find the past paper you need? Fill in the details below and we&apos;ll try to add it.</p>

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <label htmlFor="req-course" className={labelClass}>Course code <span className="text-red-500">*</span></label>
          <input
            id="req-course"
            type="text"
            required
            placeholder="e.g. ENG 101"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="req-year" className={labelClass}>Year <span className="text-red-500">*</span></label>
          <input
            id="req-year"
            type="number"
            required
            min={1990}
            max={2030}
            placeholder="e.g. 2023"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="req-semester" className={labelClass}>Semester <span className="text-red-500">*</span></label>
          <select
            id="req-semester"
            required
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className={inputClass}
          >
            <option value="">Select semester…</option>
            <option value="first">First semester</option>
            <option value="second">Second semester</option>
            <option value="resit">Resit</option>
          </select>
        </div>

        <div>
          <label htmlFor="req-level" className={labelClass}>Level <span className="text-red-500">*</span></label>
          <select
            id="req-level"
            required
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className={inputClass}
          >
            <option value="">Select level…</option>
            <option value="100">Level 100</option>
            <option value="200">Level 200</option>
            <option value="300">Level 300</option>
            <option value="400">Level 400</option>
            <option value="500">Level 500</option>
          </select>
        </div>

        <div>
          <label htmlFor="req-email" className={labelClass}>Email <span className="text-gray-400 font-normal">(optional — for updates)</span></label>
          <input
            id="req-email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="req-notes" className={labelClass}>Notes <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea
            id="req-notes"
            rows={3}
            placeholder="Any additional details about the paper…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-60 transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
      </form>
    </main>
  )
}
