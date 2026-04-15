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
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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

const mockResolveAuth = vi.mocked(resolveAuth)
const mockDbSelect = vi.mocked(db.select)
const mockDbInsert = vi.mocked(db.insert)
const mockDbUpdate = vi.mocked(db.update)
const mockDbDelete = vi.mocked(db.delete)

// ---------------------------------------------------------------------------
// DB mock helpers
// ---------------------------------------------------------------------------

/** mock db.select().from().where().limit() → result */
function mockSelectFromWhereLimit(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

/** mock db.select().from().where() → result (no limit) */
function mockSelectFromWhere(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

/** mock db.insert().values() */
function mockInsertValues() {
  mockDbInsert.mockReturnValueOnce({
    values: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof db.insert>)
}

/** mock db.update().set().where() */
function mockUpdateSetWhere() {
  mockDbUpdate.mockReturnValueOnce({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  } as unknown as ReturnType<typeof db.update>)
}

/** mock db.delete().where() */
function mockDeleteWhere() {
  mockDbDelete.mockReturnValueOnce({
    where: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof db.delete>)
}

/** Build a minimal Request for route handlers */
function makeRequest(method: string, body?: unknown): Request {
  const url = 'https://example.com/api/teams/team_1/members'
  if (body !== undefined) {
    return new Request(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
  return new Request(url, { method })
}

/** Params fixture */
const params = Promise.resolve({ teamId: 'team_1' })

beforeEach(() => {
  vi.clearAllMocks()
})

async function importRoute() {
  const mod = await import('@/app/api/teams/[teamId]/members/route')
  return mod
}

// ---------------------------------------------------------------------------
// GET /api/teams/[teamId]/members
// ---------------------------------------------------------------------------

describe('GET /api/teams/[teamId]/members — unauthenticated', () => {
  it('returns 401 AUTH_REQUIRED', async () => {
    mockResolveAuth.mockRejectedValueOnce(
      new AuthError({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401),
    )
    const { GET } = await importRoute()
    const res = await GET(makeRequest('GET'), { params })
    expect(res.status).toBe(401)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('AUTH_REQUIRED')
  })
})

describe('GET /api/teams/[teamId]/members — non-member', () => {
  it('returns 403 TEAM_ACCESS_DENIED when user is not in team', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_other'] })
    const { GET } = await importRoute()
    const res = await GET(makeRequest('GET'), { params })
    expect(res.status).toBe(403)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('TEAM_ACCESS_DENIED')
  })
})

describe('GET /api/teams/[teamId]/members — authenticated member', () => {
  it('returns 200 with members list', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    mockSelectFromWhere([
      { id: 'mem_1', userId: 'user_1', role: 'admin', joinedAt: new Date(1000) },
      { id: 'mem_2', userId: 'user_2', role: 'member', joinedAt: new Date(2000) },
    ])
    const { GET } = await importRoute()
    const res = await GET(makeRequest('GET'), { params })
    expect(res.status).toBe(200)
    const body = await res.json() as { members: { id: string; role: string }[] }
    expect(body.members).toHaveLength(2)
    expect(body.members[0].role).toBe('admin')
    expect(body.members[1].role).toBe('member')
  })
})

// ---------------------------------------------------------------------------
// POST /api/teams/[teamId]/members
// ---------------------------------------------------------------------------

describe('POST /api/teams/[teamId]/members — unauthenticated', () => {
  it('returns 401 AUTH_REQUIRED', async () => {
    mockResolveAuth.mockRejectedValueOnce(
      new AuthError({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401),
    )
    const { POST } = await importRoute()
    const res = await POST(makeRequest('POST', { userId: 'user_2' }), { params })
    expect(res.status).toBe(401)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('AUTH_REQUIRED')
  })
})

describe('POST /api/teams/[teamId]/members — non-admin member', () => {
  it('returns 403 FORBIDDEN', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    // requireAdmin → role: 'member'
    mockSelectFromWhereLimit([{ role: 'member' }])
    const { POST } = await importRoute()
    const res = await POST(makeRequest('POST', { userId: 'user_2' }), { params })
    expect(res.status).toBe(403)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('FORBIDDEN')
  })
})

describe('POST /api/teams/[teamId]/members — validation', () => {
  it('returns 400 VALIDATION_ERROR when userId is missing', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    mockSelectFromWhereLimit([{ role: 'admin' }])
    const { POST } = await importRoute()
    const res = await POST(makeRequest('POST', {}), { params })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 409 CONFLICT when user is already a member', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    // requireAdmin → admin
    mockSelectFromWhereLimit([{ role: 'admin' }])
    // existing membership check → found
    mockSelectFromWhereLimit([{ id: 'mem_existing' }])
    const { POST } = await importRoute()
    const res = await POST(makeRequest('POST', { userId: 'user_2' }), { params })
    expect(res.status).toBe(409)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('CONFLICT')
  })
})

describe('POST /api/teams/[teamId]/members — success', () => {
  it('returns 201 with new member data', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    // requireAdmin → admin
    mockSelectFromWhereLimit([{ role: 'admin' }])
    // existing membership check → not found
    mockSelectFromWhereLimit([])
    // insert
    mockInsertValues()
    const { POST } = await importRoute()
    const res = await POST(makeRequest('POST', { userId: 'user_2', role: 'member' }), { params })
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string; userId: string; role: string }
    expect(body.id).toBe('test-nanoid-id')
    expect(body.userId).toBe('user_2')
    expect(body.role).toBe('member')
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/teams/[teamId]/members
// ---------------------------------------------------------------------------

describe('PATCH /api/teams/[teamId]/members — non-admin', () => {
  it('returns 403 FORBIDDEN', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    mockSelectFromWhereLimit([{ role: 'member' }])
    const { PATCH } = await importRoute()
    const res = await PATCH(makeRequest('PATCH', { userId: 'user_2', role: 'admin' }), { params })
    expect(res.status).toBe(403)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('FORBIDDEN')
  })
})

describe('PATCH /api/teams/[teamId]/members — validation', () => {
  it('returns 400 when userId is missing', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    mockSelectFromWhereLimit([{ role: 'admin' }])
    const { PATCH } = await importRoute()
    const res = await PATCH(makeRequest('PATCH', { role: 'member' }), { params })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when userId is empty string', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    mockSelectFromWhereLimit([{ role: 'admin' }])
    const { PATCH } = await importRoute()
    const res = await PATCH(makeRequest('PATCH', { userId: '   ', role: 'member' }), { params })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when role is invalid', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    mockSelectFromWhereLimit([{ role: 'admin' }])
    const { PATCH } = await importRoute()
    const res = await PATCH(makeRequest('PATCH', { userId: 'user_2', role: 'superuser' }), { params })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 when member not found', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    mockSelectFromWhereLimit([{ role: 'admin' }])
    mockSelectFromWhereLimit([])
    const { PATCH } = await importRoute()
    const res = await PATCH(makeRequest('PATCH', { userId: 'user_ghost', role: 'member' }), { params })
    expect(res.status).toBe(404)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('NOT_FOUND')
  })
})

describe('PATCH /api/teams/[teamId]/members — success', () => {
  it('returns 200 with updated role', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    mockSelectFromWhereLimit([{ role: 'admin' }])
    mockSelectFromWhereLimit([{ id: 'mem_2' }])
    mockUpdateSetWhere()
    const { PATCH } = await importRoute()
    const res = await PATCH(makeRequest('PATCH', { userId: 'user_2', role: 'admin' }), { params })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; role: string }
    expect(body.success).toBe(true)
    expect(body.role).toBe('admin')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/teams/[teamId]/members
// ---------------------------------------------------------------------------

describe('DELETE /api/teams/[teamId]/members — validation', () => {
  it('returns 400 when userId is missing', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    mockSelectFromWhereLimit([{ role: 'admin' }])
    const { DELETE } = await importRoute()
    const res = await DELETE(makeRequest('DELETE', {}), { params })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when userId is empty string', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    mockSelectFromWhereLimit([{ role: 'admin' }])
    const { DELETE } = await importRoute()
    const res = await DELETE(makeRequest('DELETE', { userId: '' }), { params })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION_ERROR')
  })
})

describe('DELETE /api/teams/[teamId]/members — non-admin', () => {
  it('returns 403 FORBIDDEN', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    mockSelectFromWhereLimit([{ role: 'member' }])
    const { DELETE } = await importRoute()
    const res = await DELETE(makeRequest('DELETE', { userId: 'user_2' }), { params })
    expect(res.status).toBe(403)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('FORBIDDEN')
  })
})

describe('DELETE /api/teams/[teamId]/members — member not found', () => {
  it('returns 404 NOT_FOUND', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    mockSelectFromWhereLimit([{ role: 'admin' }])
    mockSelectFromWhereLimit([])
    const { DELETE } = await importRoute()
    const res = await DELETE(makeRequest('DELETE', { userId: 'user_ghost' }), { params })
    expect(res.status).toBe(404)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('NOT_FOUND')
  })
})

describe('DELETE /api/teams/[teamId]/members — success', () => {
  it('returns 200 and removes the member', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: ['team_1'] })
    mockSelectFromWhereLimit([{ role: 'admin' }])
    mockSelectFromWhereLimit([{ id: 'mem_2' }])
    mockDeleteWhere()
    const { DELETE } = await importRoute()
    const res = await DELETE(makeRequest('DELETE', { userId: 'user_2' }), { params })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean }
    expect(body.success).toBe(true)
  })
})

describe('DELETE /api/teams/[teamId]/members — non-member caller', () => {
  it('returns 403 TEAM_ACCESS_DENIED when caller is not in team', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'outsider', teamIds: ['team_other'] })
    const { DELETE } = await importRoute()
    const res = await DELETE(makeRequest('DELETE', { userId: 'user_2' }), { params })
    expect(res.status).toBe(403)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('TEAM_ACCESS_DENIED')
  })
})
