---
title: 'MCP API Key Generation & Revocation'
type: 'feature'
created: '2026-04-15'
status: 'done'
baseline_commit: 'c896639c300c1f3beaff3339e2e4e721a2bb6ec5'
context:
  - docs/implementation-artifacts/epic-1-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Users have no way to generate an MCP API key, so MCP clients like Claude Desktop cannot authenticate as them to publish or search artifacts.

**Approach:** Add a Settings page (`/settings`) with an "MCP API Key" card and back it with `POST /api/keys` (generate/regenerate) and `DELETE /api/keys` (revoke) endpoints. The raw key is shown exactly once after generation and never stored.

## Boundaries & Constraints

**Always:**
- Hash every key with SHA-256 before writing to DB; never store or return the raw key after the initial response.
- One active key per user at a time — `POST /api/keys` when a key exists must first set `revokedAt` on the old row, then insert a new one (in a transaction or sequentially; Turso/SQLite serializes writes).
- `DELETE /api/keys` sets `revokedAt` on the active row; never deletes rows.
- Raw key format: `ah_` prefix + `crypto.randomBytes(32).toString('hex')` (67 chars total).
- `resolveAuth` must be called first in each API route handler.
- The settings page is behind the `app/(dashboard)/` layout (already auth-protected by Clerk middleware).

**Ask First:**
- If a user has zero active keys and hits `DELETE /api/keys`, ask before deciding behavior (return 404 vs. no-op 200).

**Never:**
- Return `fileUrl` or any internal storage URL in key-related responses.
- Store the raw key anywhere (DB, logs, response body on any call after the initial POST).
- Allow cross-user key access — every DB query filters by `userId` from `resolveAuth`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Generate (no existing key) | `POST /api/keys`, no active key in DB | 201 `{ key: "ah_...", keyId, createdAt }` | — |
| Regenerate (existing active key) | `POST /api/keys`, active key exists | Old key's `revokedAt` set; new key inserted; 201 `{ key, keyId, createdAt }` | — |
| Revoke | `DELETE /api/keys`, active key exists | `revokedAt` set to now; 200 `{ success: true }` | — |
| Revoke (no active key) | `DELETE /api/keys`, no active key | 404 `{ error: "No active key", code: "NOT_FOUND" }` | — |
| Old key used after revoke | `resolveAuth` with `Authorization: Bearer <revokedKey>` | 401 `AUTH_REQUIRED` (handled in existing `lib/auth.ts`) | — |
| Unauthenticated request | Any `/api/keys` call, no session | 401 `AUTH_REQUIRED` via `resolveAuth` | — |

</frozen-after-approval>

## Code Map

- `lib/schema.ts` — `apiKeys` table definition (already exists; `id`, `userId`, `keyHash`, `createdAt`, `revokedAt`)
- `lib/auth.ts` — `resolveAuth()` (already handles API key validation; no changes needed)
- `lib/types.ts` — `ApiKey`, `ApiError`, `ErrorCode` (already exists)
- `lib/db.ts` — Drizzle client singleton
- `app/api/keys/route.ts` — **NEW** POST + DELETE handlers for key generation and revocation
- `app/(dashboard)/settings/page.tsx` — **NEW** Settings page with MCP API Key card (Server Component shell + Client Component for interactive UI)
- `components/api-key-card.tsx` — **NEW** Client Component: renders masked key / key display / generate/revoke buttons
- `lib/__tests__/api-keys.test.ts` — **NEW** Vitest tests for the route logic

## Tasks & Acceptance

**Execution:**

- [x] `app/api/keys/route.ts` -- implement `POST` handler: call `resolveAuth`, find active key for user, revoke if exists, generate raw key (`ah_` + `randomBytes(32).toString('hex')`), hash with SHA-256, insert new row, return `{ key, keyId, createdAt }` with HTTP 201
- [x] `app/api/keys/route.ts` -- implement `DELETE` handler: call `resolveAuth`, find active key for user, return 404 `NOT_FOUND` if none, else set `revokedAt = Date.now()` and return `{ success: true }` with HTTP 200
- [x] `components/api-key-card.tsx` -- create `"use client"` component: props `{ hasKey: boolean; maskedKey?: string }` — renders generate/regenerate/revoke buttons; calls `/api/keys` via fetch; after successful POST shows key once in `<code>` block with copy button + warning; after dismiss shows masked key; uses `useRouter().refresh()` to sync server state
- [x] `app/(dashboard)/settings/page.tsx` -- create Server Component: fetch user's active key from DB (select `id`, `createdAt` — NOT `keyHash`), derive `maskedKey` (`ah_****...` + last 4 of id), render page heading + `<ApiKeyCard>` with props
- [x] `lib/__tests__/api-keys.test.ts` -- write tests covering: POST no-key → 201 with key; POST with existing key → revokes old + returns new 201; DELETE with key → 200; DELETE no key → 404; unauthenticated → 401 (mock `resolveAuth` to throw `AuthError`)

**Acceptance Criteria:**
- Given an authenticated user visits `/settings`, when they have no active key, then they see a "Generate API Key" button and no masked key.
- Given an authenticated user clicks "Generate API Key", when `POST /api/keys` succeeds, then the raw key is displayed once in a code block with a "Copy" button and text "This key will not be shown again."
- Given the user dismisses the key display, when the UI updates, then only the masked key (`ah_****...****`) and "Regenerate"/"Revoke" buttons are shown.
- Given an authenticated user clicks "Regenerate", when `POST /api/keys` executes, then the previously active key has `revokedAt` set and a new raw key is returned.
- Given an authenticated user clicks "Revoke", when `DELETE /api/keys` executes, then `revokedAt` is set; subsequent Bearer auth with the old key returns 401.
- Given an unauthenticated request hits `POST /api/keys` or `DELETE /api/keys`, then the response is HTTP 401 with `{ code: "AUTH_REQUIRED" }`.

## Design Notes

**Masking the key in the settings page:** The raw key is never stored, so masking is derived from `id` (nanoid) — display as `ah_****...` + last 4 chars of the `id` field. This is cosmetic only; the actual key is unrelated to the row ID.

**Key format for copy display:** After POST, the response includes `key` (the full raw value), `keyId` (the row `id`), and `createdAt`. Show the full `key` in the code block.

**Server Component / Client Component split:** The settings page (`page.tsx`) fetches the active key metadata server-side (only `id` + `createdAt`, never `keyHash`). It passes `hasKey` and `maskedKey` props to `<ApiKeyCard>`. The card handles all interactivity (`"use client"`).

**DB query in settings page:** Use Drizzle to select the most recent non-revoked key for the user. Filter `isNull(apiKeys.revokedAt)` and `eq(apiKeys.userId, userId)`. Order by `createdAt DESC`, limit 1.

## Verification

**Commands:**
- `npm run typecheck` -- expected: zero errors
- `npm run lint` -- expected: zero errors
- `npm run test` -- expected: all tests pass including new `api-keys.test.ts`
- `npm run build` -- expected: clean build
