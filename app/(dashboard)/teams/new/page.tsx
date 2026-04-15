import Link from 'next/link'
import { CreateTeamForm } from '@/components/create-team-form'

export default function CreateTeamPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6">
        <Link
          href="/teams"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Back to Teams
        </Link>
      </div>
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Create a New Team
      </h1>
      <CreateTeamForm />
    </div>
  )
}
