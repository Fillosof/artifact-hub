import { eq, and } from 'drizzle-orm'
import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { teamInvitations } from '@/lib/schema'
import { resolveAuth, AuthError } from '@/lib/auth'
import { normalizeEmail } from '@/lib/invitations'

type Params = { params: Promise<{ teamId: string; invitationId: string }> }

// DELETE /api/teams/[teamId]/invitations/[invitationId] — decline a pending invitation
export async function DELETE(request: Request, { params }: Params) {
  try {
    await resolveAuth(request)
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

    // Fetch and delete the invitation
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

    // Delete the invitation
    await db.delete(teamInvitations).where(eq(teamInvitations.id, invitationId))

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('[DELETE /api/teams/[teamId]/invitations/[invitationId]] error:', err)
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
