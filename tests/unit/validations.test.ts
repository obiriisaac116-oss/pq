// tests/unit/validations.test.ts
//
// Unit tests for Zod schemas in src/lib/validations.ts.
// No external services are involved — pure schema validation only.

import { describe, it, expect } from 'vitest'
import {
  contactSchema,
  searchSchema,
  presignSchema,
  MAX_FILE_SIZE,
} from '@/lib/validations'

// ---------------------------------------------------------------------------
// contactSchema
// ---------------------------------------------------------------------------
describe('contactSchema', () => {
  const valid = {
    name: 'Alice',
    email: 'alice@example.com',
    message: 'Hello there world',
    honeypot: '',
    cf_token: 'token123',
  }

  it('accepts a valid payload', () => {
    const result = contactSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('fails when message is too short (min 10 chars)', () => {
    const result = contactSchema.safeParse({ ...valid, message: 'hi' })
    expect(result.success).toBe(false)
  })

  it('fails when email is invalid', () => {
    const result = contactSchema.safeParse({ ...valid, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('schema accepts honeypot (enforced by route, not schema)', () => {
    // contactSchema marks honeypot as z.string().optional() — the bot-rejection
    // guard lives in the route handler, not the schema. This test documents
    // that the schema accepts a non-empty honeypot value; the route rejects it.
    const result = contactSchema.safeParse({ ...valid, honeypot: 'spam' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.honeypot).toBe('spam')
    }
  })

  it('fails when name is too short (min 2 chars)', () => {
    const result = contactSchema.safeParse({ ...valid, name: 'A' })
    expect(result.success).toBe(false)
  })

  it('fails when cf_token is empty', () => {
    const result = contactSchema.safeParse({ ...valid, cf_token: '' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// presignSchema  (server-side upload validation — file_type, file_size)
// ---------------------------------------------------------------------------
describe('presignSchema', () => {
  const valid = {
    filename: 'final-exam-2023.pdf',
    contentType: 'application/pdf' as const,
    size: 1024,
  }

  it('accepts a valid upload request', () => {
    const result = presignSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('fails when file size exceeds 10 MB', () => {
    const result = presignSchema.safeParse({
      ...valid,
      size: MAX_FILE_SIZE + 1,
    })
    expect(result.success).toBe(false)
  })

  it('accepts exactly 10 MB', () => {
    const result = presignSchema.safeParse({ ...valid, size: MAX_FILE_SIZE })
    expect(result.success).toBe(true)
  })

  it('fails when contentType is not allowed', () => {
    const result = presignSchema.safeParse({
      ...valid,
      contentType: 'application/zip',
    })
    expect(result.success).toBe(false)
  })

  it('fails when filename is empty', () => {
    const result = presignSchema.safeParse({ ...valid, filename: '' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// searchSchema
// ---------------------------------------------------------------------------
describe('searchSchema', () => {
  it('coerces page string to number', () => {
    const result = searchSchema.parse({ page: '2' })
    expect(result.page).toBe(2)
  })

  it('defaults page to 1 when omitted', () => {
    const result = searchSchema.parse({})
    expect(result.page).toBe(1)
  })

  it('defaults per_page to 12 when omitted', () => {
    const result = searchSchema.parse({})
    expect(result.per_page).toBe(12)
  })

  it('accepts a full valid search payload', () => {
    const result = searchSchema.safeParse({
      q: 'algorithms',
      programme: 'BSc Computer Science',
      course_code: 'CS101',
      level: '200',
      year: '2023',
      semester: 'first',
      page: '1',
      per_page: '10',
    })
    expect(result.success).toBe(true)
  })

  it('fails when semester is invalid', () => {
    const result = searchSchema.safeParse({ semester: 'summer' })
    expect(result.success).toBe(false)
  })

  it('fails when per_page exceeds 50', () => {
    const result = searchSchema.safeParse({ per_page: '100' })
    expect(result.success).toBe(false)
  })
})
