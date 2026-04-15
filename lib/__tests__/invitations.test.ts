import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => args),
  eq: vi.fn((_c: unknown, _v: unknown) => ({ _c, _v })),
}))

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'membership-id'),
}))

import { db } from '@/lib/db'
import { findAndAcceptInvitations } from '@/lib/invitations'

const mockDbSelect = vi.mocked(db.select)
const mockDbInsert = vi.mocked(db.insert)
const mockDbUpdate = vi.mocked(db.update)

function mockSelectWhere(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  } as unknown as ReturnType<typeof db.select>)
}

function mockSelectWhereLimit(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  } as unknown as ReturnType<typeof db.select>)
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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('findAndAcceptInvitations', () => {
  it('creates memberships for all pending, non-expired invitations', async () => {
    const now = new Date('2026-04-15T12:00:00.000Z')
    mockSelectWhere([
      {
        id: 'inv_1',
        teamId: 'team_1',
        role: 'member',
        status: 'pending',
        expiresAt: new Date('2026-05-10T00:00:00.000Z'),
      },
      {
        id: 'inv_2',
        teamId: 'team_2',
        role: 'admin',
        status: 'pending',
        expiresAt: new Date('2026-05-10T00:00:00.000Z'),
      },
    ])

    mockSelectWhereLimit([])
    mockInsertValues()
    mockUpdateSetWhere()

    mockSelectWhereLimit([])
    mockInsertValues()
    mockUpdateSetWhere()

    const result = await findAndAcceptInvitations('User@Example.com', 'user_123', now)

    expect(result).toEqual({ acceptedInvitations: 2, skippedInvitations: 0 })
    expect(mockDbInsert).toHaveBeenCalledTimes(2)
    expect(mockDbUpdate).toHaveBeenCalledTimes(2)
  })

  it('skips expired invitations and accepts only valid ones', async () => {
    const now = new Date('2026-04-15T12:00:00.000Z')
    mockSelectWhere([
      {
        id: 'inv_expired',
        teamId: 'team_1',
        role: 'member',
        status: 'pending',
        expiresAt: new Date('2026-04-01T00:00:00.000Z'),
      },
      {
        id: 'inv_valid',
        teamId: 'team_2',
        role: 'member',
        status: 'pending',
        expiresAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    ])

    mockSelectWhereLimit([])
    mockInsertValues()
    mockUpdateSetWhere()

    const result = await findAndAcceptInvitations('user@example.com', 'user_123', now)

    expect(result).toEqual({ acceptedInvitations: 1, skippedInvitations: 1 })
    expect(mockDbInsert).toHaveBeenCalledTimes(1)
    expect(mockDbUpdate).toHaveBeenCalledTimes(1)
  })

  it('skips invitations with status other than pending', async () => {
    const now = new Date('2026-04-15T12:00:00.000Z')
    mockSelectWhere([
      {
        id: 'inv_accepted',
        teamId: 'team_1',
        role: 'member',
        status: 'accepted',
        expiresAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    ])

    const result = await findAndAcceptInvitations('user@example.com', 'user_123', now)

    expect(result).toEqual({ acceptedInvitations: 0, skippedInvitations: 1 })
    expect(mockDbInsert).not.toHaveBeenCalled()
    expect(mockDbUpdate).not.toHaveBeenCalled()
  })
})
