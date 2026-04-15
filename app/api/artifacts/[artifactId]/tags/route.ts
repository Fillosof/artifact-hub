import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { artifacts, artifactTags, teamMemberships } from '@/lib/schema'
import { resolveAuth, AuthError } from '@/lib/auth'
import { normalizeTags } from '@/lib/utils'

// PUT /api/artifacts/[artifactId]/tags — update tags (owner or team admin)
export async function PUT(
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

  const [artifact] = await db
    .select({ id: artifacts.id, teamId: artifacts.teamId, createdBy: artifacts.createdBy })
    .from(artifacts)
    .where(eq(artifacts.id, artifactId))
    .limit(1)

  if (!artifact) {
    return NextResponse.json({ error: 'Artifact not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  if (!teamIds.includes(artifact.teamId)) {
    return NextResponse.json(
      { error: 'You are not a member of this team', code: 'TEAM_ACCESS_DENIED' },
      { status: 403 },
    )
  }

  // Must be owner or team admin
  const isOwner = artifact.createdBy === userId
  if (!isOwner) {
    const [membership] = await db
      .select({ role: teamMemberships.role })
      .from(teamMemberships)
      .where(and(eq(teamMemberships.teamId, artifact.teamId), eq(teamMemberships.userId, userId)))
      .limit(1)

    if (membership?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only the artifact owner or team admin can edit tags', code: 'FORBIDDEN' },
        { status: 403 },
      )
    }
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('tags' in body) ||
    !Array.isArray((body as Record<string, unknown>).tags)
  ) {
    return NextResponse.json(
      { error: 'tags array is required', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  const rawTags = (body as { tags: unknown[] }).tags
  if (!rawTags.every((t) => typeof t === 'string')) {
    return NextResponse.json(
      { error: 'All tags must be strings', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  const normalized = normalizeTags(rawTags as string[])

  if (rawTags.length > 0 && rawTags.filter((t) => (t as string).trim()).length > 8) {
    return NextResponse.json(
      { error: 'Maximum 8 tags allowed', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  // Replace all tags atomically: delete then insert
  await db.delete(artifactTags).where(eq(artifactTags.artifactId, artifactId))

  if (normalized.length > 0) {
    await db.insert(artifactTags).values(normalized.map((tag) => ({ artifactId, tag })))
  }

  return NextResponse.json({ tags: normalized })
}
