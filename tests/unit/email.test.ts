// tests/unit/email.test.ts
//
// Unit tests for src/lib/email.ts — sendContactNotification().
// Mocks the Resend SDK so no real API key is needed.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock 'resend' before importing the module under test.
// sendContactNotification creates `new Resend(key)` lazily, so the mock
// must intercept the constructor and the `emails.send` method on its instance.
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
  })

  it('calls resend.emails.send with the correct arguments', async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com'
    process.env.RESEND_FROM_EMAIL = 'noreply@example.com'

    await sendContactNotification({
      name: 'Bob',
      email: 'bob@example.com',
      message: 'Test message content',
    })

    expect(mockEmailsSend).toHaveBeenCalledOnce()
    const [callArg] = mockEmailsSend.mock.calls[0]
    // to should match ADMIN_EMAIL or fall back to 'admin@example.com'
    expect(callArg.to).toBe(process.env.ADMIN_EMAIL ?? 'admin@example.com')
    // subject should contain the sender's name
    expect(callArg.subject).toContain('Bob')
  })

  it('sends to ADMIN_EMAIL env var when set', async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com'
    process.env.RESEND_FROM_EMAIL = 'noreply@example.com'

    await sendContactNotification({
      name: 'Bob',
      email: 'bob@example.com',
      message: 'Test message content',
    })

    const [callArg] = mockEmailsSend.mock.calls[0]
    expect(callArg.to).toBe('admin@example.com')
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

  it('re-throws when resend.emails.send throws an exception', async () => {
    mockEmailsSend.mockRejectedValueOnce(new Error('Network failure'))

    await expect(
      sendContactNotification({
        name: 'Bob',
        email: 'bob@example.com',
        message: 'Test message content',
      }),
    ).rejects.toThrow('Network failure')
  })

  it('includes the message in the email HTML body', async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com'
    process.env.RESEND_FROM_EMAIL = 'noreply@example.com'

    await sendContactNotification({
      name: 'Bob',
      email: 'bob@example.com',
      message: 'Test message content',
    })

    const [callArg] = mockEmailsSend.mock.calls[0]
    expect(callArg.html).toContain('Test message content')
  })
})
