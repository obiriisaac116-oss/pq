'use client'

// src/components/UploadForm.tsx
//
// Multi-step upload / edit form for admin users.
//
// Upload flow:
//   1. Admin fills metadata (title, course, level, year, semester).
//   2. Admin picks a file (PDF / JPG / PNG, ≤ 10 MB) — client validates.
//   3. On submit:
//      a. POST /api/upload/presign  → { signedUrl, token, path }
//      b. PUT signedUrl  (direct upload to Supabase Storage, progress tracked)
//      c. POST /api/papers  → create paper record with file_path
//
// Edit flow (editPaper prop set):
//   - Form fields are pre-filled from the existing paper.
//   - File input is optional — leaving it blank keeps the existing file.
//   - On submit with no new file: PATCH /api/papers/[id] with metadata only.
//   - On submit with a new file: full presign+upload+PATCH.

import { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react'

import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '@/lib/validations'
import type { CoursesRow, PapersRow } from '@/types/database'

type UploadFormProps = {
  courses: CoursesRow[]
  editPaper?: (PapersRow & { courses: CoursesRow | null }) | null
}

type FormState = 'idle' | 'uploading' | 'saving' | 'success' | 'error'

type LastUpload = {
  courseId: string
  level: string
  semester: string
}

const ALLOWED_TYPES = ALLOWED_MIME_TYPES as readonly string[]

const LEVELS = [100, 200, 300, 400, 500] as const
const SEMESTERS = ['first', 'second', 'resit'] as const

function mimeToFileType(mime: string): 'pdf' | 'jpg' | 'png' {
  if (mime === 'application/pdf') return 'pdf'
  if (mime === 'image/jpeg') return 'jpg'
  return 'png'
}

export function UploadForm({ courses, editPaper }: UploadFormProps) {
  const [title, setTitle] = useState(editPaper?.title ?? '')
  const [courseId, setCourseId] = useState(editPaper?.course_id ?? '')
  const [level, setLevel] = useState<string>(editPaper?.level ?? '100')
  const [year, setYear] = useState<string>(
    editPaper?.year ? String(editPaper.year) : String(new Date().getFullYear()),
  )
  const [semester, setSemester] = useState<string>(editPaper?.semester ?? 'first')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastUpload, setLastUpload] = useState<LastUpload | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const isDraftAndContinueRef = useRef(false)
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [localCourses, setLocalCourses] = useState<CoursesRow[]>(courses)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newProgramme, setNewProgramme] = useState('')
  const [addingCourse, setAddingCourse] = useState(false)
  const [addCourseError, setAddCourseError] = useState<string | null>(null)

  // Smart defaults on mount: restore last used courseId/level/semester from localStorage.
  useEffect(() => {
    if (!editPaper) {
      const savedCourseId = localStorage.getItem('pq:lastCourseId')
      const savedLevel = localStorage.getItem('pq:lastLevel')
      const savedSemester = localStorage.getItem('pq:lastSemester')
      if (savedCourseId) setCourseId(savedCourseId)
      if (savedLevel) setLevel(savedLevel)
      if (savedSemester) setSemester(savedSemester)
    }
  }, [editPaper])

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null
    setFileError(null)
    setFile(null)

    if (!picked) return

    if (!ALLOWED_TYPES.includes(picked.type)) {
      setFileError('Only PDF, JPG, and PNG files are accepted.')
      return
    }
    if (picked.size > MAX_FILE_SIZE) {
      setFileError('File must be 10 MB or smaller.')
      return
    }

    setFile(picked)
  }

  async function handleAddCourse() {
    setAddingCourse(true)
    setAddCourseError(null)
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode.trim(),
          name: newName.trim(),
          programme: newProgramme.trim(),
        }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(typeof error === 'string' ? error : 'Failed to create course')
      }
      const created: CoursesRow = await res.json()
      setLocalCourses((prev) =>
        [...prev, created].sort((a, b) => a.code.localeCompare(b.code)),
      )
      setCourseId(created.id)
      setNewCode('')
      setNewName('')
      setNewProgramme('')
      setShowAddCourse(false)
    } catch (err) {
      setAddCourseError(err instanceof Error ? err.message : 'Failed to create course')
    } finally {
      setAddingCourse(false)
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)

    // In upload (non-edit) mode, a file is required.
    if (!editPaper && !file) {
      setFileError('Please select a file.')
      return
    }

    setFormState('uploading')
    setProgress(0)

    try {
      if (editPaper) {
        // ── Edit mode ────────────────────────────────────────────────────────
        if (file) {
          // New file selected — presign + upload, then PATCH with new file path.
          const presignRes = await fetch('/api/upload/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
              size: file.size,
            }),
          })

          if (!presignRes.ok) {
            const { error } = (await presignRes.json()) as { error: string }
            throw new Error(error ?? 'Could not get upload URL.')
          }

          const { signedUrl, path } = (await presignRes.json()) as {
            signedUrl: string
            token: string
            path: string
          }

          await uploadWithProgress(signedUrl, file, (pct) => setProgress(pct))
          setFormState('saving')

          const patchRes = await fetch(`/api/papers/${editPaper.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: title.trim(),
              course_id: courseId || null,
              year: Number(year),
              semester,
              level,
              file_path: path,
              file_type: mimeToFileType(file.type),
            }),
          })

          if (!patchRes.ok) {
            const { error } = (await patchRes.json()) as { error: string }
            throw new Error(error ?? 'Failed to update paper record.')
          }
        } else {
          // No new file — metadata-only PATCH.
          setFormState('saving')

          const patchRes = await fetch(`/api/papers/${editPaper.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: title.trim(),
              course_id: courseId || null,
              year: Number(year),
              semester,
              level,
            }),
          })

          if (!patchRes.ok) {
            const { error } = (await patchRes.json()) as { error: string }
            throw new Error(error ?? 'Failed to update paper record.')
          }
        }
      } else {
        // ── Upload mode ──────────────────────────────────────────────────────
        // file is guaranteed to be non-null here (checked above).
        const uploadFile = file!

        // Step 1: get presigned upload URL.
        const presignRes = await fetch('/api/upload/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: uploadFile.name,
            contentType: uploadFile.type,
            size: uploadFile.size,
          }),
        })

        if (!presignRes.ok) {
          const { error } = (await presignRes.json()) as { error: string }
          throw new Error(error ?? 'Could not get upload URL.')
        }

        const { signedUrl, path } = (await presignRes.json()) as {
          signedUrl: string
          token: string
          path: string
        }

        // Step 2: upload file directly to Supabase Storage.
        await uploadWithProgress(signedUrl, uploadFile, (pct) => setProgress(pct))

        // Step 3: create the paper record.
        setFormState('saving')

        const paperRes = await fetch('/api/papers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            course_id: courseId,
            year: Number(year),
            semester,
            level: Number(level),
            file_path: path,
            file_type: mimeToFileType(uploadFile.type),
            status: 'draft',
          }),
        })

        if (!paperRes.ok) {
          const { error } = (await paperRes.json()) as { error: string }
          throw new Error(error ?? 'Failed to save paper record.')
        }

        // Persist smart defaults to localStorage before deciding what to reset.
        localStorage.setItem('pq:lastCourseId', courseId)
        localStorage.setItem('pq:lastLevel', level)
        localStorage.setItem('pq:lastSemester', semester)

        // Save last upload for the "Upload another" restore action.
        const snapshot: LastUpload = { courseId, level, semester }
        setLastUpload(snapshot)

        if (isDraftAndContinueRef.current) {
          // Draft + upload another: keep courseId/level/semester, clear title + file only.
          isDraftAndContinueRef.current = false
          setTitle('')
          setFile(null)
          setProgress(0)
          if (fileInputRef.current) fileInputRef.current.value = ''
          setFormState('idle')
          return
        }

        // Normal success: reset form.
        setTitle('')
        setCourseId('')
        setLevel('100')
        setYear(String(new Date().getFullYear()))
        setSemester('first')
        setFile(null)
        setProgress(0)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }

      setFormState('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed.')
      setFormState('error')
    }
  }

  const isSubmitting = formState === 'uploading' || formState === 'saving'

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Edit-mode banner */}
      {editPaper && (
        <p className="mb-4 rounded bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
          Editing: {editPaper.title}
        </p>
      )}

      {formState === 'success' && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md bg-green-50 p-4 text-sm text-green-800"
        >
          {editPaper
            ? 'Paper updated successfully.'
            : 'Paper uploaded successfully and saved as draft. You can publish it from the Papers page.'}

          {/* Post-success actions (upload mode only) */}
          {!editPaper && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (lastUpload) {
                    setCourseId(lastUpload.courseId)
                    setLevel(lastUpload.level)
                    setSemester(lastUpload.semester)
                  }
                  setFormState('idle')
                }}
                className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
              >
                Upload another
              </button>
              <a
                href="/admin/papers"
                className="rounded-md border border-green-700 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50"
              >
                Go to papers
              </a>
            </div>
          )}
        </div>
      )}

      {formState === 'error' && errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-md bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title <span aria-hidden="true">*</span>
        </label>
        <input
          id="title"
          type="text"
          required
          minLength={3}
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-60"
          placeholder="e.g. CSC 301 – 2023 First Semester Exam"
        />
      </div>

      {/* Course */}
      <div>
        <label htmlFor="course_id" className="block text-sm font-medium text-gray-700">
          Course <span aria-hidden="true">*</span>
        </label>
        <select
          id="course_id"
          required
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          disabled={isSubmitting}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-60"
        >
          <option value="">— Select a course —</option>
          {localCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} – {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowAddCourse((v) => !v)}
          className="mt-1 text-xs text-brand-primary hover:underline"
        >
          {showAddCourse ? '— Cancel' : '+ Add new course'}
        </button>
        {showAddCourse && (
          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">New course</p>
            {addCourseError && (
              <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{addCourseError}</p>
            )}
            <input
              type="text"
              placeholder="Code (e.g. CS101)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
            <input
              type="text"
              placeholder="Name (e.g. Intro to CS)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
            <input
              type="text"
              placeholder="Programme (e.g. BSc Computer Science)"
              value={newProgramme}
              onChange={(e) => setNewProgramme(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
            <button
              type="button"
              disabled={addingCourse || !newCode.trim() || !newName.trim()}
              onClick={handleAddCourse}
              className="w-full rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {addingCourse ? 'Adding…' : 'Add course'}
            </button>
          </div>
        )}
      </div>

      {/* Level + Year + Semester row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="level" className="block text-sm font-medium text-gray-700">
            Level <span aria-hidden="true">*</span>
          </label>
          <select
            id="level"
            required
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            disabled={isSubmitting}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-60"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="year" className="block text-sm font-medium text-gray-700">
            Year <span aria-hidden="true">*</span>
          </label>
          <input
            id="year"
            type="number"
            required
            min={1990}
            max={new Date().getFullYear() + 1}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={isSubmitting}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="semester" className="block text-sm font-medium text-gray-700">
            Semester <span aria-hidden="true">*</span>
          </label>
          <select
            id="semester"
            required
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            disabled={isSubmitting}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-60"
          >
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* File */}
      <div>
        <label htmlFor="file" className="block text-sm font-medium text-gray-700">
          File (PDF, JPG, PNG — max 10 MB){' '}
          {!editPaper && <span aria-hidden="true">*</span>}
        </label>
        <input
          ref={fileInputRef}
          id="file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          required={!editPaper}
          onChange={handleFileChange}
          disabled={isSubmitting}
          aria-describedby={fileError ? 'file-error' : undefined}
          className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50 disabled:opacity-60"
        />
        {editPaper && (
          <p className="mt-1 text-xs text-gray-500">Leave blank to keep the existing file.</p>
        )}
        {fileError && (
          <p id="file-error" role="alert" className="mt-1 text-sm text-red-600">
            {fileError}
          </p>
        )}
        {file && !fileError && (
          <p className="mt-1 text-sm text-gray-500">
            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      {/* Progress bar */}
      {formState === 'uploading' && (
        <div aria-live="polite" className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-brand-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {formState === 'saving' && (
        <p aria-live="polite" className="text-sm text-gray-500">
          Saving paper record…
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || (!editPaper && !file)}
        className="flex w-full items-center justify-center rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Spinner />
            <span className="ml-2">
              {formState === 'uploading' ? 'Uploading…' : 'Saving…'}
            </span>
          </>
        ) : editPaper ? (
          'Save changes'
        ) : (
          'Upload paper'
        )}
      </button>

      {/* Save as draft + upload another — upload mode only */}
      {!editPaper && (
        <button
          type="button"
          disabled={isSubmitting || !file}
          onClick={() => {
            isDraftAndContinueRef.current = true
            formRef.current?.requestSubmit()
          }}
          className="flex w-full items-center justify-center rounded-md border border-brand-primary px-4 py-2 text-sm font-medium text-brand-primary hover:bg-brand-primary/5 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save as draft + upload another
        </button>
      )}
    </form>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
    />
  )
}

/**
 * Upload a file to a presigned URL and report progress via XHR.
 */
async function uploadWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signedUrl, true)
    xhr.setRequestHeader('Content-Type', file.type)

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve()
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed. Check your connection and try again.'))
    })

    xhr.send(file)
  })
}
