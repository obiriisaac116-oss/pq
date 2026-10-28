// tests/unit/email.test.ts
//
// Unit tests for src/lib/email.ts using Nodemailer + Gmail SMTP.
// Mocks nodemailer so no real credentials are needed.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock nodemailer before importing the module under test.
// ---------------------------------------------------------------------------
const mockSendMail = vi.fn()

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}))

import { sendContactNotification } from '@/lib/email'

describe('sendContactNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendMail.mockResolvedValue({ messageId: 'mock-id' })
    process.env.GMAIL_USER = 'test@gmail.com'
    process.env.GMAIL_APP_PASSWORD = 'test-app-password'
    process.env.ADMIN_CONTACT_EMAIL = 'admin@example.com'
  })

  afterEach(() => {
    delete process.env.GMAIL_USER
    delete process.env.GMAIL_APP_PASSWORD
    delete process.env.ADMIN_CONTACT_EMAIL
  })

  it('calls sendMail with correct arguments', async () => {
    await sendContactNotification({
      name: 'Bob',
      email: 'bob@example.com',
      message: 'Test message content',
    })

    expect(mockSendMail).toHaveBeenCalledOnce()
    const [callArg] = mockSendMail.mock.calls[0]
    expect(callArg.to).toBe('admin@example.com')
    expect(callArg.subject).toContain('Bob')
    expect(callArg.replyTo).toBe('bob@example.com')
  })

  it('uses ADMIN_CONTACT_EMAIL as the recipient', async () => {
    process.env.ADMIN_CONTACT_EMAIL = 'contact@example.com'

    await sendContactNotification({
      name: 'Bob',
      email: 'bob@example.com',
      message: 'Test message content',
    })

    const [callArg] = mockSendMail.mock.calls[0]
    expect(callArg.to).toBe('contact@example.com')
  })

  it('re-throws when sendMail throws', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'))

    await expect(
      sendContactNotification({
        name: 'Bob',
        email: 'bob@example.com',
        message: 'Test message content',
      }),
    ).rejects.toThrow('SMTP connection failed')
  })

  it('returns silently when no admin email env var is set', async () => {
    delete process.env.ADMIN_CONTACT_EMAIL
    delete process.env.GMAIL_USER

    await expect(
      sendContactNotification({
        name: 'Bob',
        email: 'bob@example.com',
        message: 'Test message content',
      }),
    ).resolves.toBeUndefined()

    expect(mockSendMail).not.toHaveBeenCalled()
  })

  it('includes the message in the email HTML body', async () => {
    await sendContactNotification({
      name: 'Bob',
      email: 'bob@example.com',
      message: 'Test message content',
    })

    const [callArg] = mockSendMail.mock.calls[0]
    expect(callArg.html).toContain('Test message content')
  })
})
