'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropZoneUploader } from '@/components/drop-zone-uploader'
import { PublishDialog } from '@/components/publish-dialog'

interface GalleryActionsProps {
  teamId: string | null
}

export function GalleryActions({ teamId }: GalleryActionsProps) {
  const router = useRouter()
  const [dropZoneOpen, setDropZoneOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelected = useCallback((file: File) => {
    setSelectedFile(file)
    setDropZoneOpen(false)
    setPublishOpen(true)
  }, [])

  const handlePublishSuccess = useCallback(
    (artifactId: string) => {
      setPublishOpen(false)
      setSelectedFile(null)
      router.push(`/artifacts/${artifactId}?published=true`)
    },
    [router],
  )

  const handlePublishClose = useCallback(() => {
    setPublishOpen(false)
    setSelectedFile(null)
  }, [])

  if (!teamId) {
    return (
      <p className="text-sm text-zinc-500">
        You are not a member of any team yet. Create or join a team to publish artifacts.
      </p>
    )
  }

  return (
    <>
      <Button onClick={() => setDropZoneOpen(true)}>
        <PlusIcon />
        New Artifact
      </Button>

      <DropZoneUploader
        open={dropZoneOpen}
        onClose={() => setDropZoneOpen(false)}
        onFileSelected={handleFileSelected}
      />

      <PublishDialog
        open={publishOpen}
        onClose={handlePublishClose}
        file={selectedFile}
        teamId={teamId}
        onSuccess={handlePublishSuccess}
      />
    </>
  )
}
