'use client'

// src/components/PapersTable.tsx
//
// Interactive papers management table for the admin area.
// Handles bulk actions, inline status toggle, quick preview, publish/unpublish,
// and delete via the API routes.
// Filters client-side over the initial server-fetched list.

import { useState } from 'react'

import type { PaperWithCourse } from '@/app/(admin)/admin/papers/page'
import { useToast } from '@/components/ToastContext'

type Props = {
  initialPapers: PaperWithCourse[]
}

const SEMESTERS = ['', 'first', 'second', 'resit'] as const
const STATUSES = ['', 'published', 'draft'] as const

export function PapersTable({ initialPapers }: Props) {
  const toast = useToast()
  const [papers, setPapers] = useState<PaperWithCourse[]>(initialPapers)
  const [filterTitle, setFilterTitle] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSemester, setFilterSemester] = useState('')
  const [busy, setBusy] = useState<string | null>(null) // paper id currently acted on

  // Bulk actions state
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  // Preview modal state
  const [previewPaperId, setPreviewPaperId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewFileType, setPreviewFileType] = useState<string>('pdf')
  const [previewTitle, setPreviewTitle] = useState<string>('')

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
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(null)
    }
  }

  async function deletePaper(paper: PaperWithCourse) {
    if (
      !await toast.confirm(
        `Delete "${paper.title}"? This cannot be undone and will also remove the stored file.`,
      )
    )
      return

    setBusy(paper.id)
    try {
      const res = await fetch(`/api/papers/${paper.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('Delete failed')
      setPapers((prev) => prev.filter((p) => p.id !== paper.id))
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(paper.id)
        return next
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(null)
    }
  }

  async function bulkAction(status: 'published' | 'draft') {
    setBulkBusy(true)
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/papers/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          }),
        ),
      )
      setPapers((prev) =>
        prev.map((p) => (selected.has(p.id) ? { ...p, status } : p)),
      )
      setSelected(new Set())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk action failed')
    } finally {
      setBulkBusy(false)
    }
  }

  async function bulkDelete() {
    if (
      !await toast.confirm(
        `Delete ${selected.size} selected paper${selected.size !== 1 ? 's' : ''}? This cannot be undone.`,
      )
    )
      return

    setBulkBusy(true)
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/papers/${id}`, { method: 'DELETE' }),
        ),
      )
      setPapers((prev) => prev.filter((p) => !selected.has(p.id)))
      setSelected(new Set())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk delete failed')
    } finally {
      setBulkBusy(false)
    }
  }

  async function openPreview(paper: PaperWithCourse) {
    setPreviewPaperId(paper.id)
    setPreviewTitle(paper.title)
    setPreviewUrl(null)
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/papers/${paper.id}/download`)
      if (res.ok) {
        const { url } = await res.json()
        setPreviewUrl(url)
        setPreviewFileType(paper.file_type ?? 'pdf')
      }
    } catch {
      // silently ignore — modal will show loading state
    } finally {
      setPreviewLoading(false)
    }
  }

  function closePreview() {
    setPreviewPaperId(null)
    setPreviewUrl(null)
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

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-brand-primary/5 border border-brand-primary/20 px-4 py-2.5 text-sm">
          <span className="font-medium text-gray-700">{selected.size} selected</span>
          <button
            onClick={() => bulkAction('published')}
            disabled={bulkBusy}
            className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-white disabled:opacity-50"
          >
            Publish all
          </button>
          <button
            onClick={() => bulkAction('draft')}
            disabled={bulkBusy}
            className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-white disabled:opacity-50"
          >
            Unpublish all
          </button>
          <button
            onClick={bulkDelete}
            disabled={bulkBusy}
            className="rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Delete all
          </button>
          <button
            onClick={() => setSelected(new Set())}
            disabled={bulkBusy}
            className="ml-auto rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500 hover:bg-white disabled:opacity-50"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-gray-400">No papers match the current filters.</p>
        ) : (
          filtered.map((paper) => (
            <div key={paper.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-2 mb-2">
                <input
                  type="checkbox"
                  aria-label={`Select ${paper.title}`}
                  checked={selected.has(paper.id)}
                  onChange={(e) => {
                    setSelected((prev) => {
                      const next = new Set(prev)
                      if (e.target.checked) next.add(paper.id)
                      else next.delete(paper.id)
                      return next
                    })
                  }}
                  className="mt-0.5 shrink-0"
                />
                <p className="flex-1 font-medium text-gray-900 text-sm leading-snug">{paper.title}</p>
                <button
                  onClick={() => toggleStatus(paper)}
                  disabled={busy === paper.id}
                  title="Click to toggle status"
                  className={[
                    'shrink-0 cursor-pointer inline-flex rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
                    paper.status === 'published'
                      ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                      : 'bg-yellow-100 text-yellow-700 hover:bg-green-100 hover:text-green-700',
                    'disabled:opacity-50',
                  ].join(' ')}
                >
                  {busy === paper.id ? '…' : paper.status}
                </button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                <span>{paper.courses?.code ?? '—'}</span>
                <span>{paper.year ?? '—'}</span>
                <span className="capitalize">{paper.semester ?? '—'}</span>
                <span>Level {paper.level ?? '—'}</span>
                <span>{paper.downloads} downloads</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openPreview(paper)}
                  className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Preview
                </button>
                <a
                  href={`/admin/upload?edit=${paper.id}`}
                  className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 text-center"
                >
                  Edit
                </a>
                <button
                  onClick={() => deletePaper(paper)}
                  disabled={busy === paper.id}
                  className="flex-1 rounded border border-red-300 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={filtered.length > 0 && filtered.every((p) => selected.has(p.id))}
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(filtered.map((p) => p.id)))
                    else setSelected(new Set())
                  }}
                />
              </th>
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
                  colSpan={9}
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
                  <td className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      aria-label={`Select ${paper.title}`}
                      checked={selected.has(paper.id)}
                      onChange={(e) => {
                        setSelected((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(paper.id)
                          else next.delete(paper.id)
                          return next
                        })
                      }}
                    />
                  </td>
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
                    <button
                      onClick={() => toggleStatus(paper)}
                      disabled={busy === paper.id}
                      title="Click to toggle status"
                      className={[
                        'cursor-pointer inline-flex rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
                        paper.status === 'published'
                          ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                          : 'bg-yellow-100 text-yellow-700 hover:bg-green-100 hover:text-green-700',
                        'disabled:opacity-50',
                      ].join(' ')}
                    >
                      {busy === paper.id ? '…' : paper.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {paper.downloads}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openPreview(paper)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Preview
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

      {/* Quick preview modal */}
      {previewPaperId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={closePreview}
          role="dialog"
          aria-modal="true"
          aria-label="Paper preview"
        >
          <div
            className="max-w-3xl w-full mx-4 rounded-xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-900 truncate pr-4">{previewTitle}</p>
              <button
                onClick={closePreview}
                aria-label="Close preview"
                className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {/* Modal content */}
            <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
              {previewLoading ? (
                <span
                  aria-label="Loading preview"
                  className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary"
                />
              ) : previewUrl ? (
                previewFileType === 'pdf' ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[70vh] border-0"
                    title="Paper preview"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    className="w-full object-contain max-h-[70vh]"
                    alt="Preview"
                  />
                )
              ) : (
                <p className="text-sm text-gray-400">Preview unavailable.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
