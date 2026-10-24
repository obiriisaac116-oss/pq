'use client'

// src/components/UploadForm.tsx
//
// Multi-step upload form for admin users.
//
// Flow:
//   1. Admin fills metadata (title, course, level, year, semester).
//   2. Admin picks a file (PDF / JPG / PNG, ≤ 10 MB) — client validates.
//   3. On submit:
//      a. POST /api/upload/presign  → { signedUrl, token, path }
//      b. PUT signedUrl  (direct upload to Supabase Storage, progress tracked)
//      c. POST /api/papers  → create paper record with file_path
//   4. Success / error state shown inline.

import { useState, useRef, ChangeEvent, FormEvent } from 'react'

import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '@/lib/validations'
import type { CoursesRow } from '@/types/database'

type UploadFormProps = {
  courses: CoursesRow[]
}

type FormState = 'idle' | 'uploading' | 'saving' | 'success' | 'error'

const ALLOWED_TYPES = ALLOWED_MIME_TYPES as readonly string[]

const LEVELS = [100, 200, 300, 400, 500] as const
const SEMESTERS = ['first', 'second', 'resit'] as const

function mimeToFileType(mime: string): 'pdf' | 'jpg' | 'png' {
  if (mime === 'application/pdf') return 'pdf'
  if (mime === 'image/jpeg') return 'jpg'
  return 'png'
}

export function UploadForm({ courses }: UploadFormProps) {
  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState('')
  const [level, setLevel] = useState<string>('100')
  const [year, setYear] = useState<string>(String(new Date().getFullYear()))
  const [semester, setSemester] = useState<string>('first')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)

    if (!file) {
      setFileError('Please select a file.')
      return
    }

    setFormState('uploading')
    setProgress(0)

    try {
      // ── Step 1: get presigned upload URL ───────────────────────────────
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

      // ── Step 2: upload file directly to Supabase Storage ──────────────
      await uploadWithProgress(signedUrl, file, (pct) => setProgress(pct))

      // ── Step 3: create the paper record ───────────────────────────────
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
          file_type: mimeToFileType(file.type),
          status: 'draft',
        }),
      })

      if (!paperRes.ok) {
        const { error } = (await paperRes.json()) as { error: string }
        throw new Error(error ?? 'Failed to save paper record.')
      }

      setFormState('success')
      // Reset form
      setTitle('')
      setCourseId('')
      setLevel('100')
      setYear(String(new Date().getFullYear()))
      setSemester('first')
      setFile(null)
      setProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed.')
      setFormState('error')
    }
  }

  const isSubmitting = formState === 'uploading' || formState === 'saving'

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {formState === 'success' && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md bg-green-50 p-4 text-sm text-green-800"
        >
          Paper uploaded successfully and saved as draft. You can publish it
          from the Papers page.
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
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
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
        <label
          htmlFor="course_id"
          className="block text-sm font-medium text-gray-700"
        >
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
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} – {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Level + Year + Semester row */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="level"
            className="block text-sm font-medium text-gray-700"
          >
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
          <label
            htmlFor="year"
            className="block text-sm font-medium text-gray-700"
          >
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
          <label
            htmlFor="semester"
            className="block text-sm font-medium text-gray-700"
          >
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
        <label
          htmlFor="file"
          className="block text-sm font-medium text-gray-700"
        >
          File (PDF, JPG, PNG — max 10 MB) <span aria-hidden="true">*</span>
        </label>
        <input
          ref={fileInputRef}
          id="file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={handleFileChange}
          disabled={isSubmitting}
          aria-describedby={fileError ? 'file-error' : undefined}
          className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50 disabled:opacity-60"
        />
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
        disabled={isSubmitting || !file}
        className="flex w-full items-center justify-center rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Spinner />
            <span className="ml-2">
              {formState === 'uploading' ? 'Uploading…' : 'Saving…'}
            </span>
          </>
        ) : (
          'Upload paper'
        )}
      </button>
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
 * Supabase Storage's `uploadToSignedUrl` endpoint expects a PUT with the raw
 * file body (not multipart) when the body is not a Blob/FormData that triggers
 * the prepareUploadFormData path. We use the plain signedUrl directly here.
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
