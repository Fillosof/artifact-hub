'use client'

import { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyUrlButtonProps {
  artifactId: string
}

export function CopyUrlButton({ artifactId }: CopyUrlButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const url = `${window.location.origin}/artifacts/${artifactId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 4000)
    } catch {
      // Clipboard API not available — silent fail per security constraints
    }
  }, [artifactId])

  return (
    <>
      <button
        onClick={handleCopy}
        aria-label="Copy artifact URL to clipboard"
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {copied ? 'Copied!' : 'Copy URL'}
      </button>

      {/* Toast notification — fixed bottom-right, auto-dismissed via state */}
      {copied && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
        >
          <Check className="size-4 shrink-0 text-green-400 dark:text-green-600" />
          URL Copied to Clipboard
        </div>
      )}
    </>
  )
}
