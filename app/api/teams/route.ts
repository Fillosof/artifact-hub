import { nanoid } from 'nanoid'
import { eq, and } from 'drizzle-orm'
import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { teams, teamMemberships, teamInvitations } from '@/lib/schema'
import { resolveAuth, AuthError } from '@/lib/auth'
import { findAndAcceptInvitations, normalizeEmail } from '@/lib/invitations'

// GET /api/teams — list all teams the authenticated user belongs to (with their role) + pending invitations
export async function GET(request: Request) {
  let userId: string
  try {
    ;({ userId } = await resolveAuth(request))
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(err.body, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }

  let primaryEmail: string | undefined
  try {
    const user = await currentUser()
    primaryEmail =
      user?.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress
      ?? user?.emailAddresses[0]?.emailAddress

    if (primaryEmail) {
      await findAndAcceptInvitations(primaryEmail, userId)
    }
  } catch (err) {
    console.error('[GET /api/teams] invitation hydration failed:', err)
  }

  try {
    // Query active teams
    const rows = await db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        createdBy: teams.createdBy,
        createdAt: teams.createdAt,
        role: teamMemberships.role,
      })
      .from(teamMemberships)
      .innerJoin(teams, eq(teamMemberships.teamId, teams.id))
      .where(eq(teamMemberships.userId, userId))

    // Query pending invitations for this email
    type PendingInviteRow = {
      id: string
      teamId: string
      email: string
      role: 'member' | 'admin'
      status: 'pending' | 'accepted'
      invitedBy: string
      createdAt: Date
      expiresAt: Date | null
      acceptedAt: Date | null
      teamName: string
    }

    let pendingInvites: Array<Omit<PendingInviteRow, 'createdAt' | 'expiresAt' | 'acceptedAt'> & {
      createdAt: number
      expiresAt: number | null
      acceptedAt: number | null
    }> = []
    if (primaryEmail) {
      const normalizedEmail = normalizeEmail(primaryEmail)
      const dbRows = await db
        .select({
          id: teamInvitations.id,
          teamId: teamInvitations.teamId,
          email: teamInvitations.email,
          role: teamInvitations.role,
          status: teamInvitations.status,
          invitedBy: teamInvitations.invitedBy,
          createdAt: teamInvitations.createdAt,
          expiresAt: teamInvitations.expiresAt,
          acceptedAt: teamInvitations.acceptedAt,
          teamName: teams.name,
        })
        .from(teamInvitations)
        .innerJoin(teams, eq(teamInvitations.teamId, teams.id))
        .where(
          and(
            eq(teamInvitations.email, normalizedEmail),
            eq(teamInvitations.status, 'pending')
          )
        )

      pendingInvites = dbRows.map((row) => ({
        ...row,
        createdAt: row.createdAt.getTime(),
        expiresAt: row.expiresAt?.getTime() ?? null,
        acceptedAt: row.acceptedAt?.getTime() ?? null,
      }))
    }

    return NextResponse.json({
      teams: rows,
      pendingInvitations: pendingInvites,
    })
  } catch (err) {
    console.error('[GET /api/teams] error:', err)
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// POST /api/teams — create a new team (caller becomes admin member)
export async function POST(request: Request) {
  let userId: string
  try {
    ;({ userId } = await resolveAuth(request))
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(err.body, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
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
    typeof (body as Record<string, unknown>).name !== 'string' ||
    typeof (body as Record<string, unknown>).slug !== 'string'
  ) {
    return NextResponse.json(
      { error: 'name and slug are required', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const { name, slug } = body as { name: string; slug: string }
  const trimmedName = name.trim()
  const trimmedSlug = slug.trim()

  if (!trimmedName || !trimmedSlug) {
    return NextResponse.json(
      { error: 'name and slug must not be empty', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
    return NextResponse.json(
      { error: 'Slug must contain only lowercase letters, numbers, and hyphens', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    // Check slug uniqueness
    const [existing] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.slug, trimmedSlug))
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { error: 'This team slug is already taken', code: 'VALIDATION_ERROR' },
        { status: 409 }
      )
    }

    const teamId = nanoid()
    const now = new Date(Date.now())

    await db.insert(teams).values({
      id: teamId,
      name: trimmedName,
      slug: trimmedSlug,
      createdBy: userId,
      createdAt: now,
    })

    await db.insert(teamMemberships).values({
      id: nanoid(),
      teamId,
      userId,
      role: 'admin',
      joinedAt: now,
    })

    return NextResponse.json(
      {
        team: {
          id: teamId,
          name: trimmedName,
          slug: trimmedSlug,
          createdBy: userId,
          createdAt: now.toISOString(),
          role: 'admin',
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/teams] error:', err)
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
