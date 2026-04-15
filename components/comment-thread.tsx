'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/utils'

interface CommentData {
  id: string
  userId: string
  authorName: string
  content: string
  createdAt: number
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function CommentItem({ comment }: { comment: CommentData }) {
  const initials = getInitials(comment.authorName)
  return (
    <article className="flex gap-3 py-3">
      <div
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {comment.authorName}
          </span>
          <time
            dateTime={new Date(comment.createdAt).toISOString()}
            className="text-xs text-zinc-500 dark:text-zinc-400"
          >
            {formatRelativeTime(comment.createdAt)}
          </time>
        </div>
        <p className="mt-0.5 break-words text-sm text-zinc-700 dark:text-zinc-300">
          {comment.content}
        </p>
      </div>
    </article>
  )
}

function CommentInput({
  artifactId,
  onAdded,
}: {
  artifactId: string
  onAdded: () => void
}) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(
    (e: React.FormEvent): void => {
      e.preventDefault()
      const trimmed = text.trim()
      if (!trimmed || loading) return
      setLoading(true)
      setError(null)
      void (async () => {
        try {
          const res = await fetch(`/api/artifacts/${artifactId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: trimmed }),
          })
          if (res.ok) {
            onAdded()
            setText('')
          } else {
            const data = (await res.json()) as { error?: string }
            setError(
              data.error ??
                `Failed to post comment (HTTP ${res.status}). Please try again.`,
            )
          }
        } catch {
          setError('Network error — please check your connection and try again.')
        } finally {
          setLoading(false)
        }
      })()
    },
    [artifactId, loading, onAdded, text],
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="comment-input" className="sr-only">
        Add a comment
      </label>
      <textarea
        id="comment-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share your feedback…"
        rows={3}
        className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
      />
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading || !text.trim()} className="w-full">
        {loading ? (
          <span className="flex items-center gap-2">
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            <span>Posting…</span>
          </span>
        ) : (
          'Add Comment'
        )}
      </Button>
    </form>
  )
}

export function ContextualCommentThread({ artifactId }: { artifactId: string }) {
  const [comments, setComments] = useState<CommentData[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const fetchComments = useCallback(async (): Promise<void> => {
    const res = await fetch(`/api/artifacts/${artifactId}/comments`)
    if (res.ok) {
      const data = (await res.json()) as CommentData[]
      setComments(data)
    }
  }, [artifactId])

  useEffect(() => {
    setLoading(true)
    void (async () => {
      try {
        await fetchComments()
      } finally {
        setLoading(false)
      }
    })()
  }, [fetchComments])

  useEffect(() => {
    if (toast === null) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const handleAdded = useCallback((): void => {
    void fetchComments()
    setToast('Comment Added')
  }, [fetchComments])

  return (
    <section aria-label="Comments">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Comments
      </h2>

      {toast !== null && (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          {toast}
        </div>
      )}

      <div className="flex flex-col rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="max-h-[32rem] overflow-y-auto px-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Loading comments…
            </div>
          ) : comments.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No comments yet. Be the first to share feedback.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {comments.map((c) => (
                <li key={c.id}>
                  <CommentItem comment={c} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
          <CommentInput artifactId={artifactId} onAdded={handleAdded} />
        </div>
      </div>
    </section>
  )
}
