'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LeaveTeamButtonProps {
  teamId: string
  teamName: string
}

export function LeaveTeamButton({ teamId, teamName }: LeaveTeamButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLeave() {
    const confirmed = window.confirm(`Leave ${teamName}? You will lose access to team artifacts.`)
    if (!confirmed) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/teams/${teamId}/members/leave`, { method: 'DELETE' })
      const body = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(body.error ?? 'Failed to leave team')
        setLoading(false)
        return
      }
      router.refresh()
    } catch {
      setError('Failed to leave team')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleLeave()}
        disabled={loading}
        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        {loading ? 'Leaving…' : 'Leave team'}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}