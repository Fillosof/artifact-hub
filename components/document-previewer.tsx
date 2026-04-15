'use client'

import { Download, FileIcon } from 'lucide-react'

interface DocumentPreviewerProps {
  artifactId: string
  fileType: string
  fileName: string
  title: string
}

export function DocumentPreviewer({ artifactId, fileType, fileName, title }: DocumentPreviewerProps) {
  const src = `/api/files/${artifactId}`

  if (fileType.startsWith('image/')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={title}
        className="max-h-[70vh] w-full rounded-lg object-contain"
      />
    )
  }

  if (fileType === 'application/pdf') {
    return (
      <embed
        src={src}
        type="application/pdf"
        className="h-[70vh] w-full rounded-lg border border-zinc-200 dark:border-zinc-800"
        title={title}
      />
    )
  }

  if (fileType === 'text/html' || fileType.startsWith('text/html')) {
    return (
      <iframe
        src={src}
        sandbox=""
        title={title}
        className="h-[70vh] w-full rounded-lg border border-zinc-200 dark:border-zinc-800"
      />
    )
  }

  // Fallback — download card
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-10 dark:border-zinc-800 dark:bg-zinc-900">
      <FileIcon className="h-10 w-10 text-zinc-400" />
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{fileName}</p>
        <p className="text-xs text-zinc-400">{fileType}</p>
      </div>
      <a
        href={src}
        download={fileName}
        className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        <Download className="h-4 w-4" />
        Download File
      </a>
    </div>
  )
}
