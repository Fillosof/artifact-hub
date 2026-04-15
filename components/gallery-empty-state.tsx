'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DropZoneUploader } from '@/components/drop-zone-uploader'
import { PublishDialog } from '@/components/publish-dialog'

interface GalleryEmptyStateProps {
  teamId: string
}

export function GalleryEmptyState({ teamId }: GalleryEmptyStateProps) {
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

  return (
    <>
      <div className="flex flex-col items-center gap-6 pt-16 text-center">
        {/* Illustration */}
        <div aria-hidden="true" className="text-6xl select-none">
          📦
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            No artifacts yet
          </h2>
          <p className="max-w-sm text-sm text-zinc-500">
            Publish your first artifact to share AI-generated content with your team.
          </p>
        </div>

        <button
          onClick={() => setDropZoneOpen(true)}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Publish Your First Artifact
        </button>

        <a
          href="https://modelcontextprotocol.io/quickstart/user"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          How to publish from Claude Desktop
        </a>
      </div>

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
