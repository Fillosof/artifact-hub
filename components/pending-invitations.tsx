'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PendingInvitation } from '@/lib/types'

interface PendingInvitationsProps {
  invitations: Array<PendingInvitation & { teamName: string }>
  onUpdate: () => void
}

interface ActionState {
  id: string
  loading: boolean
  error?: string
}

export function PendingInvitations({ invitations, onUpdate }: PendingInvitationsProps) {
  const router = useRouter()
  const [actions, setActions] = useState<Record<string, ActionState>>({})

  if (!invitations || invitations.length === 0) {
    return null
  }

  const setActionState = (id: string, state: Partial<ActionState>) => {
    setActions((prev) => ({
      ...prev,
      [id]: { ...prev[id], id, ...state },
    }))
  }

  const handleAccept = async (invitation: PendingInvitation & { teamName: string }) => {
    setActionState(invitation.id, { loading: true, error: undefined })

    try {
      const response = await fetch(
        `/api/teams/${invitation.teamId}/invitations/${invitation.id}/accept`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to accept invitation')
      }

      setActionState(invitation.id, { loading: false })
      onUpdate()
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setActionState(invitation.id, { loading: false, error: message })
    }
  }

  const handleDecline = async (invitation: PendingInvitation & { teamName: string }) => {
    setActionState(invitation.id, { loading: true, error: undefined })

    try {
      const response = await fetch(
        `/api/teams/${invitation.teamId}/invitations/${invitation.id}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to decline invitation')
      }

      setActionState(invitation.id, { loading: false })
      onUpdate()
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setActionState(invitation.id, { loading: false, error: message })
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Pending Invitations</h2>
      <ul className="space-y-3">
        {invitations.map((invitation) => {
          const action = actions[invitation.id]
          const isLoading = action?.loading ?? false

          return (
            <li
              key={invitation.id}
              className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/30 dark:bg-amber-950/20"
            >
              <div className="flex-1">
                <Link
                  href={`/teams/${invitation.teamId}`}
                  className="font-medium text-amber-900 transition-colors hover:text-amber-700 dark:text-amber-100 dark:hover:text-amber-50"
                >
                  {invitation.teamName}
                </Link>
                <p className="text-sm text-amber-700 dark:text-amber-200">
                  Invited as <span className="font-medium">{invitation.role}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {action?.error && (
                  <p className="text-xs text-red-600 dark:text-red-400">{action.error}</p>
                )}
                <button
                  onClick={() => handleAccept(invitation)}
                  disabled={isLoading}
                  className="rounded px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50 enabled:bg-green-600 enabled:hover:bg-green-700 dark:enabled:bg-green-700 dark:enabled:hover:bg-green-600"
                >
                  {isLoading ? 'Loading...' : 'Accept'}
                </button>
                <button
                  onClick={() => handleDecline(invitation)}
                  disabled={isLoading}
                  className="rounded px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors disabled:opacity-50 enabled:border enabled:border-zinc-300 enabled:hover:bg-zinc-100 dark:enabled:border-zinc-700 dark:enabled:text-zinc-300 dark:enabled:hover:bg-zinc-900"
                >
                  {isLoading ? 'Loading...' : 'Decline'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
