'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface GalleryFiltersProps {
  teams: Array<{ id: string; name: string }>
  availableTags: string[]
  availableFileTypes: string[]
}

const selectClass =
  'w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'

const labelClass = 'mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400'

function GalleryFiltersInner({ teams, availableTags, availableFileTypes }: GalleryFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentTeamId = searchParams.get('teamId') ?? ''
  const currentTag = searchParams.get('tag') ?? ''
  const currentFileType = searchParams.get('fileType') ?? ''
  const currentQ = searchParams.get('q') ?? ''
  const hasAnyFilter = Boolean(currentTeamId || currentTag || currentFileType || currentQ)

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.replace(`/gallery?${params.toString()}`)
  }

  function clearAll() {
    router.replace('/gallery')
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Team filter — only shown when user belongs to multiple teams */}
      {teams.length > 1 && (
        <div>
          <label htmlFor="filter-team" className={labelClass}>
            Team
          </label>
          <select
            id="filter-team"
            value={currentTeamId}
            onChange={(e) => updateParam('teamId', e.target.value)}
            className={selectClass}
          >
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tag filter */}
      {availableTags.length > 0 && (
        <div>
          <label htmlFor="filter-tag" className={labelClass}>
            Tag
          </label>
          <select
            id="filter-tag"
            value={currentTag}
            onChange={(e) => updateParam('tag', e.target.value)}
            className={selectClass}
          >
            <option value="">All tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* File type filter */}
      {availableFileTypes.length > 0 && (
        <div>
          <label htmlFor="filter-filetype" className={labelClass}>
            File type
          </label>
          <select
            id="filter-filetype"
            value={currentFileType}
            onChange={(e) => updateParam('fileType', e.target.value)}
            className={selectClass}
          >
            <option value="">All types</option>
            {availableFileTypes.map((ft) => (
              <option key={ft} value={ft}>
                {ft.split('/').pop() ?? ft}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Clear all filters */}
      {hasAnyFilter && (
        <button
          onClick={clearAll}
          className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}

export function GalleryFilters(props: GalleryFiltersProps) {
  return (
    <Suspense fallback={null}>
      <GalleryFiltersInner {...props} />
    </Suspense>
  )
}
