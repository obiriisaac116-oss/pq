// tests/unit/email.test.ts — tests for Brevo HTTP API email helper
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { sendContactNotification } from '@/lib/email'

describe('sendContactNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ messageId: 'mock-id' }) })
    process.env.BREVO_API_KEY = 'test-api-key'
    process.env.BREVO_FROM_EMAIL = 'test@example.com'
    process.env.ADMIN_CONTACT_EMAIL = 'admin@example.com'
  })

  afterEach(() => {
    delete process.env.BREVO_API_KEY
    delete process.env.BREVO_FROM_EMAIL
    delete process.env.ADMIN_CONTACT_EMAIL
  })

  it('calls Brevo API with correct arguments', async () => {
    await sendContactNotification({ name: 'Bob', email: 'bob@example.com', message: 'Hello' })
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    const body = JSON.parse(opts.body)
    expect(body.to[0].email).toBe('admin@example.com')
    expect(body.subject).toContain('Bob')
    expect(body.replyTo.email).toBe('bob@example.com')
  })

  it('uses ADMIN_CONTACT_EMAIL as recipient', async () => {
    process.env.ADMIN_CONTACT_EMAIL = 'contact@example.com'
    await sendContactNotification({ name: 'Bob', email: 'bob@example.com', message: 'Hello' })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.to[0].email).toBe('contact@example.com')
  })

  it('throws when Brevo returns an error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, text: async () => 'Unauthorized', status: 401 })
    await expect(
      sendContactNotification({ name: 'Bob', email: 'bob@example.com', message: 'Hello' })
    ).rejects.toThrow('Brevo API error 401')
  })

  it('returns silently when ADMIN_CONTACT_EMAIL is not set', async () => {
    delete process.env.ADMIN_CONTACT_EMAIL
    await expect(
      sendContactNotification({ name: 'Bob', email: 'bob@example.com', message: 'Hello' })
    ).resolves.toBeUndefined()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('includes message in HTML body', async () => {
    await sendContactNotification({ name: 'Bob', email: 'bob@example.com', message: 'Test content' })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.htmlContent).toContain('Test content')
  })
})
