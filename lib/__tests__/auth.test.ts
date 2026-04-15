import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'node:crypto'

// Mock @clerk/nextjs/server before importing resolveAuth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

// Mock @/lib/db
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

// Mock drizzle-orm operators (they are pure functions — no-op in tests is fine)
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ _col, _val })),
  isNull: vi.fn((_col: unknown) => ({ _col })),
  and: vi.fn((...args: unknown[]) => args),
}))

import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { resolveAuth, AuthError } from '@/lib/auth'

const mockAuth = vi.mocked(auth)
const mockSelect = vi.mocked(db.select)

/** Helper to build a Request with optional Authorization header */
function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = {}
  if (authHeader) headers['Authorization'] = authHeader
  return new Request('https://example.com/api/test', { headers })
}

/** Helper to mock a single db.select() call ending with .where() */
function mockDbSelectWhere(resolvedValue: unknown[]) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(resolvedValue),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

/** Helper to mock a single db.select() call ending with .where().limit() */
function mockDbSelectWhereLimit(resolvedValue: unknown[]) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(resolvedValue),
      }),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveAuth — Clerk session path', () => {
  it('returns userId and teamIds when Clerk session is valid', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_clerk_123' } as Awaited<ReturnType<typeof auth>>)
    mockDbSelectWhere([{ teamId: 'team_a' }, { teamId: 'team_b' }])

    const result = await resolveAuth(makeRequest())

    expect(result).toEqual({ userId: 'user_clerk_123', teamIds: ['team_a', 'team_b'] })
  })

  it('returns empty teamIds when user belongs to no teams', async () => {
    mockAuth.mockResolvedValueOnce({ userId: 'user_clerk_no_teams' } as Awaited<ReturnType<typeof auth>>)
    mockDbSelectWhere([])

    const result = await resolveAuth(makeRequest())

    expect(result).toEqual({ userId: 'user_clerk_no_teams', teamIds: [] })
  })
})

describe('resolveAuth — API key Bearer token path', () => {
  const rawKey = 'my-raw-api-key'
  const expectedHash = crypto.createHash('sha256').update(rawKey).digest('hex')

  it('returns userId and teamIds when Bearer key is valid and not revoked', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>)

    const fakeKeyRow = {
      id: 'k1',
      userId: 'user_api_456',
      keyHash: expectedHash,
      createdAt: new Date(),
      revokedAt: null,
    }
    mockDbSelectWhereLimit([fakeKeyRow])
    mockDbSelectWhere([{ teamId: 'team_x' }])

    const result = await resolveAuth(makeRequest(`Bearer ${rawKey}`))

    expect(result).toEqual({ userId: 'user_api_456', teamIds: ['team_x'] })
  })

  it('throws AuthError when Bearer key does not match any row (invalid key)', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>)
    mockDbSelectWhereLimit([]) // no matching key

    await expect(resolveAuth(makeRequest('Bearer invalid-key'))).rejects.toThrow(AuthError)
  })

  it('throws AuthError with AUTH_REQUIRED code when key is not found', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>)
    mockDbSelectWhereLimit([])

    const err = await resolveAuth(makeRequest('Bearer unknown-key')).catch((e: unknown) => e)

    expect(err).toBeInstanceOf(AuthError)
    expect((err as AuthError).body.code).toBe('AUTH_REQUIRED')
    expect((err as AuthError).status).toBe(401)
  })
})

describe('resolveAuth — no valid auth', () => {
  it('throws AuthError when there is no Clerk session and no Authorization header', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>)

    await expect(resolveAuth(makeRequest())).rejects.toThrow(AuthError)
  })

  it('throws AuthError with AUTH_REQUIRED code and 401 status', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>)

    const err = await resolveAuth(makeRequest()).catch((e: unknown) => e)

    expect(err).toBeInstanceOf(AuthError)
    expect((err as AuthError).body).toEqual({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    })
    expect((err as AuthError).status).toBe(401)
    expect((err as AuthError).message).toBe('Authentication required')
  })

  it('throws AuthError when Authorization header has wrong format (non-Bearer)', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>)

    await expect(resolveAuth(makeRequest('Basic dXNlcjpwYXNz'))).rejects.toThrow(AuthError)
  })
})

describe('AuthError class', () => {
  it('has correct name, message, body, and status', () => {
    const err = new AuthError({ error: 'Authentication required', code: 'AUTH_REQUIRED' })

    expect(err.name).toBe('AuthError')
    expect(err.message).toBe('Authentication required')
    expect(err.body).toEqual({ error: 'Authentication required', code: 'AUTH_REQUIRED' })
    expect(err.status).toBe(401)
  })

  it('uses custom status when provided', () => {
    const err = new AuthError({ error: 'Forbidden', code: 'FORBIDDEN' }, 403)

    expect(err.status).toBe(403)
    expect(err.body.code).toBe('FORBIDDEN')
  })
})
