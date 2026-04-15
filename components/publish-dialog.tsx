'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PublishDialogProps {
  open: boolean
  onClose: () => void
  file: File | null
  teamId: string
  onSuccess: (artifactId: string) => void
}

interface ApiErrorResponse {
  error?: string
  code?: string
}

interface ApiSuccessResponse {
  artifact: { id: string }
}

export function PublishDialog({ open, onClose, file, teamId, onSuccess }: PublishDialogProps) {
  const [title, setTitle] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [tags, setTags] = useState('')
  const [summary, setSummary] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  // Auto-focus title and reset state on open/close
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        titleRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    } else {
      setTitle('')
      setSourceUrl('')
      setTags('')
      setSummary('')
      setShowDetails(false)
      setError(null)
      setIsLoading(false)
    }
  }, [open])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!file || !title.trim() || isLoading) return

      setIsLoading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title.trim())
      if (sourceUrl.trim()) {
        formData.append('sourceUrl', sourceUrl.trim())
      }
      if (tags.trim()) {
        formData.append('tags', tags)
      }
      if (summary.trim()) {
        formData.append('summary', summary.trim())
      }

      try {
        const res = await fetch(`/api/teams/${teamId}/artifacts`, {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const data = (await res.json()) as ApiErrorResponse
          setError(
            data.error ?? `Publish failed (HTTP ${res.status}). Please check your connection and try again.`,
          )
          return
        }

        const data = (await res.json()) as ApiSuccessResponse
        onSuccess(data.artifact.id)
      } catch {
        setError('Network error — please check your connection and try again.')
      } finally {
        setIsLoading(false)
      }
    },
    [file, title, sourceUrl, tags, summary, isLoading, teamId, onSuccess],
  )

  const isSubmitDisabled = !file || !title.trim() || isLoading

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o && !isLoading) onClose() }}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Publish Artifact</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Selected file name */}
          {file && (
            <p className="truncate text-xs text-zinc-500">
              File:{' '}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{file.name}</span>
            </p>
          )}

          {/* Title — auto-focused, required */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="artifact-title"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Title <span aria-hidden="true">*</span>
            </label>
            <input
              id="artifact-title"
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter artifact title"
              required
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-600"
            />
          </div>

          {/* Add details — collapsible optional section */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              aria-expanded={showDetails}
            >
              <ChevronDownIcon
                className={cn('size-3.5 transition-transform', showDetails && 'rotate-180')}
              />
              Add details (optional)
            </button>

            {showDetails && (
              <div className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
                {/* Source URL */}
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="artifact-source-url"
                    className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    Source URL
                  </label>
                  <input
                    id="artifact-source-url"
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://..."
                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-600"
                  />
                </div>

                {/* Tags */}
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="artifact-tags"
                    className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    Tags
                  </label>
                  <input
                    id="artifact-tags"
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. report, q1, marketing"
                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-600"
                  />
                  <p className="text-xs text-zinc-400">Comma-separated. AI enrichment runs if left empty.</p>
                </div>

                {/* Summary */}
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="artifact-summary"
                    className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    Summary
                  </label>
                  <textarea
                    id="artifact-summary"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Brief description of the artifact…"
                    rows={3}
                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Inline error message */}
          {error && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitDisabled}>
              {isLoading ? 'Publishing…' : 'Publish'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
