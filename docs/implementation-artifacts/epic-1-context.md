# Epic 1 Context: Foundation & Infrastructure Setup

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Establish the complete project foundation that every subsequent epic depends on: project scaffold, database schema, Clerk authentication, core API infrastructure, and MCP API key management. No feature story is buildable until this epic is done.

## Stories

- Story 1.1: Project Initialization & Dependency Installation (done)
- Story 1.2: Database Schema & Turso Integration (done)
- Story 1.3: Clerk Authentication & Route Protection (done)
- Story 1.4: Core API Infrastructure (resolveAuth + Error Patterns) (done)
- Story 1.5: MCP API Key Generation & Revocation

## Requirements & Constraints

- Users can generate exactly one active MCP API key per user; generating a new key automatically revokes the previous one.
- API keys are displayed in plaintext exactly once, immediately after generation; the raw key is never stored or returned again.
- Keys are stored as SHA-256 hex digest in `api_keys.key_hash`; the raw key never persists.
- Revoked keys (`revokedAt IS NOT NULL`) are rejected by `resolveAuth()` with `AUTH_REQUIRED` (401).
- HTML tag normalization, team scoping, and all other backend patterns established here flow into all downstream epics.
- TypeScript strict mode, nanoid PKs, `timestamp_ms` integers, Drizzle type-safe queries — all invariant across the entire project.

## Technical Decisions

- **Auth dual surface**: Clerk session cookies for web; `Authorization: Bearer <key>` for MCP. `resolveAuth(request)` in `lib/auth.ts` handles both. Web routes use Clerk middleware; API routes call `resolveAuth` first.
- **API key lifecycle**: INSERT on generate (with SHA-256 hash); UPDATE `revokedAt` on revoke/regenerate; never DELETE rows (audit trail). Active key = row where `revokedAt IS NULL`.
- **Error responses**: Structured `{ error, code, detail? }` JSON with standardized `ErrorCode` union from `lib/types.ts`. HTTP status matches semantic meaning (401 auth, 403 forbidden, 404 not found, 400 validation, 500 internal).
- **DB access pattern**: Single Drizzle client from `lib/db.ts`; all queries type-safe via `$inferSelect`/`$inferInsert`; no raw SQL strings.
- **Raw key format**: `ah_` prefix + 32 random bytes via `crypto.randomBytes(32).toString('hex')` — 67 chars total, URL-safe.
- **Route structure**: `app/(dashboard)/` for all authenticated pages; `app/api/` for all API routes. API routes call `resolveAuth` before any business logic.

## UX & Interaction Patterns

- Settings page shows "MCP API Key" card with: masked key preview (`ah_****...****`) when active, "Generate API Key" button when no key, "Regenerate" + "Revoke" when active.
- After generation: key shown once in a `<code>` block with copy-to-clipboard button and bold warning ("This key will not be shown again"). Dismissible.
- After dismissal: UI reverts to masked view; no way to retrieve the key.

## Cross-Story Dependencies

- Story 1.5 depends on `api_keys` table (Story 1.2) and `resolveAuth()` (Story 1.4) — both done.
- MCP server stories (Epic 7) depend on Story 1.5 for API key auth to be in place.
- Story 1.4's `resolveAuth` already handles API key validation — Story 1.5 only adds the generation/revocation endpoints and settings UI.
