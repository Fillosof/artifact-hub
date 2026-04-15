'use client'

import { useEffect, useState } from 'react'
import { FileIcon, Loader2 } from 'lucide-react'

interface DocumentPreviewerProps {
  artifactId: string
  fileType: string
  fileName: string
  title: string
}

/** Fetches text content and renders it in a scrollable pre block. */
function TextFilePreviewer({ src }: { src: string }) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((text) => {
        if (!cancelled) { setContent(text); setLoading(false) }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load file')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [src])

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">Could not load preview: {error}</p>
      </div>
    )
  }

  return (
    <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
      {content}
    </pre>
  )
}

export function DocumentPreviewer({ artifactId, fileType, fileName, title }: DocumentPreviewerProps) {
  const src = `/api/files/${artifactId}`

  if (fileType.startsWith('image/')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={title}
        className="max-h-[70vh] w-full rounded-lg object-contain"
      />
    )
  }

  if (fileType === 'application/pdf') {
    return (
      <embed
        src={src}
        type="application/pdf"
        className="h-[70vh] w-full rounded-lg border border-zinc-200 dark:border-zinc-800"
        title={title}
      />
    )
  }

  if (fileType === 'text/html' || fileType.startsWith('text/html')) {
    return (
      <iframe
        src={src}
        sandbox=""
        title={title}
        className="h-[70vh] w-full rounded-lg border border-zinc-200 dark:border-zinc-800"
      />
    )
  }

  // Text-based files (CSV, Markdown, plain text, etc.) — render inline
  if (fileType.startsWith('text/') || fileType === 'application/json') {
    return <TextFilePreviewer src={src} />
  }

  // Fallback — unsupported binary type; download button is in the page header
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-10 dark:border-zinc-800 dark:bg-zinc-900">
      <FileIcon className="h-10 w-10 text-zinc-400" />
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{fileName}</p>
        <p className="text-xs text-zinc-400">{fileType}</p>
        <p className="mt-1 text-xs text-zinc-400">No preview available — use the Download button above.</p>
      </div>
    </div>
  )
}
