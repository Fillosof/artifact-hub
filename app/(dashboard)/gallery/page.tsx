import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { eq, and, desc, inArray, or, like, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { teamMemberships, teams, artifacts, artifactTags } from '@/lib/schema'
import { ArtifactRow } from '@/components/artifact-row'
import { GallerySearch } from '@/components/gallery-search'
import { GalleryFilters } from '@/components/gallery-filters'
import { GalleryActions } from '@/components/gallery-actions'
import { GalleryLayout } from '@/components/gallery-layout'
import { ToastBanner } from '@/components/toast-banner'
import { GalleryEmptyState } from '@/components/gallery-empty-state'
import { getUserDisplayName } from '@/lib/user-display'
import Link from 'next/link'

interface GalleryPageProps {
  searchParams: Promise<{
    teamId?: string
    tag?: string
    fileType?: string
    q?: string
  }>
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const { userId } = await auth()
  const { teamId: teamIdParam, tag, fileType, q } = await searchParams

  // Fetch all teams the user belongs to
  let userTeams: Array<{ id: string; name: string }> = []
  const userTeamIds: string[] = []
  if (userId) {
    userTeams = await db
      .select({ id: teams.id, name: teams.name })
      .from(teamMemberships)
      .innerJoin(teams, eq(teamMemberships.teamId, teams.id))
      .where(eq(teamMemberships.userId, userId))
    userTeamIds.push(...userTeams.map((t) => t.id))
  }

  // Active team from URL param (must be one the user belongs to)
  const activeTeamId =
    teamIdParam && userTeamIds.includes(teamIdParam) ? teamIdParam : null

  // Build team scope condition
  const teamScopeCondition =
    activeTeamId != null
      ? eq(artifacts.teamId, activeTeamId)
      : userTeamIds.length > 0
        ? inArray(artifacts.teamId, userTeamIds)
        : undefined

  // Fetch artifacts with optional filters applied
  type ArtifactListItem = {
    id: string
    title: string
    fileType: string
    enrichmentStatus: 'pending' | 'complete' | 'failed'
    summary: string | null
    createdAt: Date
    createdBy: string
    authorName?: string
  }
  let artifactList: ArtifactListItem[] = []
  let tagMap: Record<string, string[]> = {}

  if (teamScopeCondition) {
    artifactList = await db
      .select({
        id: artifacts.id,
        title: artifacts.title,
        fileType: artifacts.fileType,
        enrichmentStatus: artifacts.enrichmentStatus,
        summary: artifacts.summary,
        createdAt: artifacts.createdAt,
        createdBy: artifacts.createdBy,
      })
      .from(artifacts)
      .where(
        and(
          teamScopeCondition,
          fileType ? eq(artifacts.fileType, fileType) : undefined,
          tag
            ? sql`EXISTS (SELECT 1 FROM artifact_tags WHERE artifact_tags.artifact_id = ${artifacts.id} AND artifact_tags.tag = ${tag})`
            : undefined,
          q
            ? or(
                like(artifacts.title, `%${q}%`),
                sql`artifacts.summary LIKE ${`%${q}%`}`,
                sql`EXISTS (SELECT 1 FROM artifact_tags WHERE artifact_tags.artifact_id = ${artifacts.id} AND artifact_tags.tag LIKE ${`%${q}%`})`,
              )
            : undefined,
        ),
      )
      .orderBy(desc(artifacts.createdAt))
      .limit(50)

    if (artifactList.length > 0) {
      const ids = artifactList.map((a) => a.id)
      const tagRows = await db
        .select({ artifactId: artifactTags.artifactId, tag: artifactTags.tag })
        .from(artifactTags)
        .where(inArray(artifactTags.artifactId, ids))

      tagMap = tagRows.reduce<Record<string, string[]>>((acc, row) => {
        if (!acc[row.artifactId]) acc[row.artifactId] = []
        acc[row.artifactId].push(row.tag)
        return acc
      }, {})

      // Fetch display names for all unique createdBy values
      const uniqueUserIds = [...new Set(artifactList.map((a) => a.createdBy))]
      const displayNameMap: Record<string, string> = {}
      await Promise.all(
        uniqueUserIds.map(async (uid) => {
          displayNameMap[uid] = await getUserDisplayName(uid)
        }),
      )
      // Attach display names to artifacts
      artifactList = artifactList.map((a) => ({
        ...a,
        authorName: displayNameMap[a.createdBy],
      }))
    }
  }

  // Fetch available filter options (unfiltered — shows all options for the team scope)
  let availableTags: string[] = []
  let availableFileTypes: string[] = []

  if (teamScopeCondition) {
    const [tagOptionRows, typeOptionRows] = await Promise.all([
      db
        .select({ tag: artifactTags.tag })
        .from(artifactTags)
        .innerJoin(artifacts, eq(artifactTags.artifactId, artifacts.id))
        .where(teamScopeCondition),
      db
        .select({ fileType: artifacts.fileType })
        .from(artifacts)
        .where(teamScopeCondition),
    ])

    availableTags = [...new Set(tagOptionRows.map((r) => r.tag))].sort()
    availableFileTypes = [...new Set(typeOptionRows.map((r) => r.fileType))].sort()
  }

  const hasActiveFilters = Boolean(teamIdParam || tag || fileType || q)

  return (
    <GalleryLayout
      sidebar={
        <>
          <GalleryActions teamId={activeTeamId ?? userTeams[0]?.id ?? null} />
          <GallerySearch />
          <GalleryFilters
            teams={userTeams}
            availableTags={availableTags}
            availableFileTypes={availableFileTypes}
          />
        </>
      }
    >
      <Suspense>
        <ToastBanner />
      </Suspense>
      {userTeams.length === 0 ? (
          /* No teams state */
          <div className="flex flex-col items-center gap-4 pt-16 text-center">
            <p className="text-sm text-zinc-500">
              You are not a member of any team yet. Create or join a team to start publishing
              artifacts.
            </p>
            <Link
              href="/teams"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Go to Teams
            </Link>
          </div>
        ) : artifactList.length === 0 ? (
          /* Empty state */
          <>
            {q ? (
              <div className="flex flex-col items-center gap-4 pt-16 text-center">
                <p className="text-sm text-zinc-500">
                  No results found for &lsquo;
                  <strong className="text-zinc-700 dark:text-zinc-300">{q}</strong>
                  &rsquo;
                </p>
                <Link
                  href="/gallery"
                  className="text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Clear all filters
                </Link>
              </div>
            ) : hasActiveFilters ? (
              <div className="flex flex-col items-center gap-4 pt-16 text-center">
                <p className="text-sm text-zinc-500">No artifacts match the active filters.</p>
                <Link
                  href="/gallery"
                  className="text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Clear all filters
                </Link>
              </div>
            ) : (
              <GalleryEmptyState teamId={activeTeamId ?? userTeams[0]?.id ?? ''} />
            )}
          </>
        ) : (
          /* Artifact rows */
          <div className="flex flex-col gap-2">
            {artifactList.map((artifact) => (
              <ArtifactRow
                key={artifact.id}
                artifact={artifact}
                tags={tagMap[artifact.id] ?? []}
                authorName={artifact.authorName}
              />
            ))}
          </div>
        )}
    </GalleryLayout>
  )
}
