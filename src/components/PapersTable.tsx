'use client'

// src/components/PapersTable.tsx
//
// Interactive papers management table for the admin area.
// Handles publish/unpublish, and delete via the API routes.
// Filters client-side over the initial server-fetched list.

import { useState } from 'react'

import type { PaperWithCourse } from '@/app/(admin)/admin/papers/page'

type Props = {
  initialPapers: PaperWithCourse[]
}

const SEMESTERS = ['', 'first', 'second', 'resit'] as const
const STATUSES = ['', 'published', 'draft'] as const

export function PapersTable({ initialPapers }: Props) {
  const [papers, setPapers] = useState<PaperWithCourse[]>(initialPapers)
  const [filterTitle, setFilterTitle] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSemester, setFilterSemester] = useState('')
  const [busy, setBusy] = useState<string | null>(null) // paper id currently acted on

  const filtered = papers.filter((p) => {
    if (filterTitle && !p.title.toLowerCase().includes(filterTitle.toLowerCase()))
      return false
    if (filterStatus && p.status !== filterStatus) return false
    if (filterSemester && p.semester !== filterSemester) return false
    return true
  })

  async function toggleStatus(paper: PaperWithCourse) {
    const newStatus = paper.status === 'published' ? 'draft' : 'published'
    setBusy(paper.id)
    try {
      const res = await fetch(`/api/papers/${paper.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Update failed')
      setPapers((prev) =>
        prev.map((p) => (p.id === paper.id ? { ...p, status: newStatus } : p)),
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(null)
    }
  }

  async function deletePaper(paper: PaperWithCourse) {
    if (
      !window.confirm(
        `Delete "${paper.title}"? This cannot be undone and will also remove the stored file.`,
      )
    )
      return

    setBusy(paper.id)
    try {
      const res = await fetch(`/api/papers/${paper.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('Delete failed')
      setPapers((prev) => prev.filter((p) => p.id !== paper.id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Filter by title…"
          aria-label="Filter by title"
          value={filterTitle}
          onChange={(e) => setFilterTitle(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
        <select
          aria-label="Filter by status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All statuses'}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by semester"
          value={filterSemester}
          onChange={(e) => setFilterSemester(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        >
          {SEMESTERS.map((s) => (
            <option key={s} value={s}>
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All semesters'}
            </option>
          ))}
        </select>
        <span className="self-center text-sm text-gray-500">
          {filtered.length} of {papers.length} paper
          {papers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Semester</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Downloads</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  No papers match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((paper) => (
                <tr
                  key={paper.id}
                  className="hover:bg-gray-50"
                  aria-busy={busy === paper.id}
                >
                  <td className="max-w-xs px-4 py-3">
                    <span
                      className="block truncate font-medium text-gray-900"
                      title={paper.title}
                    >
                      {paper.title}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {paper.courses?.code ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {paper.year ?? '—'}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">
                    {paper.semester ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {paper.level ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        paper.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700',
                      ].join(' ')}
                    >
                      {paper.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {paper.downloads}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleStatus(paper)}
                        disabled={busy === paper.id}
                        className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {busy === paper.id
                          ? '…'
                          : paper.status === 'published'
                            ? 'Unpublish'
                            : 'Publish'}
                      </button>
                      <a
                        href={`/admin/upload?edit=${paper.id}`}
                        className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </a>
                      <button
                        onClick={() => deletePaper(paper)}
                        disabled={busy === paper.id}
                        className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
