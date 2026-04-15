import Link from 'next/link'
import { File, FileText, Code2, ImageIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { Artifact } from '@/lib/types'

interface ArtifactRowProps {
  artifact: Pick<
    Artifact,
    'id' | 'title' | 'fileType' | 'enrichmentStatus' | 'summary' | 'createdAt' | 'createdBy'
  >
  tags: string[]
  authorName?: string
}

function FileTypeIcon({
  fileType,
  artifactId,
  title,
}: {
  fileType: string
  artifactId: string
  title: string
}) {
  if (fileType.startsWith('image/')) {
    return (
      <img
        src={`/api/files/${artifactId}`}
        alt={title}
        className="h-10 w-10 rounded-md object-cover"
      />
    )
  }
  const cls = 'h-5 w-5 text-zinc-400 dark:text-zinc-500'
  if (fileType === 'application/pdf') return <FileText className={cls} />
  if (fileType.startsWith('text/html')) return <Code2 className={cls} />
  if (fileType.startsWith('image/')) return <ImageIcon className={cls} />
  return <File className={cls} />
}

function formatRelativeDate(date: Date): string {
  const diffMs = Date.now() - (date instanceof Date ? date.getTime() : new Date(date).getTime())
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function ArtifactRow({ artifact, tags, authorName }: ArtifactRowProps) {
  const isPending = artifact.enrichmentStatus === 'pending'
  const displayName = authorName || artifact.createdBy
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <Link
      href={`/artifacts/${artifact.id}`}
      className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
    >
      {/* Left: file type icon / thumbnail */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800">
        <FileTypeIcon fileType={artifact.fileType} artifactId={artifact.id} title={artifact.title} />
      </div>

      {/* Center: title + summary */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {artifact.title}
        </p>
        {isPending ? (
          <Skeleton className="mt-1 h-3.5 w-3/4" />
        ) : (
          <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {artifact.summary ?? 'No summary available.'}
          </p>
        )}
      </div>

      {/* Right: tags + date + author */}
      <div className="flex shrink-0 items-center gap-3">
        {isPending ? (
          <div className="flex gap-1">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
        ) : (
          tags.length > 0 && (
            <div className="flex gap-1">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )
        )}

        <span className="text-xs text-zinc-500 dark:text-zinc-500">
          {formatRelativeDate(artifact.createdAt instanceof Date ? artifact.createdAt : new Date(artifact.createdAt))}
        </span>

        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
            title={`Published by ${displayName}`}
          >
            {initials}
          </span>
        </div>
      </div>
    </Link>
  )
}
