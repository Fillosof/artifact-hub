import { Skeleton } from '@/components/ui/skeleton'
import type { Artifact } from '@/lib/types'

interface ArtifactCardProps {
  artifact: Pick<Artifact, 'id' | 'title' | 'fileName' | 'fileType' | 'enrichmentStatus' | 'summary' | 'createdAt'>
  tags: string[]
}

export function ArtifactCard({ artifact, tags }: ArtifactCardProps) {
  const isPending = artifact.enrichmentStatus === 'pending'

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {artifact.title}
        </h3>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {artifact.fileType.split('/').pop() ?? artifact.fileType}
        </span>
      </div>

      {/* Summary — skeleton while pending */}
      {isPending ? (
        <Skeleton className="h-4 w-full" />
      ) : (
        <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
          {artifact.summary ?? 'No summary available.'}
        </p>
      )}

      {/* Tags — skeleton while pending */}
      {isPending ? (
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ) : (
        tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )
      )}

      <p className="text-xs text-zinc-400 dark:text-zinc-600">
        {new Date(artifact.createdAt).toLocaleDateString()}
      </p>
    </div>
  )
}
