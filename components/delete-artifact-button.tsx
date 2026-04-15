'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeleteArtifactButtonProps {
  artifactId: string
  artifactTitle: string
}

export function DeleteArtifactButton({ artifactId, artifactTitle }: DeleteArtifactButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/artifacts/${artifactId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? 'Deletion failed. Please try again.')
        setLoading(false)
        return
      }
      // Redirect to gallery with ?deleted=true so the ToastBanner picks it up
      router.push('/gallery?deleted=true')
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 />
        Delete Artifact
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Artifact</DialogTitle>
            <DialogDescription>
              This will permanently delete &lsquo;{artifactTitle}&rsquo;. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={loading} />}
              onClick={() => setOpen(false)}
            >
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting…' : 'Delete Artifact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
