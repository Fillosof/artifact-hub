import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---

vi.mock('@/lib/auth', () => ({
  resolveAuth: vi.fn(),
  AuthError: class AuthError extends Error {
    body: { error: string; code: string }
    status: number
    constructor(body: { error: string; code: string }, status = 401) {
      super(body.error)
      this.body = body
      this.status = status
      this.name = 'AuthError'
    }
  },
}))

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_c: unknown, _v: unknown) => ({ _c, _v })),
  and: vi.fn((...a: unknown[]) => a),
}))

import { resolveAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { GET } from '@/app/api/artifacts/[artifactId]/route'

const mockResolveAuth = vi.mocked(resolveAuth)
const mockDbSelect = vi.mocked(db.select)

function makeRequest(): Request {
  return new Request('https://example.com/api/artifacts/art-1', { method: 'GET' })
}

function mockSelectWhereLimit(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

function mockSelectWhere(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

const artifactRow = {
  id: 'art-1',
  teamId: 'team-1',
  title: 'Test Artifact',
  fileName: 'test.png',
  fileType: 'image/png',
  sourceUrl: null,
  summary: 'A test summary',
  enrichmentStatus: 'complete',
  createdBy: 'user_abc',
  createdAt: new Date('2026-01-01'),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/artifacts/[artifactId]', () => {
  it('returns 401 when unauthenticated', async () => {
    const { AuthError: AE } = await import('@/lib/auth')
    mockResolveAuth.mockRejectedValueOnce(
      new AE({ error: 'Authentication required', code: 'AUTH_REQUIRED' }),
    )

    const res = await GET(makeRequest(), { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('AUTH_REQUIRED')
  })

  it('returns 404 when artifact does not exist', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_abc', teamIds: ['team-1'] })
    // artifact select returns nothing
    mockSelectWhereLimit([])

    const res = await GET(makeRequest(), { params: Promise.resolve({ artifactId: 'art-missing' }) })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.code).toBe('NOT_FOUND')
  })

  it('returns 403 when caller is not in artifact team', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_xyz', teamIds: ['team-99'] })
    // artifact row found
    mockSelectWhereLimit([artifactRow])
    // team name lookup
    mockSelectWhereLimit([{ name: 'Test Team' }])

    const res = await GET(makeRequest(), { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('TEAM_ACCESS_DENIED')
    expect(body.detail).toBe('Test Team')
  })

  it('returns artifact data with tags when authorized (never includes fileUrl)', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_abc', teamIds: ['team-1'] })
    // artifact row
    mockSelectWhereLimit([artifactRow])
    // tags
    mockSelectWhere([{ tag: 'ai' }, { tag: 'image' }])
    // membership
    mockSelectWhereLimit([{ role: 'member' }])

    const res = await GET(makeRequest(), { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('art-1')
    expect(body.title).toBe('Test Artifact')
    expect(body.tags).toEqual(['ai', 'image'])
    expect(body.userRole).toBe('member')
    // fileUrl must never appear in response
    expect(body).not.toHaveProperty('fileUrl')
  })

  it('returns userRole admin when caller is team admin', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_abc', teamIds: ['team-1'] })
    mockSelectWhereLimit([artifactRow])
    mockSelectWhere([])
    mockSelectWhereLimit([{ role: 'admin' }])

    const res = await GET(makeRequest(), { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.userRole).toBe('admin')
  })
})
