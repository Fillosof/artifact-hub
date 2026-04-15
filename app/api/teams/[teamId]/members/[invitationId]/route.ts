import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { teamInvitations, teamMemberships } from '@/lib/schema'
import { AuthError, resolveAuth } from '@/lib/auth'

type Params = { params: Promise<{ teamId: string; invitationId: string }> }

async function requireAdmin(userId: string, teamId: string): Promise<boolean> {
  const [membership] = await db
    .select({ role: teamMemberships.role })
    .from(teamMemberships)
    .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, userId)))
    .limit(1)

  return membership?.role === 'admin'
}

// DELETE /api/teams/[teamId]/members/[invitationId] — cancel pending invitation (admin only)
export async function DELETE(request: Request, { params }: Params) {
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

  const { teamId, invitationId } = await params

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

    const [invitation] = await db
      .select({ id: teamInvitations.id, status: teamInvitations.status })
      .from(teamInvitations)
      .where(and(eq(teamInvitations.id, invitationId), eq(teamInvitations.teamId, teamId)))
      .limit(1)

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invitation is no longer pending', code: 'INVALID_INVITE' },
        { status: 400 },
      )
    }

    await db
      .delete(teamInvitations)
      .where(
        and(
          eq(teamInvitations.id, invitationId),
          eq(teamInvitations.teamId, teamId),
          eq(teamInvitations.status, 'pending'),
        ),
      )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/teams/[teamId]/members/[invitationId]] error:', err)
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
