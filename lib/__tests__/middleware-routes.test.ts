import { describe, it, expect } from 'vitest'
import { createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

function fakeRequest(pathname: string) {
  return { nextUrl: { pathname } } as unknown as Parameters<typeof isPublicRoute>[0]
}

describe('middleware public route matcher', () => {
  it('matches /sign-in as public', () => {
    expect(isPublicRoute(fakeRequest('/sign-in'))).toBe(true)
  })

  it('matches /sign-in sub-paths as public', () => {
    expect(isPublicRoute(fakeRequest('/sign-in/sso-callback'))).toBe(true)
  })

  it('matches /sign-up as public', () => {
    expect(isPublicRoute(fakeRequest('/sign-up'))).toBe(true)
  })

  it('matches /sign-up sub-paths as public', () => {
    expect(isPublicRoute(fakeRequest('/sign-up/verify-email-address'))).toBe(true)
  })

  it('does NOT match /gallery as public', () => {
    expect(isPublicRoute(fakeRequest('/gallery'))).toBe(false)
  })

  it('does NOT match / (root) as public', () => {
    expect(isPublicRoute(fakeRequest('/'))).toBe(false)
  })

  it('does NOT match /api/teams as public', () => {
    expect(isPublicRoute(fakeRequest('/api/teams'))).toBe(false)
  })
})
