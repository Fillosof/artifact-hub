import crypto from 'node:crypto'
import { eq, isNull, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiKeys } from '@/lib/schema'
import { resolveAuth, AuthError } from '@/lib/auth'

// POST /api/keys — generate or regenerate an MCP API key
export async function POST(request: Request) {
  let userId: string
  try {
    ;({ userId } = await resolveAuth(request))
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(err.body, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }

  try {
    // Revoke any existing active key for this user
    const [existingKey] = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
      .limit(1)

    if (existingKey) {
      await db
        .update(apiKeys)
        .set({ revokedAt: new Date(Date.now()) })
        .where(eq(apiKeys.id, existingKey.id))
    }

    // Generate new raw key: ah_ prefix + 32 random bytes as hex = 67 chars total
    const rawKey = `ah_${crypto.randomBytes(32).toString('hex')}`
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
    const id = nanoid()
    const createdAt = new Date(Date.now())

    await db.insert(apiKeys).values({ id, userId, keyHash, createdAt })

    return NextResponse.json({ key: rawKey, keyId: id, createdAt: createdAt.toISOString() }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/keys] error:', err)
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// DELETE /api/keys — revoke the active MCP API key
export async function DELETE(request: Request) {
  let userId: string
  try {
    ;({ userId } = await resolveAuth(request))
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(err.body, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }

  try {
    const [existingKey] = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
      .limit(1)

    if (!existingKey) {
      return NextResponse.json({ error: 'No active key', code: 'NOT_FOUND' }, { status: 404 })
    }

    await db
      .update(apiKeys)
      .set({ revokedAt: new Date(Date.now()) })
      .where(eq(apiKeys.id, existingKey.id))

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('[DELETE /api/keys] error:', err)
    return NextResponse.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
