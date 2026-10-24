// src/lib/validations.ts
//
// All Zod schemas for the application. Imported by both API route handlers
// (server-side validation) and client components (instant feedback).
// Zod v4 — top-level helpers (z.string(), z.number(), z.enum(), …) are
// available directly; z.string().email() is not; use z.email() / z.uuid()
// as standalone validators and compose with z.string() where needed.

import * as z from 'zod'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const FILE_TYPE_VALUES = ['pdf', 'jpg', 'png'] as const
const SEMESTER_VALUES = ['first', 'second', 'resit'] as const
const STATUS_VALUES = ['published', 'draft'] as const
const LEVEL_VALUES = [100, 200, 300, 400, 500] as const

// ---------------------------------------------------------------------------
// paperInsertSchema
// Used by POST /api/papers to validate the paper record body.
//
// NOTE: The database `papers.level` column is TEXT (stores '100', '200', …).
// We accept a number from the form and transform it to a string before the DB
// write so the Supabase TypeScript client is satisfied.
// ---------------------------------------------------------------------------
export const paperInsertSchema = z.object({
  title: z.string().min(3).max(200),
  course_id: z.uuid(),
  year: z
    .number()
    .int()
    .min(1990)
    .max(new Date().getFullYear() + 1),
  semester: z.enum(SEMESTER_VALUES),
  // Accept a number (form value) and transform to the TEXT the DB stores.
  level: z
    .number()
    .int()
    .refine((v) => (LEVEL_VALUES as readonly number[]).includes(v), {
      message: 'level must be 100, 200, 300, 400, or 500',
    })
    .transform((v) => String(v)),
  status: z.enum(STATUS_VALUES).optional().default('draft'),
  file_path: z.string().min(1),
  file_type: z.enum(FILE_TYPE_VALUES),
})

export type PaperInsert = z.infer<typeof paperInsertSchema>

// ---------------------------------------------------------------------------
// paperUpdateSchema
// Used by PATCH /api/papers/[id] — every field is optional.
// ---------------------------------------------------------------------------
export const paperUpdateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  course_id: z.uuid().optional(),
  year: z
    .number()
    .int()
    .min(1990)
    .max(new Date().getFullYear() + 1)
    .optional(),
  semester: z.enum(SEMESTER_VALUES).optional(),
  level: z
    .number()
    .int()
    .refine((v) => (LEVEL_VALUES as readonly number[]).includes(v), {
      message: 'level must be 100, 200, 300, 400, or 500',
    })
    .transform((v) => String(v))
    .optional(),
  status: z.enum(STATUS_VALUES).optional(),
  file_path: z.string().min(1).optional(),
  file_type: z.enum(FILE_TYPE_VALUES).optional(),
})

export type PaperUpdate = z.infer<typeof paperUpdateSchema>

// ---------------------------------------------------------------------------
// presignSchema
// Used by POST /api/upload/presign to validate before issuing the upload URL.
// ---------------------------------------------------------------------------
export const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(ALLOWED_MIME_TYPES),
  size: z
    .number()
    .int()
    .min(1)
    .max(MAX_FILE_SIZE, { message: 'File must be 10 MB or smaller' }),
})

export type PresignInput = z.infer<typeof presignSchema>

// ---------------------------------------------------------------------------
// contactSchema
// Used by POST /api/contact.
// ---------------------------------------------------------------------------
export const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email().max(254),
  message: z.string().min(10).max(2000),
  honeypot: z.string().max(0), // must be empty
  cf_token: z.string().min(1), // Cloudflare Turnstile token
})

export type ContactInput = z.infer<typeof contactSchema>

// ---------------------------------------------------------------------------
// searchSchema
// Used by GET /api/papers to parse URL search params.
// ---------------------------------------------------------------------------
export const searchSchema = z.object({
  q: z.string().max(200).optional(),
  programme: z.string().max(100).optional(),
  course_code: z.string().max(20).optional(),
  // Keep level as a string to match the papers.level TEXT column end-to-end.
  level: z.string().optional(),
  year: z.coerce.number().int().optional(),
  semester: z.enum(SEMESTER_VALUES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(12),
})

export type SearchInput = z.infer<typeof searchSchema>
