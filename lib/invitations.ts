import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from './db'
import { teamInvitations, teamMemberships } from './schema'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INVITATION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(normalizeEmail(email))
}

export function invitationExpiresAt(nowMs: number = Date.now()): Date {
  return new Date(nowMs + INVITATION_TTL_MS)
}

export async function findAndAcceptInvitations(
  email: string,
  userId: string,
  now: Date = new Date(),
): Promise<{ acceptedInvitations: number; skippedInvitations: number }> {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail) {
    return { acceptedInvitations: 0, skippedInvitations: 0 }
  }

  const pendingInvites = await db
    .select({
      id: teamInvitations.id,
      teamId: teamInvitations.teamId,
      role: teamInvitations.role,
      status: teamInvitations.status,
      expiresAt: teamInvitations.expiresAt,
    })
    .from(teamInvitations)
    .where(and(eq(teamInvitations.email, normalizedEmail), eq(teamInvitations.status, 'pending')))

  let acceptedInvitations = 0
  let skippedInvitations = 0

  for (const invite of pendingInvites) {
    if (invite.status !== 'pending') {
      skippedInvitations += 1
      continue
    }

    if (invite.expiresAt && invite.expiresAt.getTime() <= now.getTime()) {
      skippedInvitations += 1
      continue
    }

    const [existingMembership] = await db
      .select({ id: teamMemberships.id })
      .from(teamMemberships)
      .where(and(eq(teamMemberships.teamId, invite.teamId), eq(teamMemberships.userId, userId)))
      .limit(1)

    if (!existingMembership) {
      await db.insert(teamMemberships).values({
        id: nanoid(),
        teamId: invite.teamId,
        userId,
        role: invite.role,
        joinedAt: now,
      })
    }

    await db
      .update(teamInvitations)
      .set({ status: 'accepted', acceptedAt: now })
      .where(and(eq(teamInvitations.id, invite.id), eq(teamInvitations.status, 'pending')))

    acceptedInvitations += 1
  }

  return { acceptedInvitations, skippedInvitations }
}
