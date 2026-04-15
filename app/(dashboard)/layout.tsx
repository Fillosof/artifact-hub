import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { teamMemberships, teams } from '@/lib/schema'
import { UserNav } from '@/components/user-nav'
import { TeamSwitcher } from '@/components/team-switcher'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()

  let userTeams: Array<{ id: string; name: string }> = []
  if (userId) {
    userTeams = await db
      .select({ id: teams.id, name: teams.name })
      .from(teamMemberships)
      .innerJoin(teams, eq(teamMemberships.teamId, teams.id))
      .where(eq(teamMemberships.userId, userId))
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
          <Link href="/gallery" className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Artifact Hub
          </Link>
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
