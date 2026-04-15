import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { eq, and, inArray } from 'drizzle-orm'
import Link from 'next/link'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { teams, teamMemberships, teamInvitations } from '@/lib/schema'
import { normalizeEmail } from '@/lib/invitations'
import { PendingInvitations } from '@/components/pending-invitations'
import { LeaveTeamButton } from '@/components/leave-team-button'

export default async function TeamsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      role: teamMemberships.role,
    })
    .from(teamMemberships)
    .innerJoin(teams, eq(teamMemberships.teamId, teams.id))
    .where(eq(teamMemberships.userId, userId))

  const teamIds = rows.map((team) => team.id)
  const adminCountsByTeam: Record<string, number> = {}
  if (teamIds.length > 0) {
    const allMemberships = await db
      .select({ teamId: teamMemberships.teamId, role: teamMemberships.role })
      .from(teamMemberships)
      .where(inArray(teamMemberships.teamId, teamIds))

    for (const membership of allMemberships) {
      if (membership.role === 'admin') {
        adminCountsByTeam[membership.teamId] = (adminCountsByTeam[membership.teamId] ?? 0) + 1
      }
    }
  }

  // Check if user is an admin of any team
  const isAdmin = rows.some((team) => team.role === 'admin')

  // Fetch pending invitations (only for admins)
  type PendingInviteDisplay = Array<{
    id: string
    teamId: string
    email: string
    role: 'member' | 'admin'
    status: 'pending' | 'accepted'
    invitedBy: string
    createdAt: number
    expiresAt: number | null
    acceptedAt: number | null
    teamName: string
  }>
  let pendingInvites: PendingInviteDisplay = []
  if (isAdmin) {
    try {
    const user = await currentUser()
    const primaryEmail =
      user?.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress
      ?? user?.emailAddresses[0]?.emailAddress

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
    } catch (err) {
      console.error('[TeamsPage] error fetching pending invitations:', err)
    }
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Teams</h1>
        <Link
          href="/teams/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Create Team
        </Link>
      </div>

      {/* Pending Invitations Section */}
      {isAdmin && pendingInvites.length > 0 && (
        <div className="mt-8">
          <PendingInvitations invitations={pendingInvites} onUpdate={() => {}} />
        </div>
      )}

      {/* Active Teams Section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Your Teams</h2>
        {rows.length === 0 && pendingInvites.length === 0 ? (
          <p className="mt-4 text-center text-zinc-500">
            No teams yet.{' '}
            <Link href="/teams/new" className="underline hover:text-zinc-700">
              Create your first team.
            </Link>
          </p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-zinc-500">
            No active teams yet.{' '}
            <Link href="/teams/new" className="underline hover:text-zinc-700">
              Create your first team.
            </Link>
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {rows.map((team) => (
              <li key={team.id}>
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <Link
                    href={`/teams/${team.id}`}
                    className="font-medium text-zinc-900 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300"
                  >
                    {team.name}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        team.role === 'admin'
                          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {team.role}
                    </span>
                    {(team.role === 'member' || (team.role === 'admin' && (adminCountsByTeam[team.id] ?? 0) > 1)) && (
                      <LeaveTeamButton teamId={team.id} teamName={team.name} />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
