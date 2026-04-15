import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { artifacts } from '@/lib/schema'
import { resolveAuth, AuthError } from '@/lib/auth'

// PUT /api/artifacts/[artifactId]/summary — update summary (owner only)
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

  // Only the artifact owner can edit the summary
  if (artifact.createdBy !== userId) {
    return NextResponse.json(
      { error: 'Only the artifact owner can edit the summary', code: 'FORBIDDEN' },
      { status: 403 },
    )
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
    !('summary' in body) ||
    typeof (body as Record<string, unknown>).summary !== 'string'
  ) {
    return NextResponse.json(
      { error: 'summary string is required', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  const summary = ((body as { summary: string }).summary).trim()

  await db
    .update(artifacts)
    .set({ summary })
    .where(eq(artifacts.id, artifactId))

  return NextResponse.json({ summary })
}
