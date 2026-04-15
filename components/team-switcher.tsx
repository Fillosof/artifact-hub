'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface TeamOption {
  id: string
  name: string
}

interface TeamSwitcherInnerProps {
  teams: TeamOption[]
}

function TeamSwitcherInner({ teams }: TeamSwitcherInnerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTeam = searchParams.get('team') ?? ''

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const teamId = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (teamId) {
      params.set('team', teamId)
    } else {
      params.delete('team')
    }
    router.replace(`/gallery?${params.toString()}`)
  }

  if (teams.length === 0) return null

  return (
    <select
      value={currentTeam}
      onChange={handleChange}
      className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      aria-label="Switch team"
    >
      <option value="">All teams</option>
      {teams.map(team => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  )
}

interface TeamSwitcherProps {
  teams: TeamOption[]
}

export function TeamSwitcher({ teams }: TeamSwitcherProps) {
  return (
    <Suspense fallback={null}>
      <TeamSwitcherInner teams={teams} />
    </Suspense>
  )
}
