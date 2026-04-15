# Story 1.4: Core API Infrastructure (resolveAuth + Error Patterns)

Status: done

## Story

As a developer,
I want a shared `resolveAuth()` helper and standardized error response patterns,
So that all API routes handle authentication and errors consistently.

## Acceptance Criteria

1. **Given** `lib/auth.ts` **When** `resolveAuth(request)` is called with a request containing a valid Clerk session cookie **Then** it returns `{ userId: string, teamIds: string[] }` where `teamIds` contains all teams the user is a member of.

2. **Given** `lib/auth.ts` **When** `resolveAuth(request)` is called with a request containing a valid `Authorization: Bearer <apiKey>` header **Then** it hashes the key (SHA-256), looks up the matching non-revoked row in `api_keys`, retrieves the associated user's team memberships, and returns `{ userId, teamIds }`.

3. **Given** `lib/auth.ts` **When** `resolveAuth(request)` is called with no valid auth (no cookie, no API key header, or invalid/revoked key) **Then** it throws an `AuthError` that causes the calling API route to respond with `{ error: "Authentication required", code: "AUTH_REQUIRED" }` and HTTP 401.

4. **Given** any API route in `app/api/` **When** I inspect the route code **Then** `resolveAuth(request)` is called as the first operation before any business logic executes.

5. **Given** any API route error case **When** an error occurs **Then** the response is a structured JSON object `{ error: string, code: string, detail?: string }` using one of the standardized error codes; no stack traces or internal details are exposed; the error is logged server-side with `console.error`.

6. **Given** `lib/types.ts` **When** I inspect it **Then** it exports shared TypeScript types: `Artifact`, `Team`, `TeamMembership`, `Comment`, `ApiKey`, `ApiError` — all strongly typed with no `any`.

## Tasks / Subtasks

- [x] Task 1: Implement shared types in `lib/types.ts` (AC: #6)
  - [x] Export `Team`, `TeamMembership`, `Artifact`, `Comment`, `ApiKey` using `$inferSelect` from `lib/schema.ts`
  - [x] Export `ErrorCode` union type with all standardized error codes from ARCH11
  - [x] Export `ApiError` interface `{ error: string; code: ErrorCode; detail?: string }`

- [x] Task 2: Implement `resolveAuth()` in `lib/auth.ts` (AC: #1, #2, #3)
  - [x] Export `AuthError` class extending `Error` with `body: ApiError` and `status: number`
  - [x] Call `auth()` from `@clerk/nextjs/server` — if `userId` is non-null, fetch team IDs from DB and return
  - [x] If no Clerk session, check `Authorization: Bearer <key>` header; hash with `crypto.createHash('sha256')`
  - [x] Query `api_keys` for matching hash where `revokedAt IS NULL`; if found, fetch team IDs and return
  - [x] If neither path succeeds, throw `AuthError({ error: 'Authentication required', code: 'AUTH_REQUIRED' })`

- [x] Task 3: Write unit tests in `lib/__tests__/auth.test.ts` (AC: #1, #2, #3)
  - [x] Mock `@clerk/nextjs/server` to control `auth()` return value
  - [x] Mock `@/lib/db` to control DB query results
  - [x] Test: Clerk auth path → returns `{ userId, teamIds }` from DB memberships
  - [x] Test: API key path → hashes key, looks up in DB, returns `{ userId, teamIds }`
  - [x] Test: No auth → throws `AuthError` with `AUTH_REQUIRED` code
  - [x] Test: Revoked/invalid API key → throws `AuthError` with `AUTH_REQUIRED` code

## Dev Notes

### AuthError class

```typescript
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
```

### Clerk auth() usage

Use `auth()` from `@clerk/nextjs/server` — works in both route handlers and server components in Next.js 16 App Router. Returns `{ userId: string | null }`. Do NOT pass the request object to it; Clerk reads the session from Next.js request context automatically.

```typescript
import { auth } from '@clerk/nextjs/server'
const { userId } = await auth()
```

### API key hashing

```typescript
import crypto from 'node:crypto'
const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
```

### Standardized error codes (ARCH11)

`AUTH_REQUIRED`, `TEAM_ACCESS_DENIED`, `NOT_FOUND`, `FORBIDDEN`, `VALIDATION_ERROR`, `FILE_TOO_LARGE`, `ENRICHMENT_FAILED`, `INTERNAL_ERROR`

### Test mock pattern for DB chain

```typescript
vi.mock('@/lib/db', () => ({ db: { select: vi.fn() } }))

// Per-test: configure mockReturnValueOnce for each db.select() call
vi.mocked(db.select).mockReturnValueOnce({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([{ teamId: 'team_1' }]),
  }),
} as unknown as ReturnType<typeof db.select>)
```

## File List

- `lib/types.ts` — shared TypeScript types
- `lib/auth.ts` — `resolveAuth()` implementation + `AuthError` class
- `lib/__tests__/auth.test.ts` — unit tests for resolveAuth

## Dev Agent Record

### Debug Log

_Empty_

### Completion Notes

All ACs satisfied. `resolveAuth` handles Clerk session auth, API key Bearer token auth (SHA-256 hashed), and throws `AuthError` with `AUTH_REQUIRED` when neither path succeeds. `lib/types.ts` exports all required types using Drizzle `$inferSelect`. 10 unit tests added, all 25 tests pass. Gates: typecheck ✓, lint ✓, test ✓, build ✓.

### Change Log

| File | Change |
|---|---|
| `lib/types.ts` | Implemented all shared types (Team, TeamMembership, Artifact, Comment, ApiKey, ErrorCode, ApiError) |
| `lib/auth.ts` | Replaced placeholder with full `resolveAuth()` + `AuthError` class |
| `lib/__tests__/auth.test.ts` | Created — 10 unit tests covering all auth paths |
