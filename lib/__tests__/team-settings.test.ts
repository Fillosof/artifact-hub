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
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_c: unknown, _v: unknown) => ({ _c, _v })),
  and: vi.fn((...a: unknown[]) => a),
}))

import { resolveAuth, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

const mockResolveAuth = vi.mocked(resolveAuth)
const mockDbSelect = vi.mocked(db.select)
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

/** mock db.update().set().where().returning() → result */
function mockUpdateSetWhereReturning(result: unknown[]) {
  mockDbUpdate.mockReturnValueOnce({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(result),
      }),
    }),
  } as unknown as ReturnType<typeof db.update>)
}

/** mock db.delete().where() → void */
function mockDeleteWhere() {
  mockDbDelete.mockReturnValueOnce({
    where: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof db.delete>)
}

/** Build a minimal Request */
function makeRequest(method: string, body?: unknown): Request {
  const url = 'https://example.com/api/teams/team-123'
  if (body !== undefined) {
    return new Request(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
  return new Request(url, { method })
}

const PARAMS = { params: Promise.resolve({ teamId: 'team-123' }) }

beforeEach(() => {
  vi.clearAllMocks()
})

async function importRoute() {
  const mod = await import('@/app/api/teams/[teamId]/route')
  return mod
}

// ---------------------------------------------------------------------------
// PATCH /api/teams/[teamId]
// ---------------------------------------------------------------------------

describe('PATCH /api/teams/[teamId]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockResolveAuth.mockRejectedValueOnce(
      new AuthError({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401),
    )
    const { PATCH } = await importRoute()
    const res = await PATCH(makeRequest('PATCH', { name: 'New Name' }), PARAMS)
    expect(res.status).toBe(401)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('AUTH_REQUIRED')
  })

  it('returns 404 when user is not a member', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: [] })
    mockSelectFromWhereLimit([]) // no membership row
    const { PATCH } = await importRoute()
    const res = await PATCH(makeRequest('PATCH', { name: 'New Name' }), PARAMS)
    expect(res.status).toBe(404)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('NOT_FOUND')
  })

  it('returns 403 when user is a member but not admin', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['team-123'] })
    mockSelectFromWhereLimit([{ role: 'member' }])
    const { PATCH } = await importRoute()
    const res = await PATCH(makeRequest('PATCH', { name: 'New Name' }), PARAMS)
    expect(res.status).toBe(403)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('FORBIDDEN')
  })

  it('returns 400 when name is missing', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['team-123'] })
    mockSelectFromWhereLimit([{ role: 'admin' }])
    const { PATCH } = await importRoute()
    const res = await PATCH(makeRequest('PATCH', {}), PARAMS)
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when name is empty string', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['team-123'] })
    mockSelectFromWhereLimit([{ role: 'admin' }])
    const { PATCH } = await importRoute()
    const res = await PATCH(makeRequest('PATCH', { name: '   ' }), PARAMS)
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns updated team on success', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['team-123'] })
    mockSelectFromWhereLimit([{ role: 'admin' }])
    mockUpdateSetWhereReturning([{ id: 'team-123', name: 'Updated Name', slug: 'updated-name' }])
    const { PATCH } = await importRoute()
    const res = await PATCH(makeRequest('PATCH', { name: 'Updated Name' }), PARAMS)
    expect(res.status).toBe(200)
    const body = await res.json() as { team: { name: string } }
    expect(body.team.name).toBe('Updated Name')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/teams/[teamId]
// ---------------------------------------------------------------------------

describe('DELETE /api/teams/[teamId]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockResolveAuth.mockRejectedValueOnce(
      new AuthError({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401),
    )
    const { DELETE } = await importRoute()
    const res = await DELETE(makeRequest('DELETE'), PARAMS)
    expect(res.status).toBe(401)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('AUTH_REQUIRED')
  })

  it('returns 404 when user is not a member', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: [] })
    mockSelectFromWhereLimit([]) // no membership row
    const { DELETE } = await importRoute()
    const res = await DELETE(makeRequest('DELETE'), PARAMS)
    expect(res.status).toBe(404)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('NOT_FOUND')
  })

  it('returns 403 (FORBIDDEN) when user is member but not admin', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['team-123'] })
    mockSelectFromWhereLimit([{ role: 'member' }])
    const { DELETE } = await importRoute()
    const res = await DELETE(makeRequest('DELETE'), PARAMS)
    expect(res.status).toBe(403)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('FORBIDDEN')
  })

  it('deletes team and returns success when admin', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['team-123'] })
    mockSelectFromWhereLimit([{ role: 'admin' }])
    mockDeleteWhere()
    const { DELETE } = await importRoute()
    const res = await DELETE(makeRequest('DELETE'), PARAMS)
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean }
    expect(body.success).toBe(true)
  })
})
