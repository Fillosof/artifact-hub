import { clerkClient } from '@clerk/nextjs/server'

export async function getUserDisplayName(userId: string): Promise<string> {
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    if (fullName) return fullName
    const primaryEmail = user.emailAddresses[0]?.emailAddress
    if (primaryEmail) return primaryEmail
    return userId
  } catch {
    return userId
  }
}
