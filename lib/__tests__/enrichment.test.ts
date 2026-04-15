import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports of the modules under test
// ---------------------------------------------------------------------------

// Hoist mockCreate so it is available inside the vi.mock factory
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }))

vi.mock('@anthropic-ai/sdk', () => ({
  // Must use 'function' (not arrow) so it can be called with 'new'
  default: vi.fn().mockImplementation(function () {
    return { messages: { create: mockCreate } }
  }),
}))

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_c: unknown, _v: unknown) => ({ _c, _v })),
  and: vi.fn((...args: unknown[]) => args),
  inArray: vi.fn((_c: unknown, _v: unknown) => ({ _c, _v })),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { db } from '@/lib/db'
import { enrichArtifact } from '@/lib/enrichment'

// Typed references to mocked db methods
const mockDbSelect = vi.mocked(db.select)
const mockDbUpdate = vi.mocked(db.update)
const mockDbInsert = vi.mocked(db.insert)
const mockDbDelete = vi.mocked(db.delete)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClaudeResponse(text: string) {
  return {
    content: [{ type: 'text', text }],
  }
}

/** Mock db.select().from().where().limit() → result */
function mockSelectLimit(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

/** Mock db.select().from().innerJoin().where() → result (for team tags query) */
function mockSelectInnerJoin(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(result),
      }),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

/** Mock db.update().set().where() → undefined */
function mockUpdateSuccess() {
  mockDbUpdate.mockReturnValueOnce({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  } as unknown as ReturnType<typeof db.update>)
}

/** Mock db.delete().where() → undefined */
function mockDeleteSuccess() {
  mockDbDelete.mockReturnValueOnce({
    where: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof db.delete>)
}

/** Mock db.insert().values() → undefined */
function mockInsertValues() {
  mockDbInsert.mockReturnValueOnce({
    values: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof db.insert>)
}

const ARTIFACT_ID = 'art-001'
const MOCK_ARTIFACT = {
  id: ARTIFACT_ID,
  title: 'My Test Report',
  fileType: 'application/pdf',
  teamId: 'team-001',
  sourceUrl: null,
}
const MOCK_TEAM = { name: 'ACME Team' }

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe('enrichArtifact', () => {
  it('happy path: normalizes tags, upserts artifact_tags, sets enrichmentStatus complete', async () => {
    // Setup DB mocks: artifact, team, team-tags, delete, insert, update
    mockSelectLimit([MOCK_ARTIFACT])
    mockSelectLimit([MOCK_TEAM])
    mockSelectInnerJoin([{ tag: 'existing' }])
    mockDeleteSuccess()
    mockInsertValues()
    mockUpdateSuccess()

    // Claude returns a valid JSON response with tags + summary
    mockCreate.mockResolvedValueOnce(
      makeClaudeResponse(
        JSON.stringify({
          tags: ['  AI  ', 'Report', 'report', 'pdf', 'analysis', 'acme', 'data', 'insights', 'extra-dropped'],
          summary: 'A detailed AI-generated report.',
        }),
      ),
    )

    await enrichArtifact(ARTIFACT_ID)

    // Verify delete was called (upsert step 1)
    expect(mockDbDelete).toHaveBeenCalledOnce()
    // Verify insert was called with normalized, deduped, max-8 tags
    const insertCall = vi.mocked(mockDbInsert.mock.results[0]?.value as { values: ReturnType<typeof vi.fn> }).values
    const insertedValues = insertCall.mock.calls[0]?.[0] as Array<{ artifactId: string; tag: string }>
    expect(insertedValues).toHaveLength(8)
    expect(insertedValues.every((v) => v.tag === v.tag.toLowerCase().trim())).toBe(true)
    // 'report' appears twice → deduplicated
    const tagNames = insertedValues.map((v) => v.tag)
    expect(tagNames.indexOf('report')).toBe(tagNames.lastIndexOf('report'))

    // Verify final update set enrichmentStatus 'complete'
    const updateSetCall = vi.mocked(mockDbUpdate.mock.results[0]?.value as { set: ReturnType<typeof vi.fn> }).set
    expect(updateSetCall).toHaveBeenCalledWith(
      expect.objectContaining({ enrichmentStatus: 'complete' }),
    )
  })

  it('sets enrichmentStatus failed when Claude returns malformed JSON', async () => {
    mockSelectLimit([MOCK_ARTIFACT])
    mockSelectLimit([MOCK_TEAM])
    mockSelectInnerJoin([])
    mockUpdateSuccess() // for the 'failed' update

    mockCreate.mockResolvedValueOnce(makeClaudeResponse('NOT VALID JSON }{'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(enrichArtifact(ARTIFACT_ID)).rejects.toThrow()

    // Should have logged the error
    expect(consoleSpy).toHaveBeenCalled()

    // Update should have been called with enrichmentStatus: 'failed'
    const updateSetCall = vi.mocked(mockDbUpdate.mock.results[0]?.value as { set: ReturnType<typeof vi.fn> }).set
    expect(updateSetCall).toHaveBeenCalledWith({ enrichmentStatus: 'failed' })

    consoleSpy.mockRestore()
  })

  it('sets enrichmentStatus failed when Claude SDK throws', async () => {
    mockSelectLimit([MOCK_ARTIFACT])
    mockSelectLimit([MOCK_TEAM])
    mockSelectInnerJoin([])
    mockUpdateSuccess() // for the 'failed' update

    mockCreate.mockRejectedValueOnce(new Error('Claude API unavailable'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(enrichArtifact(ARTIFACT_ID)).rejects.toThrow('Claude API unavailable')

    expect(consoleSpy).toHaveBeenCalled()

    const updateSetCall = vi.mocked(mockDbUpdate.mock.results[0]?.value as { set: ReturnType<typeof vi.fn> }).set
    expect(updateSetCall).toHaveBeenCalledWith({ enrichmentStatus: 'failed' })

    consoleSpy.mockRestore()
  })

  it('throws when artifact is not found in the database', async () => {
    mockSelectLimit([]) // no artifact found

    await expect(enrichArtifact('nonexistent-id')).rejects.toThrow('Artifact not found')
  })
})
