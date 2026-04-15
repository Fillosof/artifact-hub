import Link from 'next/link'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { teams, teamMemberships } from '@/lib/schema'
import { TeamMembers } from '@/components/team-members'
import { TeamSettings } from '@/components/team-settings'

interface Props {
  params: Promise<{ teamId: string }>
}

export default async function TeamDetailPage({ params }: Props) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { teamId } = await params

  // Verify user is a member of this team
  const [membership] = await db
    .select({ role: teamMemberships.role })
    .from(teamMemberships)
    .where(and(
      eq(teamMemberships.teamId, teamId),
      eq(teamMemberships.userId, userId),
    ))
    .limit(1)

  if (!membership) redirect('/teams')

  const [team] = await db
    .select({ id: teams.id, name: teams.name, slug: teams.slug })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1)

  if (!team) redirect('/teams')

  const members = await db
    .select({
      id: teamMemberships.id,
      userId: teamMemberships.userId,
      role: teamMemberships.role,
      joinedAt: teamMemberships.joinedAt,
    })
    .from(teamMemberships)
    .where(eq(teamMemberships.teamId, teamId))

  const isAdmin = membership.role === 'admin'

  // Batch-resolve Clerk display names for all members
  const memberUserIds = members.map(m => m.userId)
  const displayNames: Record<string, string> = {}
  if (memberUserIds.length > 0) {
    const client = await clerkClient()
    const clerkUsers = await client.users.getUserList({ userId: memberUserIds })
    for (const u of clerkUsers.data) {
      const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
      displayNames[u.id] = name || u.emailAddresses[0]?.emailAddress || u.id
    }
  }

  // Convert Date → number for safe serialization to Client Component
  const serializedMembers = members.map(m => ({
    ...m,
    joinedAt: m.joinedAt.getTime(),
    displayName: displayNames[m.userId] ?? m.userId,
  }))

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/teams"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Back to Teams
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{team.name}</h1>
      <p className="mt-1 text-sm text-zinc-500">/{team.slug}</p>

      <div className="mt-8">
        <TeamMembers
          teamId={teamId}
          isAdmin={isAdmin}
          currentUserId={userId}
          initialMembers={serializedMembers}
        />
      </div>

      <TeamSettings
        teamId={teamId}
        teamName={team.name}
        teamSlug={team.slug}
        isAdmin={isAdmin}
      />
    </div>
  )
}
