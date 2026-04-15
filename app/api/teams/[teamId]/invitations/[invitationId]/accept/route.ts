import { nanoid } from 'nanoid'
import { eq, and } from 'drizzle-orm'
import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { teamInvitations, teamMemberships, teams } from '@/lib/schema'
import { resolveAuth, AuthError } from '@/lib/auth'
import { normalizeEmail } from '@/lib/invitations'

type Params = { params: Promise<{ teamId: string; invitationId: string }> }

// POST /api/teams/[teamId]/invitations/[invitationId]/accept — accept a pending invitation
export async function POST(request: Request, { params }: Params) {
  let userId: string
  try {
    ;({ userId } = await resolveAuth(request))
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(err.body, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }

  const { teamId, invitationId } = await params

  try {
    const user = await currentUser()
    const primaryEmail =
      user?.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress
      ?? user?.emailAddresses[0]?.emailAddress

    if (!primaryEmail) {
      return NextResponse.json(
        { error: 'User has no email address', code: 'INVALID_INVITE' },
        { status: 400 }
      )
    }

    const normalizedEmail = normalizeEmail(primaryEmail)

    // Fetch the invitation
    const [invitation] = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.id, invitationId),
          eq(teamInvitations.teamId, teamId),
          eq(teamInvitations.email, normalizedEmail),
          eq(teamInvitations.status, 'pending')
        )
      )
      .limit(1)

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or not valid', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if invitation has expired
    if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'Invitation has expired', code: 'INVALID_INVITE' },
        { status: 400 }
      )
    }

    // Check if user already has a membership for this team
    const [existingMembership] = await db
      .select({ id: teamMemberships.id })
      .from(teamMemberships)
      .where(
        and(
          eq(teamMemberships.teamId, teamId),
          eq(teamMemberships.userId, userId)
        )
      )
      .limit(1)

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of this team', code: 'CONFLICT' },
        { status: 409 }
      )
    }

    const now = new Date(Date.now())

    // Begin transaction: update invitation + create membership
    // Update invitation status to accepted
    await db
      .update(teamInvitations)
      .set({
        status: 'accepted',
        acceptedAt: now,
      })
      .where(eq(teamInvitations.id, invitationId))

    // Create team membership
    await db.insert(teamMemberships).values({
      id: nanoid(),
      teamId,
      userId,
      role: invitation.role,
      joinedAt: now,
    })

    // Fetch team name for response
    const [team] = await db
      .select({ name: teams.name })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1)

    return NextResponse.json(
      {
        success: true,
        teamId,
        teamName: team?.name ?? 'Team',
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('[POST /api/teams/[teamId]/invitations/[invitationId]/accept] error:', err)
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
