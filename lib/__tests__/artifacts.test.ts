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
  and: vi.fn((...a: unknown[]) => a),
}))

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-nanoid-id'),
}))

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
}))

// We need to mock global fetch for the proxy route
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { resolveAuth, AuthError } from '@/lib/auth'
import { db } from '@/lib/db'
import { put } from '@vercel/blob'

const mockResolveAuth = vi.mocked(resolveAuth)
const mockDbSelect = vi.mocked(db.select)
const mockDbInsert = vi.mocked(db.insert)
const mockDbUpdate = vi.mocked(db.update)
const mockPut = vi.mocked(put)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePostRequest(formData: FormData): Request {
  return new Request('https://example.com/api/teams/team-1/artifacts', {
    method: 'POST',
    body: formData,
  })
}

function makeGetRequest(): Request {
  return new Request('https://example.com/api/files/artifact-1', { method: 'GET' })
}

function makeFile(name: string, content: string, type: string): File {
  return new File([content], name, { type })
}

/** Creates a real file slightly over 10MB so file.size is genuinely > MAX_FILE_SIZE */
function makeOversizedFile(name: string, type: string): File {
  const bytes = new Uint8Array(10 * 1024 * 1024 + 1)
  return new File([bytes], name, { type })
}

/** Helper: mock db.select().from().where().limit() → resolvedValue */
function mockSelectWhereLimit(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

/** Helper: mock db.insert().values() — can be called multiple times for multiple inserts */
function mockInsertValues() {
  mockDbInsert.mockReturnValueOnce({
    values: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof db.insert>)
}

/** Helper: mock db.update().set().where() */
function mockUpdateSetWhere() {
  mockDbUpdate.mockReturnValueOnce({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  } as unknown as ReturnType<typeof db.update>)
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// POST /api/teams/[teamId]/artifacts
// ---------------------------------------------------------------------------

async function importArtifactsRoute() {
  const mod = await import('@/app/api/teams/[teamId]/artifacts/route')
  return mod
}

async function importFilesRoute() {
  const mod = await import('@/app/api/files/[artifactId]/route')
  return mod
}

const artifactsParams = Promise.resolve({ teamId: 'team-1' })
const filesParams = Promise.resolve({ artifactId: 'artifact-1' })

describe('POST /api/teams/[teamId]/artifacts — auth', () => {
  it('returns 401 AUTH_REQUIRED when unauthenticated', async () => {
    mockResolveAuth.mockRejectedValueOnce(
      new AuthError({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401),
    )
    const { POST } = await importArtifactsRoute()
    const fd = new FormData()
    const res = await POST(makePostRequest(fd), { params: artifactsParams })
    expect(res.status).toBe(401)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('AUTH_REQUIRED')
  })

  it('returns 403 TEAM_ACCESS_DENIED when caller not in team', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['other-team'] })
    const { POST } = await importArtifactsRoute()
    const fd = new FormData()
    const res = await POST(makePostRequest(fd), { params: artifactsParams })
    expect(res.status).toBe(403)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('TEAM_ACCESS_DENIED')
  })
})

describe('POST /api/teams/[teamId]/artifacts — validation', () => {
  beforeEach(() => {
    mockResolveAuth.mockResolvedValue({ userId: 'user-1', teamIds: ['team-1'] })
    // membership check
    mockSelectWhereLimit([{ role: 'member' }])
  })

  it('returns 400 VALIDATION_ERROR when file is missing', async () => {
    const { POST } = await importArtifactsRoute()
    const fd = new FormData()
    fd.append('title', 'My Artifact')
    const res = await POST(makePostRequest(fd), { params: artifactsParams })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 VALIDATION_ERROR when title is missing', async () => {
    const { POST } = await importArtifactsRoute()
    const fd = new FormData()
    fd.append('file', makeFile('test.png', 'data', 'image/png'))
    const res = await POST(makePostRequest(fd), { params: artifactsParams })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 FILE_TOO_LARGE when file exceeds 10MB', async () => {
    const { POST } = await importArtifactsRoute()
    const fd = new FormData()
    fd.append('file', makeOversizedFile('big.pdf', 'application/pdf'))
    fd.append('title', 'Big File')
    const res = await POST(makePostRequest(fd), { params: artifactsParams })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('FILE_TOO_LARGE')
    // Ensure put was never called
    expect(mockPut).not.toHaveBeenCalled()
  })
})

describe('POST /api/teams/[teamId]/artifacts — success', () => {
  it('returns 201 with artifact shape (no fileUrl) and fires enrichment fetch', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
    process.env.ENRICH_SECRET = 'test-secret'
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['team-1'] })
    mockSelectWhereLimit([{ role: 'member' }])
    mockPut.mockResolvedValueOnce({
      url: 'https://blob.vercel.com/internal-url',
      pathname: 'artifacts/foo',
      contentType: 'image/png',
      contentDisposition: 'attachment',
      downloadUrl: '',
    } as Awaited<ReturnType<typeof put>>)
    mockInsertValues()
    // fire-and-forget fetch — always resolves so it doesn't block
    mockFetch.mockResolvedValueOnce({ ok: true } as unknown as Response)

    const { POST } = await importArtifactsRoute()
    const fd = new FormData()
    fd.append('file', makeFile('photo.png', 'pngdata', 'image/png'))
    fd.append('title', 'My Photo')
    fd.append('sourceUrl', 'https://tool.example.com')
    const res = await POST(makePostRequest(fd), { params: artifactsParams })
    expect(res.status).toBe(201)
    const body = await res.json() as {
      artifact: Record<string, unknown>
    }
    expect(body.artifact).toBeDefined()
    expect(body.artifact.id).toBe('test-nanoid-id')
    expect(body.artifact.title).toBe('My Photo')
    expect(body.artifact.enrichmentStatus).toBe('pending')
    expect(body.artifact.tags).toEqual([])
    expect(body.artifact.summary).toBeNull()
    // fileUrl must NOT be present
    expect('fileUrl' in body.artifact).toBe(false)
    // fire-and-forget: fetch must have been called with enrich endpoint + secret
    // give it a tick to allow void promise to schedule
    await new Promise((r) => setTimeout(r, 0))
    expect(mockFetch).toHaveBeenCalledWith(
      'https://app.example.com/api/enrich',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Enrich-Secret': 'test-secret' }),
      }),
    )
  })

  it('returns 201 with enrichmentStatus complete when tags+summary provided, skips enrichment fetch', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
    process.env.ENRICH_SECRET = 'test-secret'
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['team-1'] })
    mockSelectWhereLimit([{ role: 'member' }])
    mockPut.mockResolvedValueOnce({
      url: 'https://blob.vercel.com/internal-url',
      pathname: 'artifacts/foo',
      contentType: 'image/png',
      contentDisposition: 'attachment',
      downloadUrl: '',
    } as Awaited<ReturnType<typeof put>>)
    // first insert: artifact row; second insert: artifact_tags
    mockInsertValues()
    mockInsertValues()
    // update: set summary + enrichmentStatus
    mockUpdateSetWhere()

    const { POST } = await importArtifactsRoute()
    const fd = new FormData()
    fd.append('file', makeFile('photo.png', 'pngdata', 'image/png'))
    fd.append('title', 'My Photo')
    fd.append('tags', 'AI,design')
    fd.append('summary', 'An AI-generated image of a design.')
    const res = await POST(makePostRequest(fd), { params: artifactsParams })
    expect(res.status).toBe(201)
    const body = await res.json() as {
      artifact: Record<string, unknown>
    }
    expect(body.artifact.enrichmentStatus).toBe('complete')
    expect(body.artifact.tags).toEqual(['ai', 'design'])
    expect(body.artifact.summary).toBe('An AI-generated image of a design.')
    expect('fileUrl' in body.artifact).toBe(false)
    // enrichment fetch must NOT have been called
    await new Promise((r) => setTimeout(r, 0))
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// GET /api/files/[artifactId]
// ---------------------------------------------------------------------------

