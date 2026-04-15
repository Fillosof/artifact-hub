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
  eq: vi.fn((_c: unknown, _v: unknown) => ({ eq: true })),
  and: vi.fn((..._a: unknown[]) => ({ and: true })),
  desc: vi.fn((_col: unknown) => ({ desc: true })),
  inArray: vi.fn((_col: unknown, _vals: unknown) => ({ inArray: true })),
  or: vi.fn((..._args: unknown[]) => ({ or: true })),
  like: vi.fn((_col: unknown, _pattern: unknown) => ({ like: true })),
  sql: vi.fn(() => ({ sql: true })),
}))

import { resolveAuth, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

const mockResolveAuth = vi.mocked(resolveAuth)
const mockDbSelect = vi.mocked(db.select)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Mock chain: db.select().from().where().limit() → resolvedValue
 * Used for: membership check
 */
function mockSelectWhereLimit(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

/**
 * Mock chain: db.select().from().where().orderBy().limit() → resolvedValue
 * Used for: artifact listing
 */
function mockSelectWhereOrderByLimit(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

/**
 * Mock chain: db.select().from().where() → resolvedValue
 * Used for: tag fetch
 */
function mockSelectWhere(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

function makeGetRequest(url: string): Request {
  return new Request(url, { method: 'GET' })
}

const routeParams = Promise.resolve({ teamId: 'team-1' })

async function importRoute() {
  const mod = await import('@/app/api/teams/[teamId]/artifacts/route')
  return mod
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// GET /api/teams/[teamId]/artifacts — auth
// ---------------------------------------------------------------------------

describe('GET /api/teams/[teamId]/artifacts — auth', () => {
  it('returns 401 AUTH_REQUIRED when unauthenticated', async () => {
    mockResolveAuth.mockRejectedValueOnce(
      new AuthError({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401),
    )
    const { GET } = await importRoute()
    const res = await GET(makeGetRequest('http://localhost/api/teams/team-1/artifacts'), {
      params: routeParams,
    })
    expect(res.status).toBe(401)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('AUTH_REQUIRED')
  })

  it('returns 403 TEAM_ACCESS_DENIED when caller not in team', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['other-team'] })
    const { GET } = await importRoute()
    const res = await GET(makeGetRequest('http://localhost/api/teams/team-1/artifacts'), {
      params: routeParams,
    })
    expect(res.status).toBe(403)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('TEAM_ACCESS_DENIED')
  })

  it('returns 404 NOT_FOUND when team membership row missing', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['team-1'] })
    mockSelectWhereLimit([]) // membership check → not found
    const { GET } = await importRoute()
    const res = await GET(makeGetRequest('http://localhost/api/teams/team-1/artifacts'), {
      params: routeParams,
    })
    expect(res.status).toBe(404)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('NOT_FOUND')
  })
})

// ---------------------------------------------------------------------------
// GET /api/teams/[teamId]/artifacts — success
// ---------------------------------------------------------------------------

