'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  teamId: string
  teamName: string
  teamSlug: string
  isAdmin: boolean
}

export function TeamSettings({ teamId, teamName, teamSlug, isAdmin }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(teamName)
  const [currentName, setCurrentName] = useState(teamName)
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      setEditError('Name cannot be empty')
      return
    }
    setSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const body = await res.json() as { team?: { name: string }; error?: string }
      if (!res.ok) {
        setEditError(body.error ?? 'Failed to update team name')
        return
      }
      const updatedName = body.team?.name ?? trimmed
      setCurrentName(updatedName)
      setName(updatedName)
      setEditing(false)
      router.refresh()
    } catch {
      setEditError('Failed to update team name')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setDeleteError(body.error ?? 'Failed to delete team')
        setDeleting(false)
        return
      }
      setDialogOpen(false)
      router.push('/teams')
      router.refresh()
    } catch {
      setDeleteError('Failed to delete team')
      setDeleting(false)
    }
  }

  return (
    <div className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Team Settings</h2>

      {/* Name & Slug */}
      <div className="mt-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Team Name</p>
          {editing ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                aria-label="Team name"
              />
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(false)
                  setName(currentName)
                  setEditError(null)
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-zinc-900 dark:text-zinc-50">{currentName}</span>
              {isAdmin && (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
          )}
          {editError && <p className="mt-1 text-xs text-red-600">{editError}</p>}
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Slug</p>
          <p className="mt-1 text-sm text-zinc-500">/{teamSlug}</p>
        </div>
      </div>

      {/* Danger Zone */}
      {isAdmin && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-red-600">Danger Zone</h3>
          <div className="mt-3 rounded border border-red-200 p-4 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Delete this team</p>
                <p className="text-xs text-zinc-500">
                  Once deleted, this team and all its artifacts cannot be recovered.
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setDialogOpen(true)}>
                Delete Team
              </Button>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Team</DialogTitle>
                  <DialogDescription>
                    This will permanently delete {currentName} and all its artifacts. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                {deleteError && (
                  <p className="text-sm text-red-600">{deleteError}</p>
                )}
                <DialogFooter>
                  <Button
                    variant="outline"
                    disabled={deleting}
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Delete Team'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </div>
  )
}
