---
title: 'Story 3.1: File Upload API & Authenticated File Proxy'
type: 'feature'
created: '2026-04-15'
status: 'done'
baseline_commit: '1c06fece3e7536641608b8c4a1f0a5b54dfc4216'
context:
  - 'docs/implementation-artifacts/epic-3-context.md'
  - 'lib/schema.ts'
  - 'lib/auth.ts'
  - 'lib/types.ts'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Members cannot yet upload files to their team, and there is no secure way to retrieve uploaded files — raw Blob URLs must never reach clients.

**Approach:** Add `POST /api/teams/[teamId]/artifacts` to accept multipart uploads, validate size/MIME server-side, store in Vercel Blob, and persist an artifact row; add `GET /api/files/[artifactId]` to proxy blob content only to authenticated team members.

## Boundaries & Constraints

**Always:**
- `resolveAuth()` first in every route handler; any `AuthError` returns immediately.
- Verify caller belongs to the target team before any DB or blob access.
- Reject files > 10 MB with HTTP 400 and `FILE_TOO_LARGE`; check BEFORE blob write.
- Store `fileUrl` in DB but never include it in any API response.
- Response for POST must not be delayed by enrichment (story 3.3 wires the fire-and-forget later).
- Use `nanoid()` for artifact PK; `timestamp_ms` integer for `createdAt`.
- All Drizzle queries type-safe — no raw SQL.

**Ask First:**
- If the MIME type list needs explicit block-listing or allow-listing beyond what's described.

**Never:**
- Expose `fileUrl` in any API response shape.
- Block the POST response waiting for AI enrichment.
- Trust client-supplied Content-Type as the source of truth for `fileType` (read from the File object's `.type` after server-side parse).
- Delete the artifact row on enrichment failure (story 3.3 concern, but pattern established here).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Successful upload | Multipart: `file` (≤10MB), `title` (string), optional `sourceUrl` | HTTP 201 — `{ artifact: { id, title, fileType, fileName, sourceUrl, enrichmentStatus: 'pending', createdBy, createdAt, tags: [], summary: null } }` | N/A |
| File too large | Multipart: file > 10MB | HTTP 400 — `{ error: "File exceeds the 10MB limit", code: "FILE_TOO_LARGE" }` | Return before any blob write |
| Missing file or title | Multipart: missing required field | HTTP 400 — `{ error: "...", code: "VALIDATION_ERROR" }` | N/A |
| Not a team member | Caller's `teamIds` does not include `teamId` | HTTP 403 — `{ error: "...", code: "TEAM_ACCESS_DENIED" }` | N/A |
| No auth | No Clerk session, no Bearer token | HTTP 401 — `{ error: "...", code: "AUTH_REQUIRED" }` | N/A |
| Proxy — member access | `GET /api/files/[artifactId]` by team member | Stream blob bytes; `Content-Type` mirrors original `fileType`; `Content-Disposition: attachment; filename="originalFileName"` | N/A |
| Proxy — non-member | Caller not in artifact's team | HTTP 403 — `TEAM_ACCESS_DENIED` | N/A |
| Proxy — no auth | No session or API key | HTTP 401 — `AUTH_REQUIRED` | N/A |
| Proxy — artifact not found | `artifactId` absent from DB | HTTP 404 — `NOT_FOUND` | N/A |

</frozen-after-approval>

## Code Map

- `app/api/teams/[teamId]/artifacts/route.ts` -- new: POST handler for artifact upload
- `app/api/files/[artifactId]/route.ts` -- new: GET handler for authenticated file proxy
- `lib/schema.ts` -- read: `artifacts`, `artifactTags`, `teamMemberships` tables
- `lib/auth.ts` -- read: `resolveAuth`, `AuthError`
- `lib/types.ts` -- read: `ErrorCode`, `Artifact`
- `lib/db.ts` -- read: Drizzle client
- `lib/__tests__/artifacts.test.ts` -- new: unit tests for both routes (mocked DB + auth + blob)

## Tasks & Acceptance

**Execution:**
- [x] `app/api/teams/[teamId]/artifacts/route.ts` -- create POST handler: resolveAuth → verify team membership → parse formData → validate size (≤10MB) and presence of file+title → `put()` to Vercel Blob → Drizzle insert into `artifacts` → return 201 with artifact shape (no fileUrl)
- [x] `app/api/files/[artifactId]/route.ts` -- create GET handler: resolveAuth → Drizzle select artifact by id → verify caller's teamIds includes artifact.teamId → server-side fetch(fileUrl) → stream response with Content-Type and Content-Disposition headers
- [x] `lib/__tests__/artifacts.test.ts` -- create Vitest tests covering all I/O Matrix scenarios for both routes (mock `@/lib/auth`, `@/lib/db`, `@vercel/blob`)

**Acceptance Criteria:**
- Given a valid multipart POST to `/api/teams/[teamId]/artifacts`, when the file is ≤10MB and the caller is a team member, then HTTP 201 is returned with all artifact fields except `fileUrl`, and `enrichmentStatus` is `'pending'`.
- Given a file > 10MB, when submitted, then HTTP 400 with `FILE_TOO_LARGE` is returned and no blob write occurs.
- Given `GET /api/files/[artifactId]`, when the caller is an authenticated team member, then the blob bytes are proxied with correct `Content-Disposition` header.
- Given `GET /api/files/[artifactId]`, when the caller has no valid auth, then HTTP 401 with `AUTH_REQUIRED`.
- Given `GET /api/files/[artifactId]`, when the caller is not a member of the artifact's team, then HTTP 403 with `TEAM_ACCESS_DENIED`.

## Verification

**Commands:**
- `npm run typecheck` -- expected: 0 errors
- `npm run lint` -- expected: 0 errors
- `npm run test` -- expected: all tests pass including new artifacts.test.ts
- `npm run build` -- expected: successful build

## Suggested Review Order

**Upload route — security boundary**

- `resolveAuth` called first; teamIds membership checked before formData parsed
  [`artifacts/route.ts:17`](../../app/api/teams/[teamId]/artifacts/route.ts#L17)

- Size check before blob write — no storage wasted on oversized files
  [`artifacts/route.ts:80`](../../app/api/teams/[teamId]/artifacts/route.ts#L80)

- fileUrl omitted from response — only safe fields returned to client
  [`artifacts/route.ts:122`](../../app/api/teams/[teamId]/artifacts/route.ts#L122)

**Proxy route — authenticated file serving**

- resolveAuth → artifact fetch → teamId membership guard before any blob access
  [`files/route.ts:13`](../../app/api/files/[artifactId]/route.ts#L13)

- Server-side fetch of internal blobUrl; raw URL never reaches client
  [`files/route.ts:48`](../../app/api/files/[artifactId]/route.ts#L48)

- Filename sanitized (double-quotes stripped) before Content-Disposition header
  [`files/route.ts:62`](../../app/api/files/[artifactId]/route.ts#L62)

**Tests**

- All 10 scenarios: auth, validation, FILE_TOO_LARGE, success (no fileUrl), proxy access control
  [`artifacts.test.ts:1`](../../lib/__tests__/artifacts.test.ts#L1)