describe('GET /api/teams/[teamId]/artifacts — success', () => {
  beforeEach(() => {
    mockResolveAuth.mockResolvedValue({ userId: 'user-1', teamIds: ['team-1'] })
  })

  it('returns 200 with artifact list and never exposes fileUrl', async () => {
    const artifactRow = {
      id: 'art-1',
      title: 'My Artifact',
      fileType: 'application/pdf',
      enrichmentStatus: 'complete',
      summary: 'A test summary',
      createdAt: new Date('2026-01-01T10:00:00Z'),
      createdBy: 'user-1',
    }

    mockSelectWhereLimit([{ role: 'member' }])
    mockSelectWhereOrderByLimit([artifactRow])
    mockSelectWhere([{ artifactId: 'art-1', tag: 'ai' }])

    const { GET } = await importRoute()
    const res = await GET(makeGetRequest('http://localhost/api/teams/team-1/artifacts'), {
      params: routeParams,
    })

    expect(res.status).toBe(200)
    const body = await res.json() as {
      artifacts: Array<{
        id: string
        fileUrl?: string
        proxyUrl: string
        tags: string[]
        enrichmentStatus: string
      }>
    }
    expect(Array.isArray(body.artifacts)).toBe(true)
    expect(body.artifacts).toHaveLength(1)

    const art = body.artifacts[0]
    expect(art.id).toBe('art-1')
    // Security: fileUrl must NEVER appear in the response
    expect(art.fileUrl).toBeUndefined()
    // proxyUrl must be the authenticated proxy route
    expect(art.proxyUrl).toBe('/api/files/art-1')
    expect(art.tags).toEqual(['ai'])
    expect(art.enrichmentStatus).toBe('complete')
  })

  it('returns 200 with empty array when no artifacts', async () => {
    mockSelectWhereLimit([{ role: 'member' }])
    mockSelectWhereOrderByLimit([])

    const { GET } = await importRoute()
    const res = await GET(makeGetRequest('http://localhost/api/teams/team-1/artifacts'), {
      params: routeParams,
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { artifacts: unknown[] }
    expect(body.artifacts).toHaveLength(0)
  })

  it('returns 200 with empty tags array when artifact has no tags', async () => {
    const artifactRow = {
      id: 'art-2',
      title: 'Untagged',
      fileType: 'image/png',
      enrichmentStatus: 'pending',
      summary: null,
      createdAt: new Date(),
      createdBy: 'user-1',
    }

    mockSelectWhereLimit([{ role: 'member' }])
    mockSelectWhereOrderByLimit([artifactRow])
    mockSelectWhere([]) // no tags

    const { GET } = await importRoute()
    const res = await GET(makeGetRequest('http://localhost/api/teams/team-1/artifacts'), {
      params: routeParams,
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { artifacts: Array<{ tags: string[] }> }
    expect(body.artifacts[0].tags).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// GET /api/teams/[teamId]/artifacts — query param filters
// ---------------------------------------------------------------------------

describe('GET /api/teams/[teamId]/artifacts — filters and search', () => {
  beforeEach(() => {
    mockResolveAuth.mockResolvedValue({ userId: 'user-1', teamIds: ['team-1'] })
  })

  it('handles ?q= search param — returns 200', async () => {
    mockSelectWhereLimit([{ role: 'member' }])
    mockSelectWhereOrderByLimit([])

    const { GET } = await importRoute()
    const res = await GET(
      makeGetRequest('http://localhost/api/teams/team-1/artifacts?q=keyword'),
      { params: routeParams },
    )

    expect(res.status).toBe(200)
    const body = await res.json() as { artifacts: unknown[] }
    expect(Array.isArray(body.artifacts)).toBe(true)
  })

  it('handles ?tag= filter param — returns 200', async () => {
    mockSelectWhereLimit([{ role: 'member' }])
    mockSelectWhereOrderByLimit([])

    const { GET } = await importRoute()
    const res = await GET(
      makeGetRequest('http://localhost/api/teams/team-1/artifacts?tag=ai'),
      { params: routeParams },
    )

    expect(res.status).toBe(200)
    const body = await res.json() as { artifacts: unknown[] }
    expect(Array.isArray(body.artifacts)).toBe(true)
  })

  it('handles ?fileType= filter param — returns 200', async () => {
    mockSelectWhereLimit([{ role: 'member' }])
    mockSelectWhereOrderByLimit([])

    const { GET } = await importRoute()
    const res = await GET(
      makeGetRequest('http://localhost/api/teams/team-1/artifacts?fileType=application%2Fpdf'),
      { params: routeParams },
    )

    expect(res.status).toBe(200)
    const body = await res.json() as { artifacts: unknown[] }
    expect(Array.isArray(body.artifacts)).toBe(true)
  })

  it('handles combined filters — returns 200', async () => {
    mockSelectWhereLimit([{ role: 'member' }])
    mockSelectWhereOrderByLimit([])

    const { GET } = await importRoute()
    const res = await GET(
      makeGetRequest('http://localhost/api/teams/team-1/artifacts?q=test&tag=ai&fileType=application%2Fpdf'),
      { params: routeParams },
    )

    expect(res.status).toBe(200)
  })
})
