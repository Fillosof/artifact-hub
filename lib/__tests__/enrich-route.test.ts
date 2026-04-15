import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/enrichment', () => ({
  enrichArtifact: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { POST } from '@/app/api/enrich/route'
import { enrichArtifact } from '@/lib/enrichment'

const mockEnrichArtifact = vi.mocked(enrichArtifact)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_SECRET = 'test-enrich-secret-hex'

function makeRequest(
  body: unknown,
  overrideSecret?: string | null,
): Request {
  const secret = overrideSecret === undefined ? VALID_SECRET : overrideSecret
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (secret !== null) {
    headers['X-Enrich-Secret'] = secret
  }
  return new Request('https://example.com/api/enrich', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ENRICH_SECRET = VALID_SECRET
})

describe('POST /api/enrich', () => {
  it('returns 401 FORBIDDEN when X-Enrich-Secret header is missing', async () => {
    const req = makeRequest({ artifactId: 'art-1' }, null)
    const res = await POST(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toMatchObject({ code: 'FORBIDDEN' })
  })

  it('returns 401 FORBIDDEN when X-Enrich-Secret header is wrong', async () => {
    const req = makeRequest({ artifactId: 'art-1' }, 'wrong-secret')
    const res = await POST(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toMatchObject({ code: 'FORBIDDEN' })
  })

  it('returns 200 ok when secret is valid and enrichArtifact succeeds', async () => {
    mockEnrichArtifact.mockResolvedValueOnce(undefined)

    const req = makeRequest({ artifactId: 'art-42' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
    expect(mockEnrichArtifact).toHaveBeenCalledWith('art-42')
  })

  it('returns 500 when enrichArtifact throws', async () => {
    mockEnrichArtifact.mockRejectedValueOnce(new Error('Claude is down'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const req = makeRequest({ artifactId: 'art-99' })
    const res = await POST(req)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toMatchObject({ code: 'INTERNAL_ERROR' })
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('returns 400 when body has no artifactId', async () => {
    const req = makeRequest({ notAnArtifactId: 'oops' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toMatchObject({ code: 'VALIDATION_ERROR' })
  })
})
