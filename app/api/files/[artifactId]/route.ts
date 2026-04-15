import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { artifacts } from '@/lib/schema'
import { resolveAuth, AuthError } from '@/lib/auth'

// GET /api/files/[artifactId] — authenticated proxy for artifact file content
export async function GET(
  request: Request,
  { params }: { params: Promise<{ artifactId: string }> },
) {
  let teamIds: string[]
  try {
    ;({ teamIds } = await resolveAuth(request))
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(err.body, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }

  const { artifactId } = await params

  // Fetch artifact from DB
  const [artifact] = await db
    .select({
      id: artifacts.id,
      teamId: artifacts.teamId,
      fileUrl: artifacts.fileUrl,
      fileName: artifacts.fileName,
      fileType: artifacts.fileType,
    })
    .from(artifacts)
    .where(eq(artifacts.id, artifactId))
    .limit(1)

  if (!artifact) {
    return NextResponse.json({ error: 'Artifact not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  // Verify caller is a member of the artifact's team
  if (!teamIds.includes(artifact.teamId)) {
    return NextResponse.json(
      { error: 'You are not a member of this team', code: 'TEAM_ACCESS_DENIED' },
      { status: 403 },
    )
  }

  // Proxy blob content server-side — raw fileUrl never returned to client
  let blobResponse: Response
  try {
    blobResponse = await fetch(artifact.fileUrl)
  } catch (err) {
    console.error('[GET /api/files/[artifactId]] blob fetch error:', err)
    return NextResponse.json(
      { error: 'Failed to retrieve file', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }

  if (!blobResponse.ok) {
    console.error('[GET /api/files/[artifactId]] blob returned status:', blobResponse.status)
    return NextResponse.json(
      { error: 'Failed to retrieve file', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }

  const safeFileName = artifact.fileName.replace(/"/g, '')

  // Serve previewable types inline so browsers render them; everything else as attachment
  const inlineTypes = ['image/', 'text/', 'application/pdf', 'text/html']
  const shouldServeInline = inlineTypes.some((prefix) => artifact.fileType.startsWith(prefix))
  const disposition = shouldServeInline
    ? `inline; filename="${safeFileName}"`
    : `attachment; filename="${safeFileName}"`

  const headers = new Headers({
    'Content-Type': artifact.fileType,
    'Content-Disposition': disposition,
    'Cache-Control': 'private, max-age=3600',
  })

  return new Response(blobResponse.body, { status: 200, headers })
}
