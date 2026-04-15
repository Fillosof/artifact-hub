import { nanoid } from 'nanoid'
import { eq, and, desc, inArray, or, like, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { artifacts, artifactTags, teamMemberships } from '@/lib/schema'
import { resolveAuth, AuthError } from '@/lib/auth'
import { normalizeTags } from '@/lib/utils'
import { enrichArtifact } from '@/lib/enrichment'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

// GET /api/teams/[teamId]/artifacts — list artifacts (supports ?q=, ?tag=, ?fileType=)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
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

  const { teamId } = await params

  if (!teamIds.includes(teamId)) {
    return NextResponse.json(
      { error: 'You are not a member of this team', code: 'TEAM_ACCESS_DENIED' },
      { status: 403 },
    )
  }

  // Confirm membership row exists (also confirms team exists)
  const [membership] = await db
    .select({ role: teamMemberships.role })
    .from(teamMemberships)
    .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, userId)))
    .limit(1)

  if (!membership) {
    return NextResponse.json({ error: 'Team not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  // Parse optional filter/search query params
  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  const tag = url.searchParams.get('tag')?.trim() ?? ''
  const fileType = url.searchParams.get('fileType')?.trim() ?? ''

  // Build WHERE clause — always team-scoped
  const artifactRows = await db
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
        eq(artifacts.teamId, teamId),
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

  // Fetch tags for the returned artifacts
  let tagMap: Record<string, string[]> = {}
  if (artifactRows.length > 0) {
    const ids = artifactRows.map((a) => a.id)
    const tagRows = await db
      .select({ artifactId: artifactTags.artifactId, tag: artifactTags.tag })
      .from(artifactTags)
      .where(inArray(artifactTags.artifactId, ids))

    tagMap = tagRows.reduce<Record<string, string[]>>((acc, row) => {
      if (!acc[row.artifactId]) acc[row.artifactId] = []
      acc[row.artifactId].push(row.tag)
      return acc
    }, {})
  }

  return NextResponse.json({
    artifacts: artifactRows.map((a) => ({
      id: a.id,
      title: a.title,
      fileType: a.fileType,
      enrichmentStatus: a.enrichmentStatus,
      summary: a.summary,
      createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : new Date(a.createdAt).toISOString(),
      createdBy: a.createdBy,
      tags: tagMap[a.id] ?? [],
      proxyUrl: `/api/files/${a.id}`,
    })),
  })
}

// POST /api/teams/[teamId]/artifacts — upload a file and create an artifact record
export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
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

  const { teamId } = await params

  // Verify caller belongs to this team
  if (!teamIds.includes(teamId)) {
    return NextResponse.json(
      { error: 'You are not a member of this team', code: 'TEAM_ACCESS_DENIED' },
      { status: 403 },
    )
  }

  // Verify team membership row exists (also confirms team exists)
  const [membership] = await db
    .select({ role: teamMemberships.role })
    .from(teamMemberships)
    .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, userId)))
    .limit(1)

  if (!membership) {
    return NextResponse.json(
      { error: 'Team not found', code: 'NOT_FOUND' },
      { status: 404 },
    )
  }

  // Parse multipart form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: 'Invalid multipart form data', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  const file = formData.get('file')
  const title = formData.get('title')
  const sourceUrl = formData.get('sourceUrl')

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'file is required', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json(
      { error: 'title is required and cannot be empty', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  // Server-side size check — before any blob write
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File exceeds the 10MB limit', code: 'FILE_TOO_LARGE' },
      { status: 400 },
    )
  }

  const trimmedTitle = title.trim()
  const trimmedSourceUrl =
    typeof sourceUrl === 'string' && sourceUrl.trim() ? sourceUrl.trim() : null

  // MIME type from the File object (server-parsed, not client Content-Type header)
  const fileType = file.type || 'application/octet-stream'
  const fileName = file.name || 'upload'

  // Upload to Vercel Blob
  const blobName = `artifacts/${nanoid()}-${fileName}`
  let blobUrl: string
  try {
    const { url } = await put(blobName, file, { access: 'public' })
    blobUrl = url
  } catch (err) {
    console.error('[POST /api/teams/[teamId]/artifacts] blob upload error:', err)
    return NextResponse.json(
      { error: 'File upload failed', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }

  // Insert artifact row
  const id = nanoid()
  const createdAt = new Date()

  try {
    await db.insert(artifacts).values({
      id,
      teamId,
      title: trimmedTitle,
      fileUrl: blobUrl,   // stored internally, never returned
      fileName,
      fileType,
      sourceUrl: trimmedSourceUrl,
      summary: null,
      enrichmentStatus: 'pending',
      createdBy: userId,
      createdAt,
    })
  } catch (err) {
    console.error('[POST /api/teams/[teamId]/artifacts] db insert error:', err)
    return NextResponse.json(
      { error: 'Failed to save artifact', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }

  // Return artifact shape — fileUrl deliberately omitted
  // Check if the caller already provided tags + summary (e.g. via MCP clients)
  // If both are present, persist them directly and skip AI enrichment.
  const rawTagValues = formData
    .getAll('tags')
    .flatMap((t) => String(t).split(','))
  const summaryField = formData.get('summary')
  const hasPreprovidedMetadata =
    rawTagValues.some((t) => t.trim()) &&
    typeof summaryField === 'string' &&
    summaryField.trim().length > 0

  let responseTags: string[] = []
  let responseSummary: string | null = null
  let responseEnrichmentStatus: 'pending' | 'complete' = 'pending'

  if (hasPreprovidedMetadata) {
    const normalizedTags = normalizeTags(rawTagValues)
    const normalizedSummary = (summaryField as string).trim()

    // Persist pre-provided tags
    if (normalizedTags.length > 0) {
      await db
        .insert(artifactTags)
        .values(normalizedTags.map((tag) => ({ artifactId: id, tag })))
    }

    // Mark enrichment complete with provided summary
    await db
      .update(artifacts)
      .set({ summary: normalizedSummary, enrichmentStatus: 'complete' })
      .where(eq(artifacts.id, id))

    responseTags = normalizedTags
    responseSummary = normalizedSummary
    responseEnrichmentStatus = 'complete'
  } else {
    // Fire-and-forget AI enrichment — direct call, must not delay the 201 response.
    // enrichArtifact sets enrichmentStatus='failed' on error so the artifact stays usable.
    void enrichArtifact(id).catch((err: unknown) => {
      console.error('[POST /api/teams/[teamId]/artifacts] enrichment failed:', err)
    })
  }

  return NextResponse.json(
    {
      artifact: {
        id,
        title: trimmedTitle,
        fileType,
        fileName,
        sourceUrl: trimmedSourceUrl,
        enrichmentStatus: responseEnrichmentStatus,
        createdBy: userId,
        createdAt: createdAt.toISOString(),
        tags: responseTags,
        summary: responseSummary,
      },
    },
    { status: 201 },
  )
}

