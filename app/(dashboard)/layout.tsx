import Link from 'next/link'
import { auth, currentUser } from '@clerk/nextjs/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { teamMemberships, teams, teamInvitations } from '@/lib/schema'
import { UserNav } from '@/components/user-nav'
import { TeamSwitcher } from '@/components/team-switcher'
import { findAndAcceptInvitations, normalizeEmail } from '@/lib/invitations'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()

  let userTeams: Array<{ id: string; name: string }> = []
  let pendingCount = 0

  if (userId) {
    // Early hydration: accept any pending invitations
    try {
      const user = await currentUser()
      const primaryEmail =
        user?.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress
        ?? user?.emailAddresses[0]?.emailAddress

      if (primaryEmail) {
        await findAndAcceptInvitations(primaryEmail, userId)
      }
    } catch (err) {
      console.error('[DashboardLayout] invitation hydration failed:', err)
    }

    // Query active teams
    userTeams = await db
      .select({ id: teams.id, name: teams.name })
      .from(teamMemberships)
      .innerJoin(teams, eq(teamMemberships.teamId, teams.id))
      .where(eq(teamMemberships.userId, userId))

    // Query pending invitations
    try {
      const user = await currentUser()
      const primaryEmail =
        user?.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress
        ?? user?.emailAddresses[0]?.emailAddress

      if (primaryEmail) {
        const normalizedEmail = normalizeEmail(primaryEmail)
        const pending = await db
          .select({ id: teamInvitations.id })
          .from(teamInvitations)
          .where(
            and(
              eq(teamInvitations.email, normalizedEmail),
              eq(teamInvitations.status, 'pending')
            )
          )
        pendingCount = pending.length
      }
    } catch (err) {
      console.error('[DashboardLayout] error fetching pending count:', err)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/gallery" className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Artifact Hub
            </Link>
            <nav className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300" aria-label="Primary">
              <Link href="/gallery" className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50">
                Gallery
              </Link>
              <Link href="/teams" className="relative transition-colors hover:text-zinc-900 dark:hover:text-zinc-50">
                Teams
                {pendingCount > 0 && (
                  <span className="absolute -top-2 -right-3 inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </Link>
              <Link href="/settings" className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50">
                Api Tokens
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {userTeams.length > 0 && <TeamSwitcher teams={userTeams} />}
            <UserNav />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </>
  )
}
