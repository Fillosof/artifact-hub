import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { artifacts, artifactTags } from '@/lib/schema'
import { resolveAuth, AuthError } from '@/lib/auth'

// POST /api/artifacts/[artifactId]/enrich — trigger AI re-enrichment (owner only)
export async function POST(
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

  // Only the artifact owner can trigger re-enrichment
  if (artifact.createdBy !== userId) {
    return NextResponse.json(
      { error: 'Only the artifact owner can trigger AI regeneration', code: 'FORBIDDEN' },
      { status: 403 },
    )
  }

  // Reset enrichment state: clear tags, set status to pending
  await db.delete(artifactTags).where(eq(artifactTags.artifactId, artifactId))
  await db.update(artifacts).set({ enrichmentStatus: 'pending', summary: null }).where(eq(artifacts.id, artifactId))

  // Fire-and-forget enrichment (identical pattern to publish route)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  void fetch(`${appUrl}/api/enrich`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Enrich-Secret': process.env.ENRICH_SECRET ?? '',
    },
    body: JSON.stringify({ artifactId }),
  }).catch((err) => {
    console.error('[POST /api/artifacts/[artifactId]/enrich] fire-and-forget failed:', err)
  })

  return NextResponse.json({ enrichmentStatus: 'pending' })
}
