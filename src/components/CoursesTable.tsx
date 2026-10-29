'use client'

// src/components/CoursesTable.tsx
//
// Admin courses table with inline edit and delete.

import { useState } from 'react'
import type { CoursesRow } from '@/types/database'
import { useToast } from '@/components/ToastContext'

type Props = {
  initialCourses: CoursesRow[]
}

type EditFields = {
  code: string
  name: string
  programme: string
}

export function CoursesTable({ initialCourses }: Props) {
  const toast = useToast()
  const [courses, setCourses] = useState<CoursesRow[]>(initialCourses)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFields, setEditFields] = useState<EditFields>({ code: '', name: '', programme: '' })
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<Record<string, string>>({})

  function startEdit(course: CoursesRow) {
    setEditingId(course.id)
    setEditFields({
      code: course.code,
      name: course.name,
      programme: course.programme ?? '',
    })
    setRowError((prev) => ({ ...prev, [course.id]: '' }))
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleSave(id: string) {
    setSavingId(id)
    setRowError((prev) => ({ ...prev, [id]: '' }))
    try {
      const body: Record<string, string | null> = {
        code: editFields.code.trim(),
        name: editFields.name.trim(),
        // send null when cleared, otherwise send the trimmed value
        programme: editFields.programme.trim() === '' ? null : editFields.programme.trim(),
      }
      const res = await fetch(`/api/courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(typeof json.error === 'string' ? json.error : 'Update failed')
      }
      const { data: updated }: { data: CoursesRow } = await res.json()
      setCourses((prev) => prev.map((c) => (c.id === id ? updated : c)))
      setEditingId(null)
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : 'Update failed',
      }))
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!await toast.confirm('Delete this course? This cannot be undone.')) return
    setDeletingId(id)
    setRowError((prev) => ({ ...prev, [id]: '' }))
    try {
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const json = await res.json()
        throw new Error(typeof json.error === 'string' ? json.error : 'Delete failed')
      }
      setCourses((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : 'Delete failed',
      }))
    } finally {
      setDeletingId(null)
    }
  }

  if (courses.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No courses yet. Use the Upload page to add one.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Code</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Programme</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Created</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {courses.map((course) => {
            const isEditing = editingId === course.id
            const isSaving = savingId === course.id
            const isDeleting = deletingId === course.id
            const err = rowError[course.id]

            return (
              <tr key={course.id} className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                {/* Code */}
                <td className="px-4 py-3 align-top">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editFields.code}
                      onChange={(e) => setEditFields((f) => ({ ...f, code: e.target.value }))}
                      className="block w-28 rounded border border-gray-300 px-2 py-1 text-sm focus:border-brand-primary focus:outline-none"
                      aria-label="Course code"
                    />
                  ) : (
                    <span className="font-mono font-medium">{course.code}</span>
                  )}
                </td>

                {/* Name */}
                <td className="px-4 py-3 align-top">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editFields.name}
                      onChange={(e) => setEditFields((f) => ({ ...f, name: e.target.value }))}
                      className="block w-full min-w-[160px] rounded border border-gray-300 px-2 py-1 text-sm focus:border-brand-primary focus:outline-none"
                      aria-label="Course name"
                    />
                  ) : (
                    course.name
                  )}
                </td>

                {/* Programme */}
                <td className="px-4 py-3 align-top text-gray-500">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editFields.programme}
                      onChange={(e) => setEditFields((f) => ({ ...f, programme: e.target.value }))}
                      placeholder="Leave blank to clear"
                      className="block w-full min-w-[160px] rounded border border-gray-300 px-2 py-1 text-sm focus:border-brand-primary focus:outline-none"
                      aria-label="Programme"
                    />
                  ) : (
                    course.programme ?? <span className="italic text-gray-400">—</span>
                  )}
                </td>

                {/* Created */}
                <td className="whitespace-nowrap px-4 py-3 align-top text-gray-500">
                  {new Date(course.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 align-top">
                  {err && (
                    <p className="mb-1 text-xs text-red-600" role="alert">{err}</p>
                  )}
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSave(course.id)}
                        disabled={isSaving}
                        className="rounded bg-brand-primary px-3 py-1 text-xs font-medium text-white hover:bg-brand-primary/90 disabled:opacity-60"
                      >
                        {isSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(course)}
                        disabled={isDeleting}
                        className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        disabled={isDeleting}
                        className="rounded border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {isDeleting ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
