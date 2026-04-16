import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { artifacts, artifactTags, teams, teamMemberships } from '@/lib/schema'
import { resolveAuth, AuthError } from '@/lib/auth'

// DELETE /api/artifacts/[artifactId] — admin-only hard delete
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ artifactId: string }> },
) {
  let userId: string
  let teamIds: string[]
  try {
    ;({ userId, teamIds } = await resolveAuth(request))
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(err.body, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }

  const { artifactId } = await params

  // Fetch artifact to verify it exists and get its teamId and creator
  const [artifact] = await db
    .select({ id: artifacts.id, teamId: artifacts.teamId, createdBy: artifacts.createdBy })
    .from(artifacts)
    .where(eq(artifacts.id, artifactId))
    .limit(1)

  if (!artifact) {
    return NextResponse.json({ error: 'Artifact not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  // Caller must be a member of the artifact's team
  if (!teamIds.includes(artifact.teamId)) {
    return NextResponse.json(
      { error: 'Only team admins can delete artifacts', code: 'FORBIDDEN' },
      { status: 403 },
    )
  }

  // Caller must be an admin in that team
  const [membership] = await db
    .select({ role: teamMemberships.role })
    .from(teamMemberships)
    .where(and(eq(teamMemberships.teamId, artifact.teamId), eq(teamMemberships.userId, userId)))
    .limit(1)

  const isArtifactOwner = artifact.createdBy === userId
  if (!membership || (membership.role !== 'admin' && !isArtifactOwner)) {
    return NextResponse.json(
      { error: 'Only team admins or the artifact creator can delete artifacts', code: 'FORBIDDEN' },
      { status: 403 },
    )
  }

  // Delete the artifact (FK cascades handle artifact_tags and comments)
  await db.delete(artifacts).where(eq(artifacts.id, artifactId))

  return NextResponse.json({ success: true })
}

// GET /api/artifacts/[artifactId] — artifact detail (excludes fileUrl)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ artifactId: string }> },
) {
  let userId: string
  let teamIds: string[]
  try {
    ;({ userId, teamIds } = await resolveAuth(request))
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(err.body, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }

  const { artifactId } = await params

  // Fetch artifact (never select fileUrl)
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
    return NextResponse.json({ error: 'Artifact not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  // Check if caller is a member of the artifact's team
  if (!teamIds.includes(artifact.teamId)) {
    // Fetch team name for an informative access-denied response
    const [team] = await db
      .select({ name: teams.name })
      .from(teams)
      .where(eq(teams.id, artifact.teamId))
      .limit(1)

    return NextResponse.json(
      {
        error: 'You must be a member of this team to view this artifact',
        code: 'TEAM_ACCESS_DENIED',
        detail: team?.name ?? 'Unknown Team',
      },
      { status: 403 },
    )
  }

  // Fetch tags
  const tagRows = await db
    .select({ tag: artifactTags.tag })
    .from(artifactTags)
    .where(eq(artifactTags.artifactId, artifactId))

  // Fetch user's role in the team (for edit permissions)
  const [membership] = await db
    .select({ role: teamMemberships.role })
    .from(teamMemberships)
    .where(and(eq(teamMemberships.teamId, artifact.teamId), eq(teamMemberships.userId, userId)))
    .limit(1)

  return NextResponse.json({
    id: artifact.id,
    teamId: artifact.teamId,
    title: artifact.title,
    fileName: artifact.fileName,
    fileType: artifact.fileType,
    sourceUrl: artifact.sourceUrl,
    summary: artifact.summary,
    enrichmentStatus: artifact.enrichmentStatus,
    createdBy: artifact.createdBy,
    createdAt: artifact.createdAt,
    tags: tagRows.map((r) => r.tag),
    userRole: membership?.role ?? 'member',
  })
}
