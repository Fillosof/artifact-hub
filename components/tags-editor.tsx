'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { X, Plus, Pencil, Check, XIcon } from 'lucide-react'

interface TagsEditorProps {
  artifactId: string
  initialTags: string[]
  canEdit: boolean
}

export function TagsEditor({ artifactId, initialTags, canEdit }: TagsEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<string[]>(initialTags)
  const [inputValue, setInputValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function enterEdit() {
    setDraft([...tags])
    setInputValue('')
    setError(null)
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
    setError(null)
  }

  function addTag() {
    const value = inputValue.toLowerCase().trim()
    if (!value) return
    if (draft.length >= 8) {
      setError('Maximum 8 tags allowed')
      return
    }
    if (draft.includes(value)) {
      setInputValue('')
      return
    }
    setDraft([...draft, value])
    setInputValue('')
    setError(null)
  }

  function removeTag(tag: string) {
    setDraft(draft.filter((t) => t !== tag))
    setError(null)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/artifacts/${artifactId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: draft }),
      })
      const data = (await res.json()) as { tags?: string[]; error?: string; code?: string }
      if (!res.ok) {
        if (data.code === 'VALIDATION_ERROR' && data.error?.includes('8 tags')) {
          setError('Maximum 8 tags allowed')
        } else {
          setError(data.error ?? 'Failed to save tags')
        }
        return
      }
      setTags(data.tags ?? draft)
      setIsEditing(false)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  if (!isEditing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {tag}
            </span>
          ))
        ) : (
          <span className="text-sm text-zinc-400">No tags yet.</span>
        )}
        {canEdit && (
          <button
            onClick={enterEdit}
            aria-label="Edit tags"
            className="ml-1 rounded p-1 text-zinc-400 transition-colors hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:hover:text-zinc-200"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Edit tags</span>
          </button>
        )}
      </div>
    )
  }

  // Edit mode
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {draft.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 px-3 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
              className="ml-0.5 rounded-full hover:text-red-500 focus-visible:ring-1 focus-visible:ring-red-400"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">Remove tag {tag}</span>
            </button>
          </span>
        ))}
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Add tag…"
            aria-label="New tag"
            className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
          />
          <button
            onClick={addTag}
            aria-label="Add tag"
            className="rounded p-0.5 text-zinc-500 hover:text-zinc-800 focus-visible:ring-1 focus-visible:ring-zinc-400"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Add tag</span>
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <Check className="h-3 w-3" aria-hidden="true" />
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={cancelEdit}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <XIcon className="h-3 w-3" aria-hidden="true" />
          Cancel
        </button>
      </div>
    </div>
  )
}