describe('GET /api/files/[artifactId] — auth', () => {
  it('returns 401 AUTH_REQUIRED when unauthenticated', async () => {
    mockResolveAuth.mockRejectedValueOnce(
      new AuthError({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401),
    )
    const { GET } = await importFilesRoute()
    const res = await GET(makeGetRequest(), { params: filesParams })
    expect(res.status).toBe(401)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('AUTH_REQUIRED')
  })
})

describe('GET /api/files/[artifactId] — not found', () => {
  it('returns 404 NOT_FOUND when artifact does not exist', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['team-1'] })
    mockSelectWhereLimit([])

    const { GET } = await importFilesRoute()
    const res = await GET(makeGetRequest(), { params: filesParams })
    expect(res.status).toBe(404)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('NOT_FOUND')
  })
})

describe('GET /api/files/[artifactId] — access control', () => {
  it('returns 403 TEAM_ACCESS_DENIED when caller not in artifact team', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['other-team'] })
    mockSelectWhereLimit([{
      id: 'artifact-1',
      teamId: 'team-1',
      fileUrl: 'https://blob.vercel.com/file',
      fileName: 'photo.png',
      fileType: 'image/png',
    }])

    const { GET } = await importFilesRoute()
    const res = await GET(makeGetRequest(), { params: filesParams })
    expect(res.status).toBe(403)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('TEAM_ACCESS_DENIED')
  })
})

describe('GET /api/files/[artifactId] — success', () => {
  it('proxies blob content with correct headers', async () => {
    mockResolveAuth.mockResolvedValueOnce({ userId: 'user-1', teamIds: ['team-1'] })
    mockSelectWhereLimit([{
      id: 'artifact-1',
      teamId: 'team-1',
      fileUrl: 'https://blob.vercel.com/file',
      fileName: 'photo.png',
      fileType: 'image/png',
    }])

    const mockBody = new ReadableStream()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: mockBody,
      status: 200,
    } as unknown as Response)

    const { GET } = await importFilesRoute()
    const res = await GET(makeGetRequest(), { params: filesParams })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
    const contentDisposition = res.headers.get('Content-Disposition') ?? ''
    expect(contentDisposition).toContain('photo.png')
  })
})
