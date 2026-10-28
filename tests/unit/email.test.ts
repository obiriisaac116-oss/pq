// tests/unit/email.test.ts
//
// Unit tests for src/lib/email.ts — sendContactNotification().
// Mocks the Resend SDK so no real API key is needed.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock 'resend' before importing the module under test.
// ---------------------------------------------------------------------------
const mockEmailsSend = vi.fn()

vi.mock('resend', () => {
  const Resend = vi.fn().mockImplementation(() => ({
    emails: {
      send: mockEmailsSend,
    },
  }))
  return { Resend }
})

// ---------------------------------------------------------------------------
// Import after mock registration
// ---------------------------------------------------------------------------
import { sendContactNotification } from '@/lib/email'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('sendContactNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: successful send (no error returned)
    mockEmailsSend.mockResolvedValue({ data: { id: 'mock-id' }, error: null })
    // Set required env vars
    process.env.ADMIN_CONTACT_EMAIL = 'admin@example.com'
    process.env.RESEND_FROM_EMAIL = 'noreply@example.com'
  })

  afterEach(() => {
    delete process.env.ADMIN_CONTACT_EMAIL
    delete process.env.ADMIN_EMAIL
    delete process.env.RESEND_FROM_EMAIL
  })

  it('calls resend.emails.send with the correct arguments', async () => {
    await sendContactNotification({
      name: 'Bob',
      email: 'bob@example.com',
      message: 'Test message content',
    })

    expect(mockEmailsSend).toHaveBeenCalledOnce()
    const [callArg] = mockEmailsSend.mock.calls[0]
    expect(callArg.to).toBe('admin@example.com')
    expect(callArg.subject).toContain('Bob')
  })

  it('uses ADMIN_CONTACT_EMAIL as the recipient', async () => {
    process.env.ADMIN_CONTACT_EMAIL = 'contact@example.com'

    await sendContactNotification({
      name: 'Bob',
      email: 'bob@example.com',
      message: 'Test message content',
    })

    const [callArg] = mockEmailsSend.mock.calls[0]
    expect(callArg.to).toBe('contact@example.com')
  })

  it('re-throws when resend.emails.send returns an error', async () => {
    mockEmailsSend.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid API key', name: 'validation_error' },
    })

    await expect(
      sendContactNotification({
        name: 'Bob',
        email: 'bob@example.com',
        message: 'Test message content',
      }),
    ).rejects.toThrow('Resend error')
  })

  it('returns silently when no admin email env var is set', async () => {
    delete process.env.ADMIN_CONTACT_EMAIL
    delete process.env.ADMIN_EMAIL

    // Should not throw — logs error and returns
    await expect(
      sendContactNotification({
        name: 'Bob',
        email: 'bob@example.com',
        message: 'Test message content',
      }),
    ).resolves.toBeUndefined()

    // Should not have called send at all
    expect(mockEmailsSend).not.toHaveBeenCalled()
  })

  it('includes the message in the email HTML body', async () => {
    await sendContactNotification({
      name: 'Bob',
      email: 'bob@example.com',
      message: 'Test message content',
    })

    const [callArg] = mockEmailsSend.mock.calls[0]
    expect(callArg.html).toContain('Test message content')
  })
})
