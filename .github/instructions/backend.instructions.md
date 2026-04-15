---
applyTo: "lib/**/*.ts,app/api/**/*.ts,mcp-server/**/*.ts"
description: "Backend-specific Copilot instructions for Artifact Hub"
---

# Backend Instructions — Artifact Hub

## Auth & Authorization

- **Web routes**: resolve auth via `lib/auth.ts → resolveAuth(request)` (returns `{ userId, teamIds }`). This is a placeholder until Story 1.4 implements full Clerk session verification.
- **MCP routes**: resolve auth via `Authorization: Bearer <api_key>` header → SHA-256 hash → lookup `api_keys` table where `revokedAt IS NULL` → get `userId`.
- **Every handler must verify auth before any DB access.** Unauthenticated → 401. Valid auth but wrong team or role → 403.

## Team Scoping (Critical Security Invariant)

Every DB query touching `artifacts`, `artifact_tags`, `comments`, or `team_memberships` **must** join or filter by `teamId`. Leaking cross-team data is a security bug.

```typescript
// ✅ DO — always filter by authenticated team
const rows = await db.select().from(artifacts)
  .where(eq(artifacts.teamId, teamId))

// ❌ DON'T — unscoped query leaks all teams' data
const rows = await db.select().from(artifacts)
```

## Database Patterns

- **IDs**: always `nanoid()` — IDs are `text`, not `integer`. See `lib/schema.ts`.
- **Timestamps**: `integer('created_at', { mode: 'timestamp_ms' })` — stored as Unix milliseconds, read back as `Date`.
- **Types**: derive DB row types from Drizzle: `typeof artifacts.$inferSelect` / `$inferInsert`. Do not write hand-rolled interfaces that mirror the schema.
- **No raw SQL**: use Drizzle's type-safe query builder exclusively.
- **Tag normalization**: lowercase + trim before writing to `artifact_tags` (FR33). Max 8 tags per artifact — enforce on write.

```typescript
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { artifacts } from '@/lib/schema'

const id = nanoid()
await db.insert(artifacts).values({
  id,
  teamId,
  title,
  fileUrl,           // internal Blob URL — never return this to client
  fileName,
  fileType,
  createdBy: userId,
  createdAt: new Date(),
  enrichmentStatus: 'pending',
})
```

## File Security — Never Return Raw Blob URLs

`artifacts.fileUrl` is an internal Vercel Blob URL. It **must never** appear in API responses, `<img src>`, or `<iframe src>`. All file access goes through an authenticated proxy route (Story 3.1).

```typescript
// ❌ DON'T
return Response.json({ fileUrl: artifact.fileUrl })

// ✅ DO — return a proxy URL
return Response.json({ previewUrl: `/api/artifacts/${artifact.id}/file` })
```

## API Key Handling

- **Generate**: `nanoid()` or `crypto.randomUUID()` for the raw key — return to user **once only**, never store.
- **Hash**: `createHash('sha256').update(rawKey).digest('hex')` — store the hex hash in `api_keys.key_hash`.
- **Verify**: hash the incoming bearer token and compare with `api_keys.key_hash` where `revokedAt IS NULL`.

```typescript
import { createHash } from 'crypto'

const keyHash = createHash('sha256').update(rawKey).digest('hex')
```

## Enrichment Lifecycle

Enrichment is async — never block the publish response on AI completion.

```
1. Insert artifact with enrichmentStatus: 'pending'
2. Return 201 to caller immediately
3. Trigger enrichArtifact(id) asynchronously (fire-and-forget or background)
4. enrichArtifact updates: summary, tags, enrichmentStatus: 'complete' | 'failed'
```

On Claude API error: set `enrichmentStatus: 'failed'`, log the error (no PII in logs), do **not** throw — the artifact record is valid and must not be rolled back.

## Error Handling

Return structured JSON — never expose stack traces to callers.

| Status | Meaning |
|---|---|
| 400 | Validation error (missing required field, bad format, file too large) |
| 401 | Missing or invalid auth (no token, bad hash, revoked key) |
| 403 | Valid auth but wrong team or insufficient role (member vs. admin) |
| 404 | Resource not found — check auth first to avoid leaking existence |
| 500 | Unexpected server error — log internally, return generic message |

```typescript
return Response.json({ error: 'Resource not found' }, { status: 404 })
```

## Adding a New API Route — Checklist

- [ ] Auth check at the very top of the handler (before any DB access)
- [ ] Team membership verified before returning any data
- [ ] Response does not include `fileUrl` or any raw Blob URL
- [ ] All error responses are structured `{ error: string }` JSON
- [ ] A Vitest test exists in `lib/__tests__/` or an adjacent `__tests__/` folder
- [ ] `npm run typecheck && npm run lint && npm run test` all pass
