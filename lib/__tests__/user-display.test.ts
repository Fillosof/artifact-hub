import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.hoisted(() => vi.fn())

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn().mockResolvedValue({
    users: {
      getUser: mockGetUser,
    },
  }),
}))

import { getUserDisplayName } from '@/lib/user-display'

describe('getUserDisplayName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns full name when first and last names are present', async () => {
    mockGetUser.mockResolvedValueOnce({
      firstName: 'Yurii',
      lastName: 'Krot',
      emailAddresses: [{ emailAddress: 'yurii@example.com' }],
    })

    await expect(getUserDisplayName('user_1')).resolves.toBe('Yurii Krot')
  })

  it('falls back to email when name is missing', async () => {
    mockGetUser.mockResolvedValueOnce({
      firstName: null,
      lastName: null,
      emailAddresses: [{ emailAddress: 'fallback@example.com' }],
    })

    await expect(getUserDisplayName('user_2')).resolves.toBe('fallback@example.com')
  })

  it('falls back to userId when Clerk lookup fails', async () => {
    mockGetUser.mockRejectedValueOnce(new Error('clerk unavailable'))

    await expect(getUserDisplayName('user_3')).resolves.toBe('user_3')
  })
})
