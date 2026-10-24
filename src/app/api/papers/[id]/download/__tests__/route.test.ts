// src/app/api/papers/[id]/download/__tests__/route.test.ts
//
// Unit tests for the download route covering:
//  - rate-limit hit → 429
//  - paper not found → 404
//  - happy path → 200 with signed URL
//  - signed URL generation failure → 500

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// vi.hoisted — create mocks in the hoisted scope so vi.mock factories can
// reference them without hitting "cannot access before initialization".
// ---------------------------------------------------------------------------
const { limitFn, mockFrom, mockCreateSignedUrl, mockRpc, mockGetUser } =
  vi.hoisted(() => {
    return {
      limitFn: vi.fn(),
      mockFrom: vi.fn(),
      mockCreateSignedUrl: vi.fn(),
      mockRpc: vi.fn(),
      mockGetUser: vi.fn(),
    }
  })

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/lib/redis', () => ({
  downloadRatelimit: { limit: limitFn },
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockFrom,
    storage: {
      from: () => ({ createSignedUrl: mockCreateSignedUrl }),
    },
    rpc: mockRpc,
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }),
        }),
      }),
    }),
}))

// ---------------------------------------------------------------------------
// Import the route after mocks are in place.
// ---------------------------------------------------------------------------
import { GET } from '../route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/papers/${id}/download`, {
    headers: { 'x-forwarded-for': '127.0.0.1' },
  })
}

function setupSelectChain(paperData: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: paperData, error: null })
  const eq2 = vi.fn().mockReturnValue({ maybeSingle })
  const eq1 = vi.fn().mockReturnValue({ eq: eq2, maybeSingle })
  const select = vi.fn().mockReturnValue({ eq: eq1 })
  mockFrom.mockReturnValue({ select })
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: no authenticated user.
  mockGetUser.mockResolvedValue({ data: { user: null } })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /api/papers/[id]/download', () => {
  it('returns 429 when rate limit is exceeded', async () => {
    limitFn.mockResolvedValue({ success: false })

    const res = await GET(makeRequest('paper-1'), { params: { id: 'paper-1' } })

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toMatch(/too many requests/i)
  })

  it('returns 404 when paper is not found', async () => {
    limitFn.mockResolvedValue({ success: true })
    setupSelectChain(null)

    const res = await GET(makeRequest('paper-1'), { params: { id: 'paper-1' } })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Not found')
  })

  it('returns 200 with a signed URL for a published paper', async () => {
    limitFn.mockResolvedValue({ success: true })
    setupSelectChain({ id: 'paper-1', file_path: 'papers/file.pdf', status: 'published' })
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/file.pdf?token=abc' },
      error: null,
    })
    mockRpc.mockResolvedValue({ error: null })

    const res = await GET(makeRequest('paper-1'), { params: { id: 'paper-1' } })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toBe('https://storage.example.com/file.pdf?token=abc')
  })

  it('returns 500 when signed URL generation fails', async () => {
    limitFn.mockResolvedValue({ success: true })
    setupSelectChain({ id: 'paper-1', file_path: 'papers/file.pdf', status: 'published' })
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: new Error('storage error'),
    })

    const res = await GET(makeRequest('paper-1'), { params: { id: 'paper-1' } })

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/could not generate download url/i)
  })
})
