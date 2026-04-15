import { eq, asc } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { artifacts, comments } from '@/lib/schema'
import { resolveAuth, AuthError } from '@/lib/auth'

// POST /api/artifacts/[artifactId]/comments — create a comment
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

  // Fetch artifact to check it exists and validate team membership
  const [artifact] = await db
    .select({ id: artifacts.id, teamId: artifacts.teamId })
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const content =
    typeof body === 'object' && body !== null && 'content' in body
      ? (body as Record<string, unknown>).content
      : undefined

  if (typeof content !== 'string' || content.trim() === '') {
    return NextResponse.json(
      { error: 'Comment cannot be empty', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  const now = Date.now()
  const id = nanoid()

  await db.insert(comments).values({
    id,
    artifactId,
    userId,
    content: content.trim(),
    createdAt: new Date(now),
  })

  return NextResponse.json(
    {
      id,
      userId,
      content: content.trim(),
      createdAt: now,
    },
    { status: 201 },
  )
}

// GET /api/artifacts/[artifactId]/comments — list comments ordered by createdAt ASC
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

  // Fetch artifact to check it exists and validate team membership
  const [artifact] = await db
    .select({ id: artifacts.id, teamId: artifacts.teamId })
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

  const rows = await db
    .select({
      id: comments.id,
      userId: comments.userId,
      content: comments.content,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .where(eq(comments.artifactId, artifactId))
    .orderBy(asc(comments.createdAt))

  // Resolve display names via Clerk (batch by unique userId)
  const uniqueUserIds = [...new Set(rows.map((r) => r.userId))]
  const displayNames: Record<string, string> = {}

  if (uniqueUserIds.length > 0) {
    const client = await clerkClient()
    await Promise.all(
      uniqueUserIds.map(async (uid) => {
        try {
          const user = await client.users.getUser(uid)
          const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
          displayNames[uid] = name || user.emailAddresses[0]?.emailAddress || uid
        } catch {
          displayNames[uid] = uid
        }
      }),
    )
  }

  const result = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    authorName: displayNames[r.userId] ?? r.userId,
    content: r.content,
    createdAt: r.createdAt instanceof Date ? r.createdAt.getTime() : r.createdAt,
  }))

  return NextResponse.json(result)
}
