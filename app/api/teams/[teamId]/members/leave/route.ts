import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { teamMemberships } from '@/lib/schema'
import { resolveAuth, AuthError } from '@/lib/auth'

type Params = { params: Promise<{ teamId: string }> }

// DELETE /api/teams/[teamId]/members/leave — leave team as current user
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
    const [membership] = await db
      .select({ role: teamMemberships.role })
      .from(teamMemberships)
      .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, userId)))
      .limit(1)

    if (!membership) {
      return NextResponse.json(
        { error: 'Member not found', code: 'NOT_FOUND' },
        { status: 404 },
      )
    }

    if (membership.role === 'admin') {
      const adminMemberships = await db
        .select({ id: teamMemberships.id })
        .from(teamMemberships)
        .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.role, 'admin')))

      if (adminMemberships.length <= 1) {
        return NextResponse.json(
          { error: 'At least one admin must remain on the team', code: 'CONFLICT' },
          { status: 409 },
        )
      }
    }

    await db
      .delete(teamMemberships)
      .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, userId)))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/teams/[teamId]/members/leave] error:', err)
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}