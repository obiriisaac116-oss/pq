// tests/unit/redis.test.ts
//
// Unit tests for src/lib/redis.ts.
// Mocks @upstash/redis and @upstash/ratelimit so no real credentials are
// needed. Verifies that the singleton instances are exported and that the
// limit() method returns the expected shape.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoist shared mock values so they are available when vi.mock factories run.
// vi.mock() calls are hoisted to the top of the file by vitest; any variable
// they reference must be created with vi.hoisted() to avoid TDZ errors.
// ---------------------------------------------------------------------------
const { mockLimit } = vi.hoisted(() => {
  return {
    mockLimit: vi.fn().mockResolvedValue({
      success: true,
      limit: 3,
      remaining: 2,
      reset: 0,
    }),
  }
})

// ---------------------------------------------------------------------------
// Mocks — declared before the module under test is imported
// ---------------------------------------------------------------------------

// Mock @upstash/redis — return a plain object acting as the Redis client.
vi.mock('@upstash/redis', () => {
  const Redis = vi.fn().mockImplementation(() => ({
    pipeline: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue([]),
    }),
  }))
  return { Redis }
})

// Mock @upstash/ratelimit — expose a Ratelimit constructor and a static
// slidingWindow factory.
vi.mock('@upstash/ratelimit', () => {
  const Ratelimit = vi.fn().mockImplementation((_opts: unknown) => ({
    limit: mockLimit,
  }))
  Ratelimit.slidingWindow = vi.fn().mockReturnValue({ type: 'slidingWindow' })
  return { Ratelimit }
})

// ---------------------------------------------------------------------------
// Import after mocks are set up
// ---------------------------------------------------------------------------
import { contactRatelimit, downloadRatelimit } from '@/lib/redis'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('redis module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports a defined contactRatelimit instance', () => {
    expect(contactRatelimit).toBeDefined()
  })

  it('exports a defined downloadRatelimit instance', () => {
    expect(downloadRatelimit).toBeDefined()
  })

  it('contactRatelimit.limit() returns a result with a success property', async () => {
    mockLimit.mockResolvedValueOnce({
      success: true,
      limit: 3,
      remaining: 2,
      reset: 0,
    })
    const result = await contactRatelimit.limit('127.0.0.1')
    expect(result).toHaveProperty('success')
    expect(typeof result.success).toBe('boolean')
  })

  it('contactRatelimit.limit() can return { success: false } after threshold', async () => {
    mockLimit.mockResolvedValueOnce({
      success: false,
      limit: 3,
      remaining: 0,
      reset: 0,
    })
    const result = await contactRatelimit.limit('127.0.0.1')
    expect(result.success).toBe(false)
  })

  it('downloadRatelimit.limit() returns a result with a success property', async () => {
    mockLimit.mockResolvedValueOnce({
      success: true,
      limit: 30,
      remaining: 29,
      reset: 0,
    })
    const result = await downloadRatelimit.limit('192.168.0.1')
    expect(result).toHaveProperty('success')
  })

  it('downloadRatelimit.limit() can return { success: false } when limit exceeded', async () => {
    mockLimit.mockResolvedValueOnce({
      success: false,
      limit: 30,
      remaining: 0,
      reset: 0,
    })
    const result = await downloadRatelimit.limit('192.168.0.1')
    expect(result.success).toBe(false)
  })
})
