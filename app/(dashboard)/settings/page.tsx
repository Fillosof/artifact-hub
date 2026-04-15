import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { eq, isNull, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { apiKeys } from '@/lib/schema'
import { ApiKeyCard } from '@/components/api-key-card'

export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [activeKey] = await db
    .select({ id: apiKeys.id, createdAt: apiKeys.createdAt })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .orderBy(apiKeys.createdAt)
    .limit(1)

  const hasKey = !!activeKey
  // Derive a cosmetic masked key from the row id (raw key is never stored)
  const maskedKey = activeKey ? `ah_****...${activeKey.id.slice(-4)}` : undefined

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Settings</h1>
      <ApiKeyCard hasKey={hasKey} maskedKey={maskedKey} />
    </div>
  )
}
