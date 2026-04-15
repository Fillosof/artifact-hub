import { Skeleton } from '@/components/ui/skeleton'

export default function GalleryLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar skeleton */}
      <aside className="w-64 shrink-0 border-r border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      </aside>

      {/* Content skeleton — ArtifactRow placeholders */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </main>
    </div>
  )
}
