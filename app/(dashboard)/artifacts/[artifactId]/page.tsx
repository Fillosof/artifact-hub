import Link from 'next/link'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { artifacts, artifactTags, teams, teamMemberships } from '@/lib/schema'
import { Skeleton } from '@/components/ui/skeleton'
import { DocumentPreviewer } from '@/components/document-previewer'
import { TagsEditor } from '@/components/tags-editor'
import { SummaryEditor } from '@/components/summary-editor'
import { ContextualCommentThread } from '@/components/comment-thread'
import { DeleteArtifactButton } from '@/components/delete-artifact-button'
import { ToastBanner } from '@/components/toast-banner'
import { CopyUrlButton } from '@/components/copy-url-button'

interface ArtifactDetailPageProps {
  params: Promise<{ artifactId: string }>
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function ArtifactDetailPage({ params }: ArtifactDetailPageProps) {
  const { userId } = await auth()
  const { artifactId } = await params

  // Fetch the artifact (no fileUrl)
  const [artifact] = await db
    .select({
      id: artifacts.id,
      teamId: artifacts.teamId,
      title: artifacts.title,
      fileName: artifacts.fileName,
      fileType: artifacts.fileType,
      sourceUrl: artifacts.sourceUrl,
      summary: artifacts.summary,
      enrichmentStatus: artifacts.enrichmentStatus,
      createdBy: artifacts.createdBy,
      createdAt: artifacts.createdAt,
    })
    .from(artifacts)
    .where(eq(artifacts.id, artifactId))
    .limit(1)

  if (!artifact) {
    notFound()
  }

  // Check team membership
  const [membership] = userId
    ? await db
        .select({ role: teamMemberships.role })
        .from(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, artifact.teamId),
            eq(teamMemberships.userId, userId),
          ),
        )
        .limit(1)
    : [undefined]

  if (!membership) {
    // Fetch team name for the access-denied card
    const [team] = await db
      .select({ name: teams.name })
      .from(teams)
      .where(eq(teams.id, artifact.teamId))
      .limit(1)

    const teamName = team?.name ?? 'Unknown Team'

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Access Denied
          </h1>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            You must be a member of{' '}
            <span className="font-medium text-zinc-900 dark:text-zinc-50">{teamName}</span> to view
            this artifact.
          </p>
          <Link
            href="/gallery"
            className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Return to My Hub
          </Link>
        </div>
      </div>
    )
  }

  // Fetch tags
  const tagRows = await db
    .select({ tag: artifactTags.tag })
    .from(artifactTags)
    .where(eq(artifactTags.artifactId, artifactId))

  const tags = tagRows.map((r) => r.tag)
  const isPending = artifact.enrichmentStatus === 'pending'
  const initials = artifact.createdBy.slice(0, 2).toUpperCase()
  const isOwner = userId === artifact.createdBy
  const isAdmin = membership.role === 'admin'
  const canEditTags = isOwner || isAdmin

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      <Suspense>
        <ToastBanner />
      </Suspense>

      {/* Title row with admin delete action */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {artifact.title}
        </h1>
        {isAdmin && (
          <DeleteArtifactButton artifactId={artifact.id} artifactTitle={artifact.title} />
        )}
      </div>

      {/* Meta row */}
      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
            {initials}
          </span>
          <span>{artifact.createdBy}</span>
        </div>
        <span>&middot;</span>
        <time dateTime={new Date(artifact.createdAt).toISOString()}>
          {formatDate(artifact.createdAt)}
        </time>
        {artifact.sourceUrl && (
          <>
            <span>&middot;</span>
            <a
              href={artifact.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Source
            </a>
          </>
        )}
        <span>&middot;</span>
        <CopyUrlButton artifactId={artifact.id} />
      </div>

      {/* Tags */}
      <div className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Tags
        </h2>
        {isPending ? (
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
        ) : (
          <TagsEditor
            artifactId={artifact.id}
            initialTags={tags}
            canEdit={canEditTags}
          />
        )}
      </div>

      {/* Summary */}
      <div className="mb-8">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Summary
        </h2>
        <SummaryEditor
          artifactId={artifact.id}
          initialSummary={artifact.summary}
          initialEnrichmentStatus={artifact.enrichmentStatus}
          isOwner={isOwner}
        />
      </div>

      {/* Preview + Comments — side-by-side at lg+, stacked on mobile */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Preview */}
        <div className="min-w-0 flex-1">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Preview
          </h2>
          <DocumentPreviewer
            artifactId={artifact.id}
            fileType={artifact.fileType}
            fileName={artifact.fileName}
            title={artifact.title}
          />
        </div>

        {/* Comment thread — pinned right at lg+ */}
        <aside className="w-full lg:w-[40%] lg:shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
          <ContextualCommentThread artifactId={artifact.id} />
        </aside>
      </div>
    </div>
  )
}
