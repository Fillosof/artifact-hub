# Epic 3 Context: Artifact Publishing (Web)

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Enable members to publish files (images, PDFs, HTML) via the web UI, store them securely in Vercel Blob, serve them exclusively through an authenticated proxy route, and trigger async AI enrichment after publish. Depends on Epics 1–2 being complete.

## Stories

- Story 3.1: File Upload API & Authenticated File Proxy (backlog)
- Story 3.2: Publish Form UI (DropZoneUploader + PublishForm) (backlog)
- Story 3.3: AI Enrichment Pipeline (Async, Fire-and-Forget) (backlog)

## Requirements & Constraints

- File size hard cap: 10 MB. Server-side validation only; client-side is UX-only and NOT the security boundary.
- MIME type detected server-side from the multipart upload; never trust the client-supplied `Content-Type`.
- Raw Vercel Blob URLs (`fileUrl`) are stored in DB but NEVER returned in API responses and NEVER set as `<img src>` or `<iframe src>` on the client. All file access goes through `/api/files/[artifactId]`.
- Artifact must be immediately available (status 200) after publish; enrichment is async and does NOT block publish.
- Source URL (`sourceUrl`) is optional — linking back to originating AI tool (FR13).
- `enrichmentStatus` lifecycle: insert as `'pending'`, enriched to `'complete'` or `'failed'` by story 3.3.
- Tags: normalized lowercase, trimmed, deduplicated, max 8 per artifact (FR33).
- All DB queries scoped to the authenticated user's `teamId`(s) — cross-team access is a security bug.
- `resolveAuth()` from `lib/auth.ts` as first operation in every API route.

## Technical Decisions

- **Vercel Blob upload**: Use `put(uniqueName, body, { access: 'public' })` from `@vercel/blob`. The returned URL is stored as `fileUrl` in DB. The URL is unpredictable but public — security is enforced by the auth proxy, not URL obscurity.
- **File proxy**: `GET /api/files/[artifactId]` fetches the stored `fileUrl` from DB, then server-side `fetch(fileUrl)` streams the blob back to the client with `Content-Disposition: attachment; filename="originalFileName"`. Auth is verified before any DB or blob access.
- **Multipart parse**: App Router `Request.formData()` handles multipart natively; no extra parser needed.
- **Artifact ID**: `nanoid()` for PK, consistent with all other tables.
- **Response shape for POST**: return `{ artifact: { id, title, fileType, fileName, sourceUrl, enrichmentStatus, createdBy, createdAt, tags: [], summary: null } }` — omit `fileUrl` and `teamId` (internal).

## UX & Interaction Patterns

- Story 3.2 (Publish Form UI) builds on the API established in this story.
- After successful upload, the UI navigates to the artifact detail page (story 5.1, future).
- While `enrichmentStatus === 'pending'`, the detail page shows animated Skeleton placeholders for tags and summary.

## Cross-Story Dependencies

- Story 3.1 depends on `artifacts` + `artifact_tags` tables (Story 1.2), `resolveAuth()` (Story 1.4), `teamMemberships` for team-scope checks — all done.
- Story 3.2 (UI) calls `POST /api/teams/[teamId]/artifacts` established here.
- Story 3.3 (enrichment) reads/writes artifact rows established here; fires after publish returns.
- Epic 5 (detail/preview) uses `GET /api/files/[artifactId]` established here for rendering.
- Epic 7 (MCP) also calls the publish API established here.
