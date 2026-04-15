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
    delete: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/lib/utils', () => ({
  normalizeTags: vi.fn((tags: string[]) =>
    tags
      .map((t) => t.toLowerCase().trim())
      .filter(Boolean)
      .slice(0, 8),
  ),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_c: unknown, _v: unknown) => ({ _c, _v })),
  and: vi.fn((...a: unknown[]) => a),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { resolveAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { PUT as putTags } from '@/app/api/artifacts/[artifactId]/tags/route'
import { PUT as putSummary } from '@/app/api/artifacts/[artifactId]/summary/route'
import { POST as postEnrich } from '@/app/api/artifacts/[artifactId]/enrich/route'

const mockResolveAuth = vi.mocked(resolveAuth)
const mockDbSelect = vi.mocked(db.select)
const mockDbInsert = vi.mocked(db.insert)
const mockDbDelete = vi.mocked(db.delete)
const mockDbUpdate = vi.mocked(db.update)

function mockSelectWhereLimit(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

function mockDeleteWhere() {
  mockDbDelete.mockReturnValueOnce({
    where: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof db.delete>)
}

function mockInsertValues() {
  mockDbInsert.mockReturnValueOnce({
    values: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof db.insert>)
}

function mockUpdateSetWhere() {
  mockDbUpdate.mockReturnValueOnce({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  } as unknown as ReturnType<typeof db.update>)
}

const artifactRow = {
  id: 'art-1',
  teamId: 'team-1',
  createdBy: 'user_owner',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockResolvedValue({ ok: true })
})

// ---------------------------------------------------------------------------
// PUT /api/artifacts/[artifactId]/tags
// ---------------------------------------------------------------------------

describe('PUT /api/artifacts/[artifactId]/tags', () => {
  it('returns 401 when unauthenticated', async () => {
    const { AuthError: AE } = await import('@/lib/auth')
    mockResolveAuth.mockRejectedValueOnce(
      new AE({ error: 'Authentication required', code: 'AUTH_REQUIRED' }),
    )
    const req = new Request('https://x.com', { method: 'PUT', body: JSON.stringify({ tags: [] }) })
    const res = await putTags(req, { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when artifact not found', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_owner', teamIds: ['team-1'] })
    mockSelectWhereLimit([])
    const req = new Request('https://x.com', { method: 'PUT', body: JSON.stringify({ tags: ['ai'] }), headers: { 'Content-Type': 'application/json' } })
    const res = await putTags(req, { params: Promise.resolve({ artifactId: 'art-missing' }) })
    expect(res.status).toBe(404)
  })

  it('returns 403 when caller not in team', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_other', teamIds: ['team-99'] })
    mockSelectWhereLimit([artifactRow])
    const req = new Request('https://x.com', { method: 'PUT', body: JSON.stringify({ tags: ['ai'] }), headers: { 'Content-Type': 'application/json' } })
    const res = await putTags(req, { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('TEAM_ACCESS_DENIED')
  })

  it('returns 403 when caller is regular member (not owner, not admin)', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_member', teamIds: ['team-1'] })
    mockSelectWhereLimit([artifactRow])
    // membership check: role = member
    mockSelectWhereLimit([{ role: 'member' }])
    const req = new Request('https://x.com', { method: 'PUT', body: JSON.stringify({ tags: ['ai'] }), headers: { 'Content-Type': 'application/json' } })
    const res = await putTags(req, { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('FORBIDDEN')
  })

  it('saves tags when caller is owner', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_owner', teamIds: ['team-1'] })
    mockSelectWhereLimit([artifactRow])
    mockDeleteWhere()
    mockInsertValues()
    const req = new Request('https://x.com', { method: 'PUT', body: JSON.stringify({ tags: ['AI', ' machine-learning '] }), headers: { 'Content-Type': 'application/json' } })
    const res = await putTags(req, { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json() as { tags: string[] }
    expect(Array.isArray(body.tags)).toBe(true)
  })

  it('saves tags when caller is team admin', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_admin', teamIds: ['team-1'] })
    mockSelectWhereLimit([artifactRow])
    // role check
    mockSelectWhereLimit([{ role: 'admin' }])
    mockDeleteWhere()
    mockInsertValues()
    const req = new Request('https://x.com', { method: 'PUT', body: JSON.stringify({ tags: ['design'] }), headers: { 'Content-Type': 'application/json' } })
    const res = await putTags(req, { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// PUT /api/artifacts/[artifactId]/summary
// ---------------------------------------------------------------------------

describe('PUT /api/artifacts/[artifactId]/summary', () => {
  it('returns 401 when unauthenticated', async () => {
    const { AuthError: AE } = await import('@/lib/auth')
    mockResolveAuth.mockRejectedValueOnce(
      new AE({ error: 'Authentication required', code: 'AUTH_REQUIRED' }),
    )
    const req = new Request('https://x.com', { method: 'PUT', body: JSON.stringify({ summary: 'new' }), headers: { 'Content-Type': 'application/json' } })
    const res = await putSummary(req, { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not the owner', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_other', teamIds: ['team-1'] })
    mockSelectWhereLimit([artifactRow]) // artifact found
    const req = new Request('https://x.com', { method: 'PUT', body: JSON.stringify({ summary: 'changed' }), headers: { 'Content-Type': 'application/json' } })
    const res = await putSummary(req, { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('FORBIDDEN')
  })

  it('updates summary when caller is owner', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_owner', teamIds: ['team-1'] })
    mockSelectWhereLimit([artifactRow])
    mockUpdateSetWhere()
    const req = new Request('https://x.com', { method: 'PUT', body: JSON.stringify({ summary: 'Updated summary text' }), headers: { 'Content-Type': 'application/json' } })
    const res = await putSummary(req, { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json() as { summary: string }
    expect(body.summary).toBe('Updated summary text')
  })

  it('returns 400 when summary is missing from body', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_owner', teamIds: ['team-1'] })
    mockSelectWhereLimit([artifactRow])
    const req = new Request('https://x.com', { method: 'PUT', body: JSON.stringify({ foo: 'bar' }), headers: { 'Content-Type': 'application/json' } })
    const res = await putSummary(req, { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// POST /api/artifacts/[artifactId]/enrich
// ---------------------------------------------------------------------------

describe('POST /api/artifacts/[artifactId]/enrich', () => {
  it('returns 401 when unauthenticated', async () => {
    const { AuthError: AE } = await import('@/lib/auth')
    mockResolveAuth.mockRejectedValueOnce(
      new AE({ error: 'Authentication required', code: 'AUTH_REQUIRED' }),
    )
    const req = new Request('https://x.com', { method: 'POST' })
    const res = await postEnrich(req, { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not the owner', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_other', teamIds: ['team-1'] })
    mockSelectWhereLimit([artifactRow])
    const req = new Request('https://x.com', { method: 'POST' })
    const res = await postEnrich(req, { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('FORBIDDEN')
  })

  it('triggers enrichment and returns pending status', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user_owner', teamIds: ['team-1'] })
    mockSelectWhereLimit([artifactRow])
    mockDeleteWhere()
    mockUpdateSetWhere()
    mockFetch.mockResolvedValueOnce({ ok: true })

    const req = new Request('https://x.com', { method: 'POST' })
    const res = await postEnrich(req, { params: Promise.resolve({ artifactId: 'art-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json() as { enrichmentStatus: string }
    expect(body.enrichmentStatus).toBe('pending')
  })
})
