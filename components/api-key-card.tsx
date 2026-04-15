'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface ApiKeyCardProps {
  hasKey: boolean
  maskedKey?: string
}

export function ApiKeyCard({ hasKey, maskedKey }: ApiKeyCardProps) {
  const router = useRouter()
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentHasKey, setCurrentHasKey] = useState(hasKey)
  const [currentMasked, setCurrentMasked] = useState(maskedKey)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/keys', { method: 'POST' })
      if (!res.ok) {
        const body = (await res.json()) as { error: string }
        setError(body.error ?? 'Failed to generate key')
        return
      }
      const body = (await res.json()) as { key: string; keyId: string }
      setRevealedKey(body.key)
      setDismissed(false)
      setCurrentHasKey(true)
      // Derive masked key from keyId (cosmetic)
      setCurrentMasked(`ah_****...${body.keyId.slice(-4)}`)
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/keys', { method: 'DELETE' })
      if (!res.ok) {
        const body = (await res.json()) as { error: string }
        setError(body.error ?? 'Failed to revoke key')
        return
      }
      setCurrentHasKey(false)
      setCurrentMasked(undefined)
      setRevealedKey(null)
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (revealedKey) {
      await navigator.clipboard.writeText(revealedKey)
    }
  }

  function handleDismiss() {
    setRevealedKey(null)
    setDismissed(true)
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">MCP API Key</h2>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Use this key to authenticate Claude Desktop or other MCP clients.
      </p>

      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {revealedKey && !dismissed ? (
        <div className="mb-4 space-y-3">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            ⚠ This key will not be shown again. Copy it now and store it securely.
          </p>
          <code className="block w-full break-all rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
            {revealedKey}
          </code>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              Copy
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              Done, I&apos;ve saved it
            </Button>
          </div>
        </div>
      ) : currentHasKey ? (
        <div className="mb-4 flex items-center gap-3">
          <code className="rounded bg-zinc-100 px-3 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {currentMasked ?? 'ah_****...****'}
          </code>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!currentHasKey ? (
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating…' : 'Generate API Key'}
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={handleGenerate} disabled={loading}>
              {loading ? 'Regenerating…' : 'Regenerate'}
            </Button>
            <Button variant="outline" onClick={handleRevoke} disabled={loading} className="text-red-600 hover:text-red-700 dark:text-red-400">
              {loading ? 'Revoking…' : 'Revoke'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
