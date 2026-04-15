import crypto from 'node:crypto'
import { auth } from '@clerk/nextjs/server'
import { eq, isNull, and } from 'drizzle-orm'
import { db } from './db'
import { apiKeys, teamMemberships } from './schema'
import type { ApiError } from './types'

export class AuthError extends Error {
  readonly body: ApiError
  readonly status: number

  constructor(body: ApiError, status = 401) {
    super(body.error)
    this.body = body
    this.status = status
    this.name = 'AuthError'
  }
}

async function getTeamIds(userId: string): Promise<string[]> {
  const memberships = await db
    .select({ teamId: teamMemberships.teamId })
    .from(teamMemberships)
    .where(eq(teamMemberships.userId, userId))
  return memberships.map((m) => m.teamId)
}

export async function resolveAuth(request: Request): Promise<{ userId: string; teamIds: string[] }> {
  // 1. Try Clerk session first
  const { userId } = await auth()
  if (userId) {
    return { userId, teamIds: await getTeamIds(userId) }
  }

  // 2. Try Authorization: Bearer <apiKey>
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const rawKey = authHeader.slice(7)
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')

    const [keyRow] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
      .limit(1)

    if (keyRow) {
      return { userId: keyRow.userId, teamIds: await getTeamIds(keyRow.userId) }
    }
  }

  // 3. No valid auth
  throw new AuthError({ error: 'Authentication required', code: 'AUTH_REQUIRED' })
}
