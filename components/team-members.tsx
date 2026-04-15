'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type MemberRole = 'member' | 'admin'

interface MemberRow {
  id: string
  userId: string
  role: MemberRole
  joinedAt: number
  displayName?: string
}

interface PendingInvitationRow {
  id: string
  teamId: string
  email: string
  role: MemberRole
  status: 'pending' | 'accepted'
  invitedBy: string
  createdAt: number
  expiresAt: number | null
  acceptedAt: number | null
}

interface AddedMemberResponse {
  id: string
  teamId: string
  userId?: string
  email?: string
  role: MemberRole
  status?: 'pending' | 'accepted'
  joinedAt?: number
  createdAt?: number
  expiresAt?: number | null
}

interface Props {
  teamId: string
  isAdmin: boolean
  currentUserId: string
  initialMembers: MemberRow[]
  initialPendingInvitations: PendingInvitationRow[]
}

function formatExpiry(expiresAt: number | null): string {
  if (!expiresAt) {
    return 'No expiry'
  }
  return new Date(expiresAt).toLocaleDateString()
}

export function TeamMembers({
  teamId,
  isAdmin,
  currentUserId,
  initialMembers,
  initialPendingInvitations,
}: Props) {
  const router = useRouter()
  const [members, setMembers] = useState<MemberRow[]>(initialMembers)
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitationRow[]>(
    initialPendingInvitations,
  )
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const emailInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMembers(initialMembers)
  }, [initialMembers])

  useEffect(() => {
    setPendingInvitations(initialPendingInvitations)
  }, [initialPendingInvitations])

  async function inviteMember() {
    const email = newEmail.trim().toLowerCase()
    if (!email) {
      setError('Email is required')
      return
    }

    if (!email.includes('@')) {
      setError('Invalid email format')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: 'member' }),
      })
      const body = await res.json() as AddedMemberResponse & { error?: string }

      if (!res.ok) {
        setError(body.error ?? 'Failed to add member')
        return
      }

      const invitationEmail = body.email
      const invitationCreatedAt = body.createdAt

      if (typeof invitationEmail === 'string' && typeof invitationCreatedAt === 'number') {
        setPendingInvitations(prev => [
          ...prev,
          {
            id: body.id,
            teamId: body.teamId,
            email: invitationEmail,
            role: body.role,
            status: 'pending',
            invitedBy: currentUserId,
            createdAt: invitationCreatedAt,
            expiresAt: body.expiresAt ?? null,
            acceptedAt: null,
          },
        ])
      }

      setNewEmail('')
      emailInputRef.current?.focus()
      router.refresh()
    } catch {
      setError('Failed to add member')
    } finally {
      setLoading(false)
    }
  }

  async function changeRole(memberUserId: string, role: MemberRole) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberUserId, role }),
      })
      const body = await res.json() as { success?: boolean; error?: string }
      if (!res.ok) {
        setError(body.error ?? 'Failed to change role')
        return
      }
      setMembers(prev => prev.map(m => (m.userId === memberUserId ? { ...m, role } : m)))
      router.refresh()
    } catch {
      setError('Failed to change role')
    } finally {
      setLoading(false)
    }
  }

  async function removeMember(memberUserId: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberUserId }),
      })
      const body = await res.json() as { success?: boolean; error?: string }
      if (!res.ok) {
        setError(body.error ?? 'Failed to remove member')
        return
      }
      setMembers(prev => prev.filter(m => m.userId !== memberUserId))
      router.refresh()
    } catch {
      setError('Failed to remove member')
    } finally {
      setLoading(false)
    }
  }

  async function cancelInvitation(invitationId: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${invitationId}`, {
        method: 'DELETE',
      })
      const body = await res.json() as { success?: boolean; error?: string }
      if (!res.ok) {
        setError(body.error ?? 'Failed to cancel invitation')
        return
      }
      setPendingInvitations(prev => prev.filter(invitation => invitation.id !== invitationId))
      router.refresh()
    } catch {
      setError('Failed to cancel invitation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Active Members ({members.length})
        </h2>
      </div>

      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                Member
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                Role
              </th>
              {isAdmin && (
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {members.length === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 3 : 2}
                  className="px-4 py-6 text-center text-zinc-400"
                >
                  No members yet.
                </td>
              </tr>
            )}
            {members.map(member => (
              <tr key={member.id} className="bg-white dark:bg-zinc-950">
                <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                  {member.displayName ?? member.userId}
                  {member.userId === currentUserId && (
                    <span className="ml-2 text-zinc-400">(you)</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isAdmin && member.userId !== currentUserId ? (
                    <select
                      value={member.role}
                      onChange={e => {
                        void changeRole(member.userId, e.target.value as MemberRole)
                      }}
                      disabled={loading}
                      className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        member.role === 'admin'
                          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {member.role}
                    </span>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    {member.userId !== currentUserId && (
                      <button
                        onClick={() => {
                          void removeMember(member.userId)
                        }}
                        disabled={loading}
                        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Invite by Email
          </h3>
          <label htmlFor="invite-by-email" className="sr-only">
            Invite by Email
          </label>
          <div className="flex gap-2">
            <input
              id="invite-by-email"
              ref={emailInputRef}
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void inviteMember()
              }}
              placeholder="user@example.com"
              disabled={loading}
              className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600"
            />
            <button
              onClick={() => void inviteMember()}
              disabled={loading || !newEmail.trim()}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Invite
            </button>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Pending Invitations ({pendingInvitations.length})
          </h3>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Expires
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {pendingInvitations.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 4 : 3}
                    className="px-4 py-6 text-center text-zinc-400"
                  >
                    No pending invitations.
                  </td>
                </tr>
              )}
              {pendingInvitations.map((invitation) => (
                <tr key={invitation.id} className="bg-white dark:bg-zinc-950">
                  <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                    {invitation.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        invitation.role === 'admin'
                          ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {invitation.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500">
                    {formatExpiry(invitation.expiresAt)}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          void cancelInvitation(invitation.id)
                        }}
                        disabled={loading}
                        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        Cancel Invite
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
