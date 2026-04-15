'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useRef } from 'react'

function GallerySearchInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = inputRef.current?.value.trim() ?? ''
    const params = new URLSearchParams(searchParams.toString())
    if (q) {
      params.set('q', q)
    } else {
      params.delete('q')
    }
    router.replace(`/gallery?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} role="search">
      <label htmlFor="gallery-search" className="sr-only">
        Search artifacts
      </label>
      <div className="flex gap-1">
        <input
          ref={inputRef}
          id="gallery-search"
          type="search"
          defaultValue={searchParams.get('q') ?? ''}
          placeholder="Search artifacts…"
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="submit"
          className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Submit search"
        >
          ↵
        </button>
      </div>
    </form>
  )
}

export function GallerySearch() {
  return (
    <Suspense fallback={<div className="h-9 w-full rounded-md bg-zinc-100 dark:bg-zinc-800" aria-hidden />}>
      <GallerySearchInner />
    </Suspense>
  )
}
