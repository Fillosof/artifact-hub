'use client'

import { useState } from 'react'
import { Pencil, Check, XIcon, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface SummaryEditorProps {
  artifactId: string
  initialSummary: string | null
  initialEnrichmentStatus: 'pending' | 'complete' | 'failed'
  isOwner: boolean
}

export function SummaryEditor({
  artifactId,
  initialSummary,
  initialEnrichmentStatus,
  isOwner,
}: SummaryEditorProps) {
  const [summary, setSummary] = useState<string | null>(initialSummary)
  const [enrichmentStatus, setEnrichmentStatus] = useState(initialEnrichmentStatus)
  const [isEditing, setIsEditing] = useState(false)
  const [draftSummary, setDraftSummary] = useState(initialSummary ?? '')
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPending = enrichmentStatus === 'pending' || regenerating

  function enterEdit() {
    setDraftSummary(summary ?? '')
    setError(null)
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
    setError(null)
  }

  async function saveSummary() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/artifacts/${artifactId}/summary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: draftSummary }),
      })
      const data = (await res.json()) as { summary?: string; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Failed to save summary')
        return
      }
      setSummary(data.summary ?? draftSummary)
      setIsEditing(false)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  async function triggerRegenerate() {
    setRegenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/artifacts/${artifactId}/enrich`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? 'Regeneration failed')
        setRegenerating(false)
        return
      }
      // Enrichment is async — set pending state; user refreshes to see results
      setEnrichmentStatus('pending')
      setSummary(null)
    } catch {
      setError('Network error — please try again')
      setRegenerating(false)
    }
  }

  return (
    <div className="space-y-2">
      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : isEditing ? (
        <div className="space-y-2">
          <textarea
            value={draftSummary}
            onChange={(e) => setDraftSummary(e.target.value)}
            rows={4}
            aria-label="Edit summary"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={saveSummary}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Check className="h-3 w-3" />
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <XIcon className="h-3 w-3" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {summary ?? <span className="text-zinc-400">No summary available.</span>}
            </p>
            {isOwner && !isEditing && (
              <button
                onClick={enterEdit}
                aria-label="Edit summary"
                className="shrink-0 rounded p-1 text-zinc-400 transition-colors hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:hover:text-zinc-200"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {isOwner && (
            <div>
              {error && <p className="mb-1 text-xs text-red-500">{error}</p>}
              <button
                onClick={triggerRegenerate}
                disabled={regenerating}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate with AI
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
