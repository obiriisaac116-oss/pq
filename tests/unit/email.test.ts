// tests/unit/email.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockSendMail = vi.fn()

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  },
}))

import { sendContactNotification } from '@/lib/email'

describe('sendContactNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendMail.mockResolvedValue({ messageId: 'mock-id' })
    process.env.BREVO_SMTP_USER = 'test@gmail.com'
    process.env.BREVO_SMTP_KEY = 'test-smtp-key'
    process.env.BREVO_FROM_EMAIL = 'test@gmail.com'
    process.env.ADMIN_CONTACT_EMAIL = 'admin@example.com'
  })

  afterEach(() => {
    delete process.env.BREVO_SMTP_USER
    delete process.env.BREVO_SMTP_KEY
    delete process.env.BREVO_FROM_EMAIL
    delete process.env.ADMIN_CONTACT_EMAIL
  })

  it('calls sendMail with correct arguments', async () => {
    await sendContactNotification({ name: 'Bob', email: 'bob@example.com', message: 'Hello' })
    expect(mockSendMail).toHaveBeenCalledOnce()
    const [arg] = mockSendMail.mock.calls[0]
    expect(arg.to).toBe('admin@example.com')
    expect(arg.subject).toContain('Bob')
    expect(arg.replyTo).toBe('bob@example.com')
  })

  it('uses ADMIN_CONTACT_EMAIL as recipient', async () => {
    process.env.ADMIN_CONTACT_EMAIL = 'contact@example.com'
    await sendContactNotification({ name: 'Bob', email: 'bob@example.com', message: 'Hello' })
    const [arg] = mockSendMail.mock.calls[0]
    expect(arg.to).toBe('contact@example.com')
  })

  it('re-throws when sendMail throws', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP error'))
    await expect(
      sendContactNotification({ name: 'Bob', email: 'bob@example.com', message: 'Hello' })
    ).rejects.toThrow('SMTP error')
  })

  it('returns silently when ADMIN_CONTACT_EMAIL is not set', async () => {
    delete process.env.ADMIN_CONTACT_EMAIL
    await expect(
      sendContactNotification({ name: 'Bob', email: 'bob@example.com', message: 'Hello' })
    ).resolves.toBeUndefined()
    expect(mockSendMail).not.toHaveBeenCalled()
  })

  it('includes message in HTML body', async () => {
    await sendContactNotification({ name: 'Bob', email: 'bob@example.com', message: 'Test content' })
    const [arg] = mockSendMail.mock.calls[0]
    expect(arg.html).toContain('Test content')
  })
})
