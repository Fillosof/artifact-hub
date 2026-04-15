'use client'

import { useRef, useState, useCallback } from 'react'
import { UploadCloudIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface DropZoneUploaderProps {
  open: boolean
  onClose: () => void
  onFileSelected: (file: File) => void
}

export function DropZoneUploader({ open, onClose, onFileSelected }: DropZoneUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  const handleFile = useCallback(
    (file: File) => {
      onFileSelected(file)
      onClose()
    },
    [onFileSelected, onClose],
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current = 0
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose() }}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Upload Artifact</DialogTitle>
        </DialogHeader>
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
            isDragOver
              ? 'border-primary bg-primary/10'
              : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-zinc-600',
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
          }}
          aria-label="File drop zone — click to browse or drag a file here"
        >
          <UploadCloudIcon className="size-10 text-zinc-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Drag &amp; drop a file here
            </p>
            <p className="mt-1 text-xs text-zinc-500">or click to browse</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleInputChange}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
