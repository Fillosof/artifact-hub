import { nanoid } from 'nanoid'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { teamMemberships } from '@/lib/schema'
import { resolveAuth, AuthError } from '@/lib/auth'

type Params = { params: Promise<{ teamId: string }> }

/** Returns true if userId is an admin of teamId. Throws on DB error. */
async function requireAdmin(userId: string, teamId: string): Promise<boolean> {
  const [membership] = await db
    .select({ role: teamMemberships.role })
    .from(teamMemberships)
    .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, userId)))
    .limit(1)
  return membership?.role === 'admin'
}

// GET /api/teams/[teamId]/members — list all members of the team
export async function GET(request: Request, { params }: Params) {
  let userId: string
  let teamIds: string[]
  try {
    ;({ userId, teamIds } = await resolveAuth(request))
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json(err.body, { status: err.status })
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }

  const { teamId } = await params

  if (!teamIds.includes(teamId)) {
    return NextResponse.json(
      { error: 'Team access denied', code: 'TEAM_ACCESS_DENIED' },
      { status: 403 },
    )
  }

  try {
    const members = await db
      .select({
        id: teamMemberships.id,
        userId: teamMemberships.userId,
        role: teamMemberships.role,
        joinedAt: teamMemberships.joinedAt,
      })
      .from(teamMemberships)
      .where(eq(teamMemberships.teamId, teamId))

    return NextResponse.json({ members })
  } catch (err) {
    console.error('[GET /api/teams/[teamId]/members] error:', err)
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// POST /api/teams/[teamId]/members — add a member (admin only)
export async function POST(request: Request, { params }: Params) {
  let userId: string
  let teamIds: string[]
  try {
    ;({ userId, teamIds } = await resolveAuth(request))
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json(err.body, { status: err.status })
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }

  const { teamId } = await params

  if (!teamIds.includes(teamId)) {
    return NextResponse.json(
      { error: 'Team access denied', code: 'TEAM_ACCESS_DENIED' },
      { status: 403 },
    )
  }

  try {
    const isAdmin = await requireAdmin(userId, teamId)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'FORBIDDEN' },
        { status: 403 },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    const b = body as Record<string, unknown>
    const targetUserId = typeof b.userId === 'string' ? b.userId.trim() : ''

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'userId is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    const role: 'admin' | 'member' = b.role === 'admin' ? 'admin' : 'member'

    // Check if already a member
    const [existing] = await db
      .select({ id: teamMemberships.id })
      .from(teamMemberships)
      .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, targetUserId)))
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { error: 'User is already a member of this team', code: 'CONFLICT' },
        { status: 409 },
      )
    }

    const id = nanoid()
    const joinedAt = new Date(Date.now())

    await db.insert(teamMemberships).values({ id, teamId, userId: targetUserId, role, joinedAt })

    return NextResponse.json(
      { id, teamId, userId: targetUserId, role, joinedAt: joinedAt.getTime() },
      { status: 201 },
    )
  } catch (err) {
    console.error('[POST /api/teams/[teamId]/members] error:', err)
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// PATCH /api/teams/[teamId]/members — change a member's role (admin only)
export async function PATCH(request: Request, { params }: Params) {
  let userId: string
  let teamIds: string[]
  try {
    ;({ userId, teamIds } = await resolveAuth(request))
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json(err.body, { status: err.status })
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }

  const { teamId } = await params

  if (!teamIds.includes(teamId)) {
    return NextResponse.json(
      { error: 'Team access denied', code: 'TEAM_ACCESS_DENIED' },
      { status: 403 },
    )
  }

  try {
    const isAdmin = await requireAdmin(userId, teamId)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'FORBIDDEN' },
        { status: 403 },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    const b = body as Record<string, unknown>
    const targetUserId = typeof b.userId === 'string' ? b.userId.trim() : ''

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'userId is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    const newRole: 'admin' | 'member' | null =
      b.role === 'admin' ? 'admin' : b.role === 'member' ? 'member' : null

    if (!newRole) {
      return NextResponse.json(
        { error: 'role must be "admin" or "member"', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    const [existing] = await db
      .select({ id: teamMemberships.id })
      .from(teamMemberships)
      .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, targetUserId)))
      .limit(1)

    if (!existing) {
      return NextResponse.json(
        { error: 'Member not found', code: 'NOT_FOUND' },
        { status: 404 },
      )
    }

    await db
      .update(teamMemberships)
      .set({ role: newRole })
      .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, targetUserId)))

    return NextResponse.json({ success: true, userId: targetUserId, role: newRole })
  } catch (err) {
    console.error('[PATCH /api/teams/[teamId]/members] error:', err)
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// DELETE /api/teams/[teamId]/members — remove a member (admin only)
export async function DELETE(request: Request, { params }: Params) {
  let userId: string
  let teamIds: string[]
  try {
    ;({ userId, teamIds } = await resolveAuth(request))
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json(err.body, { status: err.status })
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }

  const { teamId } = await params

  if (!teamIds.includes(teamId)) {
    return NextResponse.json(
      { error: 'Team access denied', code: 'TEAM_ACCESS_DENIED' },
      { status: 403 },
    )
  }

  try {
    const isAdmin = await requireAdmin(userId, teamId)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'FORBIDDEN' },
        { status: 403 },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    const b = body as Record<string, unknown>
    const targetUserId = typeof b.userId === 'string' ? b.userId.trim() : ''

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'userId is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    const [existing] = await db
      .select({ id: teamMemberships.id })
      .from(teamMemberships)
      .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, targetUserId)))
      .limit(1)

    if (!existing) {
      return NextResponse.json(
        { error: 'Member not found', code: 'NOT_FOUND' },
        { status: 404 },
      )
    }

    await db
      .delete(teamMemberships)
      .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, targetUserId)))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/teams/[teamId]/members] error:', err)
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
