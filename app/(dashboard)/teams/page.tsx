import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { db } from '@/lib/db'
import { teams, teamMemberships } from '@/lib/schema'

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

      {rows.length === 0 ? (
        <p className="mt-12 text-center text-zinc-500">
          No teams yet.{' '}
          <Link href="/teams/new" className="underline hover:text-zinc-700">
            Create your first team.
          </Link>
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((team) => (
            <li key={team.id}>
              <Link
                href={`/teams/${team.id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{team.name}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    team.role === 'admin'
                      ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {team.role}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
