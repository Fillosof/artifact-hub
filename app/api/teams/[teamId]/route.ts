import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { teams, teamMemberships } from '@/lib/schema'
import { resolveAuth, AuthError } from '@/lib/auth'

// PATCH /api/teams/[teamId] — update team name (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  let userId: string
  try {
    ;({ userId } = await resolveAuth(request))
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(err.body, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }

  const { teamId } = await params

  // Verify admin
  const [membership] = await db
    .select({ role: teamMemberships.role })
    .from(teamMemberships)
    .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, userId)))
    .limit(1)

  if (!membership) {
    return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }
  if (membership.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('name' in body) ||
    typeof (body as Record<string, unknown>).name !== 'string'
  ) {
    return NextResponse.json({ error: 'name is required', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const name = ((body as Record<string, unknown>).name as string).trim()
  if (!name) {
    return NextResponse.json({ error: 'name cannot be empty', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const [updated] = await db
    .update(teams)
    .set({ name })
    .where(eq(teams.id, teamId))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Team not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json({ team: { id: updated.id, name: updated.name, slug: updated.slug } })
}

// DELETE /api/teams/[teamId] — delete team (admin only); cascade handles related rows
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  let userId: string
  try {
    ;({ userId } = await resolveAuth(request))
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(err.body, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }

  const { teamId } = await params

  // Verify admin
  const [membership] = await db
    .select({ role: teamMemberships.role })
    .from(teamMemberships)
    .where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, userId)))
    .limit(1)

  if (!membership) {
    return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }
  if (membership.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  await db.delete(teams).where(eq(teams.id, teamId))

  return NextResponse.json({ success: true })
}
