'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function toSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  // Return empty string if no alphanumeric character remains
  return /[a-z0-9]/.test(slug) ? slug : ''
}

export function CreateTeamForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleNameChange(value: string) {
    setName(value)
    if (!slugTouched) {
      setSlug(toSlug(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true)
    setSlug(value)
    setSlugError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSlugError(null)

    if (!name.trim() || !slug.trim()) {
      setError('Team name and slug are required.')
      return
    }

    if (!/[a-z0-9]/i.test(slug)) {
      setSlugError('Slug must contain at least one letter or number.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      })

      const data = await res.json() as {
        team?: { id: string }
        error?: string
        code?: string
      }

      if (!res.ok) {
        if (
          data.code === 'VALIDATION_ERROR' &&
          typeof data.error === 'string' &&
          data.error.toLowerCase().includes('slug')
        ) {
          setSlugError(data.error)
        } else {
          setError(data.error ?? 'Failed to create team. Please try again.')
        }
        return
      }

      if (data.team?.id) {
        router.push(`/teams/${data.team.id}`)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="team-name"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Team Name <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          id="team-name"
          type="text"
          required
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          placeholder="e.g. Acme Engineering"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label
          htmlFor="team-slug"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Team Slug <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          id="team-slug"
          type="text"
          required
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          placeholder="e.g. acme-engineering"
          pattern="[a-z0-9-]+"
          disabled={isSubmitting}
        />
        {slugError ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{slugError}</p>
        ) : (
          <p className="mt-1 text-xs text-zinc-500">
            Lowercase letters, numbers, and hyphens only.
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isSubmitting ? 'Creating…' : 'Create Team'}
      </button>
    </form>
  )
}
