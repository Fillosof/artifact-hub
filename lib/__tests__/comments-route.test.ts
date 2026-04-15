import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---

const mockClerkGetUser = vi.hoisted(() => vi.fn())

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
    insert: vi.fn(),
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_c: unknown, _v: unknown) => ({ _c, _v })),
  asc: vi.fn((_c: unknown) => ({ _c })),
}))

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-comment-id'),
}))

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn().mockResolvedValue({
    users: {
      getUser: mockClerkGetUser,
    },
  }),
}))

import { resolveAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { POST, GET } from '@/app/api/artifacts/[artifactId]/comments/route'

const mockResolveAuth = vi.mocked(resolveAuth)
const mockDbSelect = vi.mocked(db.select)
const mockDbInsert = vi.mocked(db.insert)

function makePostRequest(body: unknown): Request {
  return new Request('https://example.com/api/artifacts/art-1/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeGetRequest(): Request {
  return new Request('https://example.com/api/artifacts/art-1/comments', { method: 'GET' })
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

function mockSelectWhereOrderBy(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(result),
      }),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

function mockInsertValues() {
  mockDbInsert.mockReturnValueOnce({
    values: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof db.insert>)
}

const artifactRow = {
  id: 'art-1',
  teamId: 'team-1',
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// POST /api/artifacts/[artifactId]/comments
// ---------------------------------------------------------------------------
describe('POST /api/artifacts/[artifactId]/comments', () => {
  it('returns 401 when unauthenticated', async () => {
    const { AuthError: AE } = await import('@/lib/auth')
    mockResolveAuth.mockRejectedValueOnce(
      new AE({ error: 'Authentication required', code: 'AUTH_REQUIRED' }),
    )

    const res = await POST(makePostRequest({ content: 'hello' }), {
      params: Promise.resolve({ artifactId: 'art-1' }),
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('AUTH_REQUIRED')
  })

  it('returns 404 when artifact does not exist', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_abc', teamIds: ['team-1'] })
    mockSelectWhereLimit([])

    const res = await POST(makePostRequest({ content: 'hello' }), {
      params: Promise.resolve({ artifactId: 'nonexistent' }),
    })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.code).toBe('NOT_FOUND')
  })

  it('returns 403 when caller is not a member of the artifact team', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_xyz', teamIds: ['team-99'] })
    mockSelectWhereLimit([artifactRow])

    const res = await POST(makePostRequest({ content: 'hello' }), {
      params: Promise.resolve({ artifactId: 'art-1' }),
    })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('TEAM_ACCESS_DENIED')
  })

  it('returns 400 when content is empty string', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_abc', teamIds: ['team-1'] })
    mockSelectWhereLimit([artifactRow])

    const res = await POST(makePostRequest({ content: '' }), {
      params: Promise.resolve({ artifactId: 'art-1' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('VALIDATION_ERROR')
    expect(body.error).toBe('Comment cannot be empty')
  })

  it('returns 400 when content is whitespace only', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_abc', teamIds: ['team-1'] })
    mockSelectWhereLimit([artifactRow])

    const res = await POST(makePostRequest({ content: '   ' }), {
      params: Promise.resolve({ artifactId: 'art-1' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when content field is missing', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_abc', teamIds: ['team-1'] })
    mockSelectWhereLimit([artifactRow])

    const res = await POST(makePostRequest({}), {
      params: Promise.resolve({ artifactId: 'art-1' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('creates a comment and returns 201 with comment data', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_abc', teamIds: ['team-1'] })
    mockSelectWhereLimit([artifactRow])
    mockInsertValues()

    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValueOnce(now)

    const res = await POST(makePostRequest({ content: 'Nice artifact!' }), {
      params: Promise.resolve({ artifactId: 'art-1' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('test-comment-id')
    expect(body.userId).toBe('user_abc')
    expect(body.content).toBe('Nice artifact!')
    expect(typeof body.createdAt).toBe('number')
  })

  it('trims whitespace from content before inserting', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_abc', teamIds: ['team-1'] })
    mockSelectWhereLimit([artifactRow])
    mockInsertValues()

    const res = await POST(makePostRequest({ content: '  Trimmed  ' }), {
      params: Promise.resolve({ artifactId: 'art-1' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.content).toBe('Trimmed')
  })
})

// ---------------------------------------------------------------------------
// GET /api/artifacts/[artifactId]/comments
// ---------------------------------------------------------------------------
describe('GET /api/artifacts/[artifactId]/comments', () => {
  it('returns 401 when unauthenticated', async () => {
    const { AuthError: AE } = await import('@/lib/auth')
    mockResolveAuth.mockRejectedValueOnce(
      new AE({ error: 'Authentication required', code: 'AUTH_REQUIRED' }),
    )

    const res = await GET(makeGetRequest(), {
      params: Promise.resolve({ artifactId: 'art-1' }),
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('AUTH_REQUIRED')
  })

  it('returns 404 when artifact does not exist', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_abc', teamIds: ['team-1'] })
    mockSelectWhereLimit([])

    const res = await GET(makeGetRequest(), {
      params: Promise.resolve({ artifactId: 'nonexistent' }),
    })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.code).toBe('NOT_FOUND')
  })

  it('returns 403 when caller is not in the artifact team', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_xyz', teamIds: ['team-99'] })
    mockSelectWhereLimit([artifactRow])

    const res = await GET(makeGetRequest(), {
      params: Promise.resolve({ artifactId: 'art-1' }),
    })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('TEAM_ACCESS_DENIED')
  })

  it('returns empty array when no comments exist', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_abc', teamIds: ['team-1'] })
    mockSelectWhereLimit([artifactRow])
    mockSelectWhereOrderBy([])

    const res = await GET(makeGetRequest(), {
      params: Promise.resolve({ artifactId: 'art-1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns comments with resolved author names in createdAt ASC order', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_abc', teamIds: ['team-1'] })
    mockSelectWhereLimit([artifactRow])

    const createdAt1 = new Date(1000)
    const createdAt2 = new Date(2000)
    mockSelectWhereOrderBy([
      { id: 'c1', userId: 'user_abc', content: 'First', createdAt: createdAt1 },
      { id: 'c2', userId: 'user_abc', content: 'Second', createdAt: createdAt2 },
    ])

    mockClerkGetUser.mockResolvedValueOnce({
      firstName: 'Alice',
      lastName: 'Smith',
      emailAddresses: [{ emailAddress: 'alice@example.com' }],
    })

    const res = await GET(makeGetRequest(), {
      params: Promise.resolve({ artifactId: 'art-1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
    expect(body[0].id).toBe('c1')
    expect(body[0].content).toBe('First')
    expect(body[0].authorName).toBe('Alice Smith')
    expect(body[0].createdAt).toBe(1000)
    expect(body[1].id).toBe('c2')
    expect(body[1].createdAt).toBe(2000)
  })

  it('falls back to userId when Clerk lookup fails', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_abc', teamIds: ['team-1'] })
    mockSelectWhereLimit([artifactRow])
    mockSelectWhereOrderBy([
      { id: 'c1', userId: 'user_abc', content: 'Hello', createdAt: new Date(1000) },
    ])

    mockClerkGetUser.mockRejectedValueOnce(new Error('Clerk API error'))

    const res = await GET(makeGetRequest(), {
      params: Promise.resolve({ artifactId: 'art-1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body[0].authorName).toBe('user_abc')
  })
})
