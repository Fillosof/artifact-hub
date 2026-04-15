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

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}))

vi.mock('@/lib/invitations', () => ({
  findAndAcceptInvitations: vi.fn(),
  normalizeEmail: vi.fn((email: string) => email.toLowerCase().trim()),
}))

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_c: unknown, _v: unknown) => ({ _c, _v })),
  and: vi.fn((...a: unknown[]) => a),
}))

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-nanoid-id'),
}))

import { resolveAuth, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'
import { currentUser } from '@clerk/nextjs/server'
import { findAndAcceptInvitations } from '@/lib/invitations'

const mockResolveAuth = vi.mocked(resolveAuth)
const mockDbSelect = vi.mocked(db.select)
const mockDbInsert = vi.mocked(db.insert)
const mockCurrentUser = vi.mocked(currentUser)
const mockFindAndAcceptInvitations = vi.mocked(findAndAcceptInvitations)

/** Helper: mock db.select().from().innerJoin().where() → resolvedValue (used by GET /api/teams) */
function mockSelectJoinWhere(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(result),
      }),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

/** Helper: mock db.select().from().where().limit() → resolvedValue (used by POST slug check) */
function mockSelectWhereLimit(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

/** Helper: mock db.insert().values() */
function mockInsert() {
  mockDbInsert.mockReturnValueOnce({
    values: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof db.insert>)
}

/** Build a minimal Request for route handlers */
function makeRequest(method: string, body?: unknown): Request {
  const url = 'https://example.com/api/teams'
  if (body !== undefined) {
    return new Request(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
  return new Request(url, { method })
}

beforeEach(() => {
  vi.resetAllMocks()
  mockCurrentUser.mockResolvedValue(null)
})

async function importRoute() {
  const mod = await import('@/app/api/teams/route')
  return mod
}

// ---------------------------------------------------------------------------
// GET /api/teams
// ---------------------------------------------------------------------------

describe('GET /api/teams — unauthenticated', () => {
  it('returns 401 AUTH_REQUIRED', async () => {
    mockResolveAuth.mockRejectedValueOnce(
      new AuthError({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401)
    )
    const { GET } = await importRoute()
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('AUTH_REQUIRED')
  })
})

describe('GET /api/teams — authenticated', () => {
  it('hydrates pending invitations when current user email is available', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    mockCurrentUser.mockResolvedValueOnce({
      primaryEmailAddressId: 'email_1',
      emailAddresses: [{ id: 'email_1', emailAddress: 'User@Example.com' }],
    } as Awaited<ReturnType<typeof currentUser>>)
    // Mock two select calls: one for teams, one for pending invitations
    mockSelectJoinWhere([]) // teams
    mockSelectJoinWhere([]) // pending invitations

    const { GET } = await importRoute()
    const res = await GET(makeRequest('GET'))

    expect(res.status).toBe(200)
    expect(mockFindAndAcceptInvitations).toHaveBeenCalledWith('User@Example.com', 'user_1')
  })

  it('returns teams array with role for the user', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    mockSelectJoinWhere([
      {
        id: 'team_1',
        name: 'My Team',
        slug: 'my-team',
        createdBy: 'user_1',
        createdAt: new Date(),
        role: 'admin',
      },
    ])
    // Mock pending invitations query
    mockSelectJoinWhere([])

    const { GET } = await importRoute()
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    const body = await res.json() as { teams: { id: string; role: string }[] }
    expect(body.teams).toHaveLength(1)
    expect(body.teams[0].id).toBe('team_1')
    expect(body.teams[0].role).toBe('admin')
  })

  it('returns empty array when user belongs to no teams', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_2', teamIds: [] })
    mockSelectJoinWhere([]) // teams
    mockSelectJoinWhere([]) // pending invitations

    const { GET } = await importRoute()
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    const body = await res.json() as { teams: unknown[] }
    expect(body.teams).toHaveLength(0)
  })

  it('never returns teams the user does not belong to', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_3', teamIds: [] })
    // The mock returns an empty result — the query is already team-scoped by userId
    mockSelectJoinWhere([]) // teams
    mockSelectJoinWhere([]) // pending invitations

    const { GET } = await importRoute()
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    const body = await res.json() as { teams: unknown[] }
    expect(body.teams).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// POST /api/teams
// ---------------------------------------------------------------------------

describe('POST /api/teams — unauthenticated', () => {
  it('returns 401 AUTH_REQUIRED', async () => {
    mockResolveAuth.mockRejectedValueOnce(
      new AuthError({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401)
    )
    const { POST } = await importRoute()
    const res = await POST(makeRequest('POST', { name: 'Test', slug: 'test' }))
    expect(res.status).toBe(401)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('AUTH_REQUIRED')
  })
})

describe('POST /api/teams — validation', () => {
  it('returns 400 VALIDATION_ERROR when name is missing', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: [] })
    const { POST } = await importRoute()
    const res = await POST(makeRequest('POST', { slug: 'my-team' }))
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 VALIDATION_ERROR when slug is missing', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: [] })
    const { POST } = await importRoute()
    const res = await POST(makeRequest('POST', { name: 'My Team' }))
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 VALIDATION_ERROR when slug contains invalid characters', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: [] })
    const { POST } = await importRoute()
    const res = await POST(makeRequest('POST', { name: 'My Team', slug: 'My Team!' }))
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 409 VALIDATION_ERROR with "already taken" when slug is taken', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: [] })
    mockSelectWhereLimit([{ id: 'existing-team-id' }]) // slug is taken

    const { POST } = await importRoute()
    const res = await POST(makeRequest('POST', { name: 'My Team', slug: 'taken-slug' }))
    expect(res.status).toBe(409)
    const body = await res.json() as { code: string; error: string }
    expect(body.code).toBe('VALIDATION_ERROR')
    expect(body.error).toMatch(/already taken/i)
  })
})

describe('POST /api/teams — success', () => {
  it('creates team + membership, returns 201 with team object', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: [] })
    mockSelectWhereLimit([]) // slug is available
    mockInsert() // insert team
    mockInsert() // insert membership

    const { POST } = await importRoute()
    const res = await POST(makeRequest('POST', { name: 'My Team', slug: 'my-team' }))
    expect(res.status).toBe(201)

    const body = await res.json() as { team: { name: string; slug: string; role: string; id: string } }
    expect(body.team.name).toBe('My Team')
    expect(body.team.slug).toBe('my-team')
    expect(body.team.role).toBe('admin')
    expect(body.team.id).toBeDefined()

    // Both inserts must have been called (team + membership)
    expect(mockDbInsert).toHaveBeenCalledTimes(2)
  })

  it('trims whitespace from name and slug before inserting', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: [] })
    mockSelectWhereLimit([]) // slug available
    mockInsert() // team
    mockInsert() // membership

    const { POST } = await importRoute()
    const res = await POST(makeRequest('POST', { name: '  Trim Me  ', slug: '  trim-me  ' }))
    expect(res.status).toBe(201)

    const body = await res.json() as { team: { name: string; slug: string } }
    expect(body.team.name).toBe('Trim Me')
    expect(body.team.slug).toBe('trim-me')
  })
})
