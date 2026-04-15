import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatRelativeTime } from '@/lib/utils'

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" when the timestamp is less than 60 seconds ago', () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)
    expect(formatRelativeTime(now - 30_000)).toBe('just now')
  })

  it('returns "1 minute ago" for exactly 60 seconds ago', () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)
    expect(formatRelativeTime(now - 60_000)).toBe('1 minute ago')
  })

  it('returns "5 minutes ago" for 5 minutes ago', () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)
    expect(formatRelativeTime(now - 5 * 60_000)).toBe('5 minutes ago')
  })

  it('returns "1 hour ago" for exactly 60 minutes ago', () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)
    expect(formatRelativeTime(now - 60 * 60_000)).toBe('1 hour ago')
  })

  it('returns "3 hours ago" for 3 hours ago', () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)
    expect(formatRelativeTime(now - 3 * 60 * 60_000)).toBe('3 hours ago')
  })

  it('returns "1 day ago" for exactly 24 hours ago', () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)
    expect(formatRelativeTime(now - 24 * 60 * 60_000)).toBe('1 day ago')
  })

  it('returns "7 days ago" for a week ago', () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)
    expect(formatRelativeTime(now - 7 * 24 * 60 * 60_000)).toBe('7 days ago')
  })

  it('uses singular "minute" for exactly 1 minute', () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)
    const result = formatRelativeTime(now - 90_000) // 1.5 minutes → 1 minute
    expect(result).toBe('1 minute ago')
  })
})
