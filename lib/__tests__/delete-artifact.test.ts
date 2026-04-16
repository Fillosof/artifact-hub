import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks (must be before imports that use them) ---

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
    delete: vi.fn(),
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_c: unknown, _v: unknown) => ({ _c, _v })),
  and: vi.fn((...a: unknown[]) => a),
}))

import { resolveAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { DELETE } from '@/app/api/artifacts/[artifactId]/route'

const mockResolveAuth = vi.mocked(resolveAuth)
const mockDbSelect = vi.mocked(db.select)
const mockDbDelete = vi.mocked(db.delete)

function makeRequest(): Request {
  return new Request('https://example.com/api/artifacts/art-1', { method: 'DELETE' })
}

/** Mock a select().from().where().limit() chain returning `result` */
function mockSelectWhereLimit(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

/** Mock a delete().where() chain */
function mockDeleteWhere() {
  mockDbDelete.mockReturnValueOnce({
    where: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof db.delete>)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DELETE /api/artifacts/[artifactId]', () => {
  it('returns 401 when unauthenticated', async () => {
    const { AuthError: AE } = await import('@/lib/auth')
    mockResolveAuth.mockRejectedValueOnce(
      new AE({ error: 'Authentication required', code: 'AUTH_REQUIRED' }),
    )

    const res = await DELETE(makeRequest(), { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('AUTH_REQUIRED')
  })

  it('returns 404 when artifact does not exist', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['team-1'] })
    // Artifact lookup returns empty
    mockSelectWhereLimit([])

    const res = await DELETE(makeRequest(), { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.code).toBe('NOT_FOUND')
  })

  it('returns 403 when caller is not a member of the artifact team', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['other-team'] })
    // Artifact belongs to 'team-1' but caller is in 'other-team'
    mockSelectWhereLimit([{ id: 'art-1', teamId: 'team-1' }])

    const res = await DELETE(makeRequest(), { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('FORBIDDEN')
    expect(body.error).toBe('Only team admins can delete artifacts')
  })

  it('returns 403 when caller is a member but not admin and not the creator', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['team-1'] })
    // Artifact lookup — createdBy is a different user
    mockSelectWhereLimit([{ id: 'art-1', teamId: 'team-1', createdBy: 'other-user' }])
    // Membership lookup — role is member
    mockSelectWhereLimit([{ role: 'member' }])

    const res = await DELETE(makeRequest(), { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('FORBIDDEN')
    expect(body.error).toBe('Only team admins or the artifact creator can delete artifacts')
  })

  it('returns 403 when membership row is missing entirely', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['team-1'] })
    mockSelectWhereLimit([{ id: 'art-1', teamId: 'team-1' }])
    // No membership row
    mockSelectWhereLimit([])

    const res = await DELETE(makeRequest(), { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('FORBIDDEN')
  })

  it('deletes artifact and returns { success: true } for admin', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-admin', teamIds: ['team-1'] })
    // Artifact lookup
    mockSelectWhereLimit([{ id: 'art-1', teamId: 'team-1' }])
    // Membership lookup — role is admin
    mockSelectWhereLimit([{ role: 'admin' }])
    // Delete
    mockDeleteWhere()

    const res = await DELETE(makeRequest(), { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ success: true })
    expect(mockDbDelete).toHaveBeenCalledTimes(1)
  })
})
