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
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_c: unknown, _v: unknown) => ({ _c, _v })),
  isNull: vi.fn((_c: unknown) => ({ _c })),
  and: vi.fn((...a: unknown[]) => a),
}))

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-nanoid-id'),
}))

// Seed stable crypto.randomBytes for predictable key generation
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>()
  return {
    ...actual,
    default: {
      ...actual,
      randomBytes: vi.fn(() => Buffer.alloc(32, 0xab)),
    },
  }
})

import { resolveAuth, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'

const mockResolveAuth = vi.mocked(resolveAuth)
const mockDbSelect = vi.mocked(db.select)
const mockDbInsert = vi.mocked(db.insert)
const mockDbUpdate = vi.mocked(db.update)

/** Build a minimal Request for route handlers */
function makeRequest(method = 'POST'): Request {
  return new Request('https://example.com/api/keys', { method })
}

/** Helper: mock db.select().from().where().limit() → resolvedValue */
function mockSelectLimit(result: unknown[]) {
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

/** Helper: mock db.update().set().where() */
function mockUpdate() {
  mockDbUpdate.mockReturnValueOnce({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  } as unknown as ReturnType<typeof db.update>)
}

beforeEach(() => {
  vi.clearAllMocks()
})

// Dynamically import the route after mocks are set up
async function importRoute() {
  const mod = await import('@/app/api/keys/route')
  return mod
}

describe('POST /api/keys — unauthenticated', () => {
  it('returns 401 AUTH_REQUIRED when resolveAuth throws AuthError', async () => {
    mockResolveAuth.mockRejectedValueOnce(
      new AuthError({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401)
    )
    const { POST } = await importRoute()
    const res = await POST(makeRequest('POST'))
    expect(res.status).toBe(401)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('AUTH_REQUIRED')
  })
})

describe('POST /api/keys — generate (no existing key)', () => {
  it('returns 201 with key, keyId, createdAt', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: [] })
    mockSelectLimit([]) // no existing active key
    mockInsert()

    const { POST } = await importRoute()
    const res = await POST(makeRequest('POST'))
    expect(res.status).toBe(201)

    const body = await res.json() as { key: string; keyId: string; createdAt: string }
    expect(body.key).toMatch(/^ah_/)
    expect(body.keyId).toBe('test-nanoid-id')
    expect(body.createdAt).toBeDefined()
  })
})

describe('POST /api/keys — regenerate (existing active key)', () => {
  it('revokes old key, inserts new key, returns 201', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: [] })
    mockSelectLimit([{ id: 'old-key-id' }]) // existing active key found
    mockUpdate() // revoke old key
    mockInsert() // insert new key

    const { POST } = await importRoute()
    const res = await POST(makeRequest('POST'))
    expect(res.status).toBe(201)

    // Verify update was called (revoke old key)
    expect(mockDbUpdate).toHaveBeenCalledTimes(1)
    // Verify insert was called (new key)
    expect(mockDbInsert).toHaveBeenCalledTimes(1)

    const body = await res.json() as { key: string }
    expect(body.key).toMatch(/^ah_/)
  })
})

describe('DELETE /api/keys — unauthenticated', () => {
  it('returns 401 AUTH_REQUIRED', async () => {
    mockResolveAuth.mockRejectedValueOnce(
      new AuthError({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401)
    )
    const { DELETE } = await importRoute()
    const res = await DELETE(makeRequest('DELETE'))
    expect(res.status).toBe(401)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('AUTH_REQUIRED')
  })
})

describe('DELETE /api/keys — revoke active key', () => {
  it('returns 200 with success: true', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: [] })
    mockSelectLimit([{ id: 'active-key-id' }]) // active key found
    mockUpdate() // set revokedAt

    const { DELETE } = await importRoute()
    const res = await DELETE(makeRequest('DELETE'))
    expect(res.status).toBe(200)

    const body = await res.json() as { success: boolean }
    expect(body.success).toBe(true)
    expect(mockDbUpdate).toHaveBeenCalledTimes(1)
  })
})

describe('DELETE /api/keys — no active key', () => {
  it('returns 404 NOT_FOUND', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_1', teamIds: [] })
    mockSelectLimit([]) // no active key

    const { DELETE } = await importRoute()
    const res = await DELETE(makeRequest('DELETE'))
    expect(res.status).toBe(404)

    const body = await res.json() as { code: string }
    expect(body.code).toBe('NOT_FOUND')
  })
})
