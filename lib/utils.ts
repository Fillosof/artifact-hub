import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Return a human-readable relative time string for a Unix-ms timestamp.
 * e.g. "just now", "5 minutes ago", "2 hours ago", "3 days ago"
 */
export function formatRelativeTime(ms: number): string {
  const diffSecs = Math.floor((Date.now() - ms) / 1000)
  if (diffSecs < 60) return 'just now'
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

/**
 * Normalize an array of tag strings:
 * - lowercase + trim each tag
 * - remove empty strings
 * - deduplicate
 * - cap at 8 (excess dropped)
 */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of tags) {
    const tag = raw.toLowerCase().trim()
    if (tag && !seen.has(tag)) {
      seen.add(tag)
      result.push(tag)
      if (result.length >= 8) break
    }
  }
  return result
}
