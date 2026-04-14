---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - docs/planning-artifacts/prd.md
  - docs/planning-artifacts/architecture.md
  - docs/planning-artifacts/ux-design-specification.md
---

# Yurii_Krot@epam.com-Artifact-Hub - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Artifact Hub, decomposing the requirements from the PRD, UX Design Specification, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Users can sign up and sign in using Clerk authentication (email/password or OAuth)
FR2: Users can generate a personal MCP API key from their account settings
FR3: Users can revoke their MCP API key and generate a new one
FR4: All application routes require authentication; unauthenticated requests are redirected to sign-in
FR5: Authenticated users can create a new team and become its first admin automatically
FR6: Team admins can invite users to their team by generating an invite link or sending an invite
FR7: Team admins can remove members from their team
FR8: Team admins can change a member's role (member ↔ admin)
FR9: Team admins can delete their team
FR10: Users can belong to multiple teams simultaneously with independent roles per team
FR11: Users can see all teams they belong to
FR12: Members can publish an artifact to a team by uploading a file (images, PDFs, HTML) with a title
FR13: Members can optionally provide a source URL linking back to the originating tool when publishing
FR14: Members who upload files exceeding 10MB receive an error message stating that the file exceeds the 10MB limit
FR15: The system auto-generates tags and a summary for every published artifact via AI enrichment (async, non-blocking)
FR16: MCP clients can provide tags and summary when publishing; server-side enrichment is skipped when both are provided
FR17: Server-side enrichment uses context-aware rules: file type signals, team vocabulary hints, source URL tool extraction, and title parsing
FR18: Artifacts are available immediately after publish regardless of enrichment status
FR19: Members can browse a gallery of all artifacts published to teams they belong to
FR20: Members can filter the gallery by tag, file type, and team
FR21: Members can search artifacts across all their teams by keyword
FR22: Each artifact has a stable, permanent URL requiring authentication and team membership to access
FR22A: Authenticated users who open an artifact URL without the required team membership receive an access-denied screen that identifies the artifact's team and explains the next step (e.g. request access or contact team admin)
FR23: Members can view an artifact detail page showing title, AI-generated summary, tags, source URL, publisher, and publish date
FR24: Image artifacts (PNG, JPG, GIF, WebP) are rendered inline via native image preview
FR25: PDF artifacts are rendered inline via browser embed
FR26: HTML artifacts are rendered inline in a sandboxed iframe with scripts disabled
FR27: Unsupported file types present a download fallback
FR28: Artifact files are accessed through authenticated server-side routes only; raw storage URLs are never exposed to clients
FR29: Artifact owners can edit tags on their artifact (add, remove individual tags)
FR30: Team admins can edit tags on any artifact in their team
FR31: Artifact owners can edit the AI-generated summary on their artifact
FR32: Artifact owners can trigger server-side AI re-enrichment ("Regenerate with AI") to replace current tags and summary
FR33: Tags are normalized on save (lowercase, trimmed, deduplicated, max 8 per artifact)
FR34: Members can leave a structured comment on any artifact in their teams
FR35: Comments display with author attribution and timestamp
FR36: All comments on an artifact are visible on the artifact detail page
FR37: Comments are permanent — they cannot be deleted in MVP
FR38: Team admins can delete any artifact in their team
FR39: Members cannot delete artifacts
FR40: Deleted artifacts are removed permanently with no recovery in MVP
FR41: MCP clients can authenticate to the MCP server using a per-user API key
FR42: MCP clients can publish an artifact to a team via the `publish_artifact` tool, providing title, content, team slug, and optionally tags and summary
FR43: MCP clients can search artifacts across the user's teams via the `search_artifacts` tool, with optional tag, fileType, and teamSlug filters
FR44: MCP clients can retrieve full artifact details including comments via the `get_artifact` tool
FR45: MCP server operations are scoped to the authenticated user's team memberships — cross-team access is not possible
FR46: MCP server returns the artifact URL upon successful publish

### NonFunctional Requirements

NFR1: Gallery/catalog initial render within 2 seconds on a connection with at least 10 Mbps download bandwidth
NFR2: Artifact publish response (web upload) returned within 3 seconds of file submission; AI enrichment is async and does not block this
NFR3: Artifact detail page content visible and image/PDF preview loading started within 2 seconds
NFR4: MCP tool responses (`publish_artifact`, `search_artifacts`, `get_artifact`) within 3 seconds per call at MVP target load (10 teams, 50 concurrent users, 500 artifacts)
NFR5: AI enrichment tags and summary appear on the artifact page within 10 seconds of publish completing, either automatically (open page) or after one page refresh
NFR6: File downloads initiated within 2 seconds of request
NFR7: All artifact file access routed through authenticated Next.js API routes; raw Vercel Blob URLs never exposed to clients
NFR8: All data in transit encrypted via HTTPS (enforced by Vercel)
NFR9: MCP API keys stored hashed server-side (SHA-256); never returned in plaintext after generation
NFR10: Clerk session tokens for all web browser authentication; API keys exclusively for MCP client authentication — no crossover
NFR11: Claude API key stored as server-side environment variable only; never included in client bundles or API responses
NFR12: File upload validated for MIME type and size server-side (10MB cap); client-side validation is UX-only and not the security boundary
NFR13: HTML artifact preview rendered in sandboxed iframe (sandbox attribute, no allow-scripts); no JavaScript execution from untrusted artifact content
NFR14: Target scale: 10 teams, 50 concurrent users, 500 artifacts at MVP launch while meeting all performance targets
NFR15: Core publish, browse, and comment flows are keyboard-navigable
NFR16: Color contrast meets WCAG 2.1 AA for text elements
NFR17: Form inputs have associated labels; error messages identify the affected field and the corrective action required
NFR18: Image previews include alt text derived from artifact title
NFR19: Vercel deployment target: 99.9% uptime (Vercel SLA)
NFR20: Publish failure: user receives error message describing what failed and the retry step; no silent failures
NFR21: AI enrichment failure: artifact publishes successfully; failure is logged server-side; user can trigger manual re-enrichment
NFR22: MCP tool errors return structured error responses per MCP spec; no unhandled exceptions exposed
NFR23: Components stay under 200 lines; single responsibility per file
NFR24: Zero hard-coded credentials; all secrets via environment variables
NFR25: TypeScript strict mode; no `any` unless unavoidable and documented
NFR26: Database schema managed via Drizzle migrations; no manual SQL changes to production

### Additional Requirements

- ARCH1: First implementation story is project initialization using `npx create-next-app@latest artifact-hub --typescript --tailwind --eslint --app --turbopack --import-alias "@/*"` with layered dependency installation (Clerk, Drizzle+Turso, Vercel Blob, shadcn/ui, MCP SDK, Anthropic SDK)
- ARCH2: Full Drizzle schema defined in `lib/schema.ts`: tables `teams`, `team_memberships`, `artifacts`, `artifact_tags`, `comments`, `api_keys` with exact column definitions, indexes, and constraints as specified in Architecture Gap 1
- ARCH3: Dual auth surface: Clerk middleware for web routes; custom `resolveAuth()` helper for `/api/*` routes (checks Clerk session first, falls back to `Authorization: Bearer <apiKey>` header)
- ARCH4: Authenticated file proxy at `/api/files/[artifactId]` — verifies Clerk session or API key + team membership before proxying from Vercel Blob; raw Blob URLs never reach client
- ARCH5: HTML preview via sandboxed iframe (`sandbox` attribute, no `allow-scripts`); JavaScript from artifact content must never execute
- ARCH6: Async enrichment via fire-and-forget non-awaited `fetch` to `/api/enrich` from publish route; enrichment failure fully isolated from publish success
- ARCH7: Shared `resolveAuth(request)` helper in `lib/auth.ts` — called as first operation in every API route; returns `{ userId, teamIds }`; throws structured error if auth fails
- ARCH8: REST-like API Routes (`/api/*`) for all operations; same endpoints serve web UI and MCP server
- ARCH9: MCP server: stdio transport, standalone TypeScript process in `mcp-server/` directory, HTTP calls to deployed `/api/*` endpoints
- ARCH10: Keyword search via SQL `LIKE` across `title`, `summary`, and `artifact_tags.tag`, always team-scoped, maximum 50 results
- ARCH11: nanoid for all entity IDs; ISO 8601 strings for dates in JSON; structured error responses with standardized error codes (`AUTH_REQUIRED`, `TEAM_ACCESS_DENIED`, `NOT_FOUND`, `FORBIDDEN`, `VALIDATION_ERROR`, `FILE_TOO_LARGE`, `ENRICHMENT_FAILED`, `INTERNAL_ERROR`)
- ARCH12: `ENRICH_SECRET` hex env var (generated via `openssl rand -hex 32`) protects `/api/enrich` from external invocation; `NEXT_PUBLIC_APP_URL` required for absolute URL construction in serverless functions
- ARCH13: MCP server build: `mcp-server/` has its own `tsconfig.json` and `package.json`; root `package.json` includes `"build:mcp"` convenience script; Claude Desktop config documented with exact JSON in README.md

### UX Design Requirements

UX-DR1: Publish flow uses a minimal modal/dialog — only Title (required, auto-focused), File (required), and Source URL (optional, behind progressive disclosure toggle); no metadata form; zero required metadata entry beyond file + title
UX-DR2: AI enrichment async state shown with animated Skeleton placeholder blocks where tags and summary will appear — no blocking spinner; user can continue navigating immediately after publish
UX-DR3: Gallery uses Document Hub layout: fixed left sidebar (team switcher, saved filters, prominent "New Artifact" CTA) with scrolling main content area; sidebar collapses to hamburger/drawer at sm/md breakpoints
UX-DR4: ArtifactRow component with three zones — left (file-type icon or thumbnail), center (title + AI summary snippet), right (tag chips + relative date + publisher avatar); supports default, hover (subtle background highlight), and processing (skeleton loaders replacing summary/tags) states
UX-DR5: DocumentPreviewer component with four variants — Image (native responsive `<img/>`), PDF (browser-native `<embed>`), HTML (sandboxed `<iframe>` with scripts disabled), Fallback (download card with filename)
UX-DR6: ContextualCommentThread: scrollable list of CommentItem components (avatar, display name, relative timestamp, text content) with a sticky CommentInput at the bottom; visible alongside artifact preview on wide viewports, stacked below on mobile
UX-DR7: DropZoneUploader: drag-and-drop zone with distinct visual state on `dragenter` (border + background change); immediately transitions to Publish dialog on file drop or click-to-browse; no intermediate state
UX-DR8: Actionable access-denied page (generic 403 is forbidden): centered card showing (1) artifact/team name, (2) clear explanation of why access is denied, (3) primary action button — "Request Access" or "Return to My Hub"
UX-DR9: Empty states always include a CTA: empty gallery shows "Publish Your First Artifact" primary button + Claude Desktop setup instructions; empty search shows "Clear all filters" text button immediately below "No results found"
UX-DR10: Monochrome color system (zinc-50 light / zinc-950 dark backgrounds) with a single muted accent color for primary actions; semantic red/yellow/green for error, warning, and success states only
UX-DR11: Typography using Inter or Geist; high-contrast weight hierarchy for headings; tight tracking and text-sm/text-xs for tag chips, timestamps, and usernames to visually distinguish metadata from prose
UX-DR12: Responsive breakpoints: sm/md (640px-768px) sidebar collapses, gallery shifts to single-column; lg/xl (1024px+) artifact detail page shows side-by-side layout (artifact on left, comments pinned on right)
UX-DR13: WCAG 2.1 AA accessibility: `focus-visible:ring` applied uniformly to all interactive elements; proper heading hierarchy (`h1` for artifact title, `h2` for section breaks); `<span className="sr-only">` labels for all icon-only buttons
UX-DR14: Button hierarchy enforced: Primary (solid accent fill — one per view, for the main success action), Secondary (outline or subtle gray — cancel/alternative actions), Ghost/Tertiary (low-contrast text or icon-only — recurring low-prominence actions)
UX-DR15: Destructive actions (admin delete artifact, delete team) require a confirmation Dialog component with a clearly labeled red destructive button and explicit confirmation text
UX-DR16: Toast notifications for ephemeral confirmations: "URL Copied to Clipboard", "Artifact Published", "Comment Added", "Tags Saved"
UX-DR17: Publish modal auto-focuses the Title input field immediately after file selection without requiring additional user interaction

### FR Coverage Map

| FR | Epic | Story |
|----|------|-------|
| FR1 | Epic 1 | Story 1.3 |
| FR2 | Epic 1 | Story 1.5 |
| FR3 | Epic 1 | Story 1.5 |
| FR4 | Epic 1 | Story 1.3 |
| FR5 | Epic 2 | Story 2.1 |
| FR6 | Epic 2 | Story 2.2 |
| FR7 | Epic 2 | Story 2.2 |
| FR8 | Epic 2 | Story 2.2 |
| FR9 | Epic 2 | Story 2.3 |
| FR10 | Epic 2 | Story 2.2 |
| FR11 | Epic 2 | Story 2.1 |
| FR12 | Epic 3 | Stories 3.1, 3.2 |
| FR13 | Epic 3 | Stories 3.1, 3.2 |
| FR14 | Epic 3 | Story 3.1 |
| FR15 | Epic 3 | Story 3.3 |
| FR16 | Epic 3 | Story 3.3 |
| FR17 | Epic 3 | Story 3.3 |
| FR18 | Epic 3 | Story 3.1 |
| FR19 | Epic 4 | Story 4.1 |
| FR20 | Epic 4 | Story 4.2 |
| FR21 | Epic 4 | Story 4.3 |
| FR22 | Epic 5 | Story 5.1 |
| FR22A | Epic 5 | Story 5.1 |
| FR23 | Epic 5 | Story 5.1 |
| FR24 | Epic 5 | Story 5.2 |
| FR25 | Epic 5 | Story 5.2 |
| FR26 | Epic 5 | Story 5.2 |
| FR27 | Epic 5 | Story 5.2 |
| FR28 | Epics 3, 5 | Stories 3.1, 5.2 |
| FR29 | Epic 5 | Story 5.3 |
| FR30 | Epic 5 | Story 5.3 |
| FR31 | Epic 5 | Story 5.3 |
| FR32 | Epic 5 | Story 5.3 |
| FR33 | Epics 3, 5 | Stories 3.3, 5.3 |
| FR34 | Epic 6 | Stories 6.1, 6.2 |
| FR35 | Epic 6 | Stories 6.1, 6.2 |
| FR36 | Epic 6 | Story 6.2 |
| FR37 | Epic 6 | Story 6.1 |
| FR38 | Epic 8 | Story 8.1 |
| FR39 | Epic 8 | Story 8.1 |
| FR40 | Epic 8 | Story 8.1 |
| FR41 | Epic 7 | Story 7.1 |
| FR42 | Epic 7 | Story 7.2 |
| FR43 | Epic 7 | Story 7.3 |
| FR44 | Epic 7 | Story 7.3 |
| FR45 | Epic 7 | Stories 7.2, 7.3 |
| FR46 | Epic 7 | Story 7.2 |

## Epic List

| # | Epic | Stories | Key FRs |
|---|------|---------|---------|
| Epic 1 | Foundation & Infrastructure Setup | 1.1–1.5 | FR1–FR4, ARCH1–ARCH13 |
| Epic 2 | Team Management | 2.1–2.3 | FR5–FR11 |
| Epic 3 | Artifact Publishing (Web) | 3.1–3.3 | FR12–FR18, FR28, FR33 |
| Epic 4 | Gallery & Discovery | 4.1–4.3 | FR19–FR21 |
| Epic 5 | Artifact Detail & Preview | 5.1–5.3 | FR22–FR33 |
| Epic 6 | Comments & Feedback | 6.1–6.2 | FR34–FR37 |
| Epic 7 | MCP Server | 7.1–7.4 | FR41–FR46 |
| Epic 8 | Admin Governance | 8.1 | FR38–FR40 |
| Epic 9 | UX Polish, Accessibility & Deployment | 9.1–9.3 | All UX-DRs, NFR15–NFR19, NFR24 |

---

## Epic 1: Foundation & Infrastructure Setup

Establish the project scaffold, database schema, Clerk authentication, core API infrastructure, and MCP API key management that all subsequent epics depend on. No features are buildable until this epic is complete.

### Story 1.1: Project Initialization & Dependency Installation

As a developer,
I want the project initialized from `create-next-app` with all required dependencies installed and verified,
So that every subsequent story has a consistent, correct foundation to build on.

**Acceptance Criteria:**

**Given** a clean working directory
**When** I run `npx create-next-app@latest artifact-hub --typescript --tailwind --eslint --app --turbopack --import-alias "@/*"`
**Then** the project scaffolds with TypeScript strict mode, Tailwind CSS v4, ESLint, App Router, and the `@/*` import alias

**Given** the scaffolded project
**When** I install `@clerk/nextjs`, `drizzle-orm`, `@libsql/client`, `drizzle-kit` (dev), `@vercel/blob`, `@modelcontextprotocol/sdk`, `@anthropic-ai/sdk`, and initialize `shadcn@latest`
**Then** all packages install without peer dependency conflicts and the project builds cleanly (`npm run build`)

**Given** the installed project
**When** I inspect the project structure
**Then** the directory tree matches the architecture specification: `app/`, `components/`, `lib/`, `mcp-server/` directories exist with placeholder files; `middleware.ts`, `drizzle.config.ts`, `.env.example`, `.env.local` (gitignored), and `WRITEUP.md` are present at the root

**Given** the project
**When** I run `npm run dev`
**Then** the development server starts on localhost without errors and the default Next.js landing page renders

**Given** `.env.example`
**When** I inspect it
**Then** it contains all required variable stubs: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `BLOB_READ_WRITE_TOKEN`, `ANTHROPIC_API_KEY`, `ENRICH_SECRET`, `NEXT_PUBLIC_APP_URL`

---

### Story 1.2: Database Schema & Turso Integration

As a developer,
I want the full Drizzle schema defined and connected to a Turso database,
So that all downstream stories have a stable, typed data layer to work with.

**Acceptance Criteria:**

**Given** `lib/schema.ts`
**When** I inspect the file
**Then** it defines exactly six tables: `teams`, `team_memberships`, `artifacts`, `artifact_tags`, `comments`, `api_keys` — all matching the column definitions, types, constraints, and index names specified in Architecture Gap 1

**Given** `lib/db.ts`
**When** the module is imported
**Then** it exports a single Drizzle client connected to Turso using `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` from environment variables; no other module creates a Drizzle client or Turso connection directly

**Given** `drizzle.config.ts`
**When** I run `npx drizzle-kit push`
**Then** all six tables are created in the Turso database without errors

**Given** a TypeScript file that imports from `lib/schema.ts`
**When** I access any table's `$inferSelect` or `$inferInsert` type
**Then** TypeScript provides full type inference matching the schema columns with no `any` types

**Given** the schema
**When** I inspect ID columns across all tables
**Then** all IDs are `text` type (nanoid-compatible), not auto-increment integers or UUIDs

---

### Story 1.3: Clerk Authentication & Route Protection

As an unauthenticated user,
I want to be redirected to sign-in when I try to access any protected route,
So that all artifacts and team data are protected behind authentication.

**Acceptance Criteria:**

**Given** `middleware.ts` at the root
**When** an unauthenticated request hits any route other than `/sign-in`, `/sign-up`, or public API routes
**Then** the middleware redirects to the Clerk sign-in page

**Given** `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx`
**When** an unauthenticated user visits these pages
**Then** the Clerk-provided sign-in and sign-up components render correctly

**Given** a user who completes Clerk signup
**When** they are authenticated
**Then** they are redirected to `/gallery` and can access authenticated routes

**Given** a valid Clerk session cookie
**When** a request reaches any protected page or API route
**Then** the request proceeds without redirect

**Given** `app/(dashboard)/layout.tsx`
**When** rendered for an authenticated user
**Then** it wraps the content in the `ClerkProvider` and renders a navigation header with the user's avatar/name and a sign-out option

---

### Story 1.4: Core API Infrastructure (resolveAuth + Error Patterns)

As a developer,
I want a shared `resolveAuth()` helper and standardized error response patterns,
So that all API routes handle authentication and errors consistently.

**Acceptance Criteria:**

**Given** `lib/auth.ts`
**When** `resolveAuth(request)` is called with a request containing a valid Clerk session cookie
**Then** it returns `{ userId: string, teamIds: string[] }` where `teamIds` contains all teams the user is a member of

**Given** `lib/auth.ts`
**When** `resolveAuth(request)` is called with a request containing a valid `Authorization: Bearer <apiKey>` header
**Then** it hashes the key (SHA-256), looks up the matching non-revoked row in `api_keys`, retrieves the associated user's team memberships, and returns `{ userId, teamIds }`

**Given** `lib/auth.ts`
**When** `resolveAuth(request)` is called with no valid auth (no cookie, no API key header, or invalid/revoked key)
**Then** it throws or returns a value that causes the API route to respond with `{ error: "Authentication required", code: "AUTH_REQUIRED" }` and HTTP 401

**Given** any API route in `app/api/`
**When** I inspect the route code
**Then** `resolveAuth(request)` is called as the first operation before any business logic executes

**Given** any API route error case
**When** an error occurs
**Then** the response is a structured JSON object `{ error: string, code: string, detail?: string }` using one of the standardized error codes; no stack traces or internal details are exposed; the error is logged server-side with `console.error`

**Given** `lib/types.ts`
**When** I inspect it
**Then** it exports shared TypeScript types: `Artifact`, `Team`, `TeamMembership`, `Comment`, `ApiKey`, `ApiError` — all strongly typed with no `any`

---

### Story 1.5: MCP API Key Generation & Revocation

As a member,
I want to generate and revoke a personal MCP API key from my account settings,
So that I can authenticate MCP clients like Claude Desktop to publish and search on my behalf.

**Acceptance Criteria:**

**Given** `app/(dashboard)/settings/page.tsx`
**When** I visit the Settings page as an authenticated user
**Then** I see a section for "MCP API Key" showing whether I have an active key (masked, e.g. `ah_****...****`) or no key, with a "Generate API Key" or "Regenerate" button

**Given** I click "Generate API Key" (no existing key)
**When** the `POST /api/keys` API route executes
**Then** it generates a raw key (nanoid or crypto), hashes it with SHA-256, stores the hash in `api_keys` with my `userId` and `createdAt`, and returns the raw key exactly once in the response

**Given** the key is returned
**When** it is displayed to me in the UI
**Then** it is shown once in full in a dismissible code block with a "Copy" button and a warning that it will not be shown again; after dismissal the UI shows only the masked key

**Given** I already have an active API key and click "Regenerate"
**When** the `POST /api/keys` API route executes
**Then** it sets `revokedAt` on the existing key row, creates a new key, and returns only the new raw key

**Given** I click "Revoke"
**When** the `DELETE /api/keys` API route executes
**Then** `revokedAt` is set to the current timestamp on my active key; subsequent API requests using the old key receive HTTP 401 with `AUTH_REQUIRED`

**Given** a revoked or non-existent API key used in an `Authorization: Bearer` header
**When** `resolveAuth()` processes the header
**Then** it returns `AUTH_REQUIRED` — the key is not treated as valid

---

## Epic 2: Team Management

Enable multi-team creation, membership management, and admin governance so the team-scoped catalog model is fully functional. Depends on Epic 1.

### Story 2.1: Team Creation & Team List

As an authenticated user,
I want to create a new team and see all teams I belong to,
So that I can organize my team's artifacts in an isolated catalog space.

**Acceptance Criteria:**

**Given** `app/(dashboard)/teams/new/page.tsx`
**When** I visit the "Create Team" page
**Then** I see a form with a required "Team Name" field and a derived, editable team slug field (auto-generated from name as URL-safe lowercase hyphenated string)

**Given** I submit the form with a valid team name and unique slug
**When** `POST /api/teams` executes
**Then** a new row is inserted in `teams` with a nanoid `id`; a `team_memberships` row is inserted for me with `role: 'admin'`; the response returns the created team object

**Given** the team is created
**When** I am redirected
**Then** I land on `/teams/[teamId]` (the new team's settings page) or the gallery pre-filtered to the new team

**Given** a slug that is already taken
**When** I submit the form
**Then** I receive a `VALIDATION_ERROR` response and the UI displays "This team slug is already taken" below the slug field

**Given** `GET /api/teams`
**When** called by an authenticated user
**Then** it returns only the teams the user is a member of, with their role per team; never returns teams they don't belong to

**Given** `app/(dashboard)/teams/page.tsx`
**When** I visit the Teams list page
**Then** I see all teams I belong to, with my role badge (member/admin) on each

---

### Story 2.2: Team Membership Management

As a team admin,
I want to invite, remove, and change the role of team members,
So that I can control who has access to our team's artifacts and at what permission level.

**Acceptance Criteria:**

**Given** `app/(dashboard)/teams/[teamId]/page.tsx` (team admin view)
**When** I visit the team settings page as an admin
**Then** I see a member list with each member's name, role badge, and actions: "Change Role" and "Remove"

**Given** I click "Invite Member"
**When** the invite flow executes (`POST /api/teams/[teamId]/members`)
**Then** an invite is generated (email or invite link); the invited user, upon accepting, is added to `team_memberships` with `role: 'member'`

**Given** I click "Remove" on a member
**When** `DELETE /api/teams/[teamId]/members` executes with the member's userId
**Then** their `team_memberships` row is deleted; their subsequent requests to `/api/teams/[teamId]/artifacts` return `TEAM_ACCESS_DENIED`

**Given** I click "Change Role" on a member
**When** `PATCH /api/teams/[teamId]/members` executes with the new role
**Then** the member's `role` column is updated to `'admin'` or `'member'` as selected; the change is immediately reflected in the UI

**Given** a user who is a member (not admin)
**When** they call any team membership management endpoint
**Then** they receive `{ error: "Insufficient permissions", code: "FORBIDDEN" }` with HTTP 403

**Given** a user who belongs to multiple teams
**When** they switch teams using the sidebar team switcher
**Then** the gallery and navigation update to scope content to the selected team without a full page reload (URL param update triggers server re-render)

---

### Story 2.3: Team Settings & Delete

As a team admin,
I want to update team settings and delete my team when it is no longer needed,
So that I can keep the platform's team list clean and accurate.

**Acceptance Criteria:**

**Given** `app/(dashboard)/teams/[teamId]/page.tsx`
**When** I visit the settings page as an admin
**Then** I see the team name and slug displayed with an "Edit" option

**Given** I update the team name and save
**When** `PATCH /api/teams/[teamId]` executes
**Then** the team's `name` column is updated and the new name is reflected in the sidebar and team list immediately

**Given** I click "Delete Team"
**When** the delete confirmation Dialog appears
**Then** it displays "This will permanently delete [Team Name] and all its artifacts. This action cannot be undone." with a red "Delete Team" button and a "Cancel" button

**Given** I confirm the delete
**When** `DELETE /api/teams/[teamId]` executes (admin only)
**Then** the team row is deleted; due to `onDelete: 'cascade'` on all foreign keys, all associated `team_memberships`, `artifacts`, `artifact_tags`, and `comments` rows are also deleted; I am redirected to `/teams`

**Given** a non-admin calls `DELETE /api/teams/[teamId]`
**When** `resolveAuth()` verifies the role
**Then** the route returns HTTP 403 with `FORBIDDEN`

---

## Epic 3: Artifact Publishing (Web)

Enable members to publish files via the web UI, store them securely via Vercel Blob, serve them through an authenticated proxy, and trigger async AI enrichment. Depends on Epics 1–2.

### Story 3.1: File Upload API & Authenticated File Proxy

As a member,
I want to upload a file to my team and retrieve it later through a secure authenticated route,
So that my artifacts are stored reliably and never accessible to unauthorized users.

**Acceptance Criteria:**

**Given** `POST /api/teams/[teamId]/artifacts`
**When** a member submits a multipart request with a file, title, and optional source URL
**Then** the route verifies team membership via `resolveAuth()`, validates the file size (reject with `FILE_TOO_LARGE` if > 10MB), validates MIME type server-side, uploads the file to Vercel Blob, inserts an artifact row in Turso with `enrichmentStatus: 'pending'`, and returns the created artifact object (without `fileUrl`) within 3 seconds

**Given** a file larger than 10MB is submitted
**When** the server processes the upload
**Then** it returns HTTP 400 with `{ error: "File exceeds the 10MB limit", code: "FILE_TOO_LARGE" }` before attempting any storage write

**Given** a successful artifact upload
**When** I inspect the response JSON
**Then** the `fileUrl` field is absent; the response includes `id`, `title`, `fileType`, `fileName`, `sourceUrl`, `enrichmentStatus`, `createdBy`, `createdAt`, `tags: []`, `summary: null`

**Given** `GET /api/files/[artifactId]`
**When** called by an authenticated user who is a member of the artifact's team
**Then** it fetches the internal `fileUrl` from Turso, proxies the Vercel Blob content to the client, and sets `Content-Disposition` to the original `fileName`

**Given** `GET /api/files/[artifactId]`
**When** called by an authenticated user who is NOT a member of the artifact's team
**Then** it returns HTTP 403 with `TEAM_ACCESS_DENIED`

**Given** `GET /api/files/[artifactId]`
**When** called without a valid Clerk session or API key
**Then** it returns HTTP 401 with `AUTH_REQUIRED`

---

### Story 3.2: Publish Form UI (DropZoneUploader + PublishForm)

As a member,
I want a minimal, drag-and-drop publish flow in the web UI,
So that I can publish an artifact to my team in under 3 steps with no metadata burden.

**Acceptance Criteria:**

**Given** `app/(dashboard)/publish/page.tsx` or a "New Artifact" button in the gallery
**When** I click "New Artifact" or navigate to `/publish`
**Then** the `DropZoneUploader` component renders with a visible drop zone and a "Click to browse" fallback

**Given** I drag a file onto the drop zone
**When** the drag enters the zone boundary
**Then** the zone border and background change color to indicate acceptance; when I release the file, the Publish dialog opens

**Given** the Publish dialog opens
**When** it renders
**Then** the Title input is auto-focused; the Source URL field is hidden behind a collapsible "Add source URL (optional)" toggle; the "Publish" button is disabled until both file and title are provided

**Given** the file is selected and a title is entered
**When** I click "Publish"
**Then** the form submits via `POST /api/teams/[teamId]/artifacts`; the dialog shows an inline loading indicator; on success the dialog closes and I am navigated to the artifact detail page

**Given** the publish request returns an error
**When** the UI handles the response
**Then** a visible error message appears inside the dialog describing what failed; the dialog stays open so I can retry or cancel

**Given** the artifact detail page loads after publish
**When** `enrichmentStatus` is `'pending'`
**Then** animated Skeleton blocks appear in place of tags and summary, indicating AI processing in progress (UX-DR2)

---

### Story 3.3: AI Enrichment Pipeline (Async, Fire-and-Forget)

As a member,
I want AI-generated tags and a summary to automatically appear on my artifact within seconds of publishing,
So that my artifact is discoverable without any manual metadata entry.

**Acceptance Criteria:**

**Given** `POST /api/teams/[teamId]/artifacts` completes successfully
**When** the route handler returns the success response to the client
**Then** it fires a non-awaited `fetch` to `/api/enrich` with `{ artifactId }` and the `X-Enrich-Secret` header equal to `process.env.ENRICH_SECRET`; the publish response is not delayed by this call

**Given** `POST /api/enrich`
**When** it receives a request
**Then** it first validates the `X-Enrich-Secret` header; if invalid, returns HTTP 401 with `FORBIDDEN`; if valid, proceeds with enrichment

**Given** valid enrichment request for an artifact with a PDF file
**When** `lib/enrichment.ts` calls the Claude API
**Then** it passes the artifact's title, file type, team name, existing team tag vocabulary, and source URL (if present) to Claude with the context-aware enrichment prompt; it receives tags (max 8) and a summary

**Given** Claude returns tags and summary
**When** the enrichment route processes the response
**Then** it normalizes tags (lowercase, trimmed, deduplicated, max 8), upserts into `artifact_tags`, updates the artifact's `summary` and `enrichmentStatus` to `'complete'` in Turso

**Given** the Claude API call fails or times out
**When** the enrichment route catches the error
**Then** it updates `enrichmentStatus` to `'failed'` in Turso, logs the error server-side with `console.error`, and returns without affecting the artifact's availability

**Given** an MCP client call to `publish_artifact` that includes both `tags` and `summary`
**When** the publish API route processes the request
**Then** it uses the provided tags and summary directly (normalized), sets `enrichmentStatus: 'complete'`, and does NOT fire the enrichment endpoint

**Given** tags on any artifact write (user edit or AI enrichment)
**When** they are saved to the database
**Then** all tags are normalized: lowercased, trimmed of whitespace, duplicates removed, and capped at 8 (excess dropped)

---

## Epic 4: Gallery & Discovery

Enable members to browse, filter, and search the team artifact catalog. Depends on Epics 1–3.

### Story 4.1: Gallery Page & ArtifactRow Component

As a member,
I want a browsable visual gallery of all artifacts in my teams,
So that I can discover what my team has published and quickly identify relevant work.

**Acceptance Criteria:**

**Given** `app/(dashboard)/gallery/page.tsx`
**When** I visit the gallery as an authenticated member of at least one team
**Then** I see a Document Hub layout: fixed left sidebar with team switcher and "New Artifact" button, and a main content area listing artifact rows

**Given** the gallery page loads
**When** artifacts exist for my teams
**Then** each ArtifactRow displays: file-type icon or thumbnail (left), artifact title + AI summary snippet (center), tag chips + relative date + publisher avatar (right)

**Given** an artifact with `enrichmentStatus: 'pending'`
**When** it appears in the gallery
**Then** the ArtifactRow shows animated Skeleton loaders where the summary snippet and tags will appear

**Given** the gallery has no artifacts (new team or all deleted)
**When** the page renders
**Then** an empty state is shown with a "Publish Your First Artifact" primary button and a link to MCP setup instructions

**Given** `app/(dashboard)/gallery/loading.tsx`
**When** the gallery page is loading
**Then** a skeleton grid of ArtifactRow placeholders renders immediately, preventing layout shift

**Given** I click on any ArtifactRow
**When** the navigation occurs
**Then** I am taken to `/artifacts/[artifactId]` — the artifact detail page

---

### Story 4.2: Filter Controls (Tag, File Type, Team)

As a member,
I want to filter the gallery by tag, file type, and team,
So that I can quickly narrow the catalog to the type of artifact I am looking for.

**Acceptance Criteria:**

**Given** the gallery sidebar or filter bar
**When** I open the team filter
**Then** I see a list of all teams I belong to; selecting one filters the gallery to show only that team's artifacts

**Given** the filter controls
**When** I select a tag from the tag filter dropdown
**Then** only artifacts that have that exact tag are shown; the URL search param `?tag=<value>` is updated

**Given** the filter controls
**When** I select a file type from the file type filter
**Then** only artifacts of that MIME type family are shown; the URL param `?fileType=<value>` is updated

**Given** multiple filters are active simultaneously
**When** I apply tag=strategy AND fileType=application/pdf
**Then** only artifacts matching ALL active filters are shown (AND logic)

**Given** the active URL has `?tag=strategy&fileType=application/pdf`
**When** I share this URL with another team member and they open it
**Then** they see the same filtered view (filter state is in URL, not component state)

**Given** a filter is active and I click "Clear all filters"
**When** the URL params are cleared
**Then** the gallery returns to showing all artifacts across my teams

---

### Story 4.3: Keyword Search

As a member,
I want to search for artifacts by keyword across all my teams,
So that I can find specific work without having to browse or remember exact tags.

**Acceptance Criteria:**

**Given** a search input field in the gallery header or sidebar
**When** I type a keyword and submit (Enter or search button click)
**Then** the URL param `?q=<keyword>` is set and the gallery updates to show matching artifacts

**Given** `GET /api/teams/[teamId]/artifacts?q=keyword`
**When** the server processes the search
**Then** it queries `LIKE '%keyword%'` across `artifacts.title`, `artifacts.summary`, and `artifact_tags.tag` for all teams the user belongs to; results are team-scoped and capped at 50; results are ordered by `created_at DESC`

**Given** a search that matches no artifacts
**When** the gallery renders the result
**Then** an empty state shows "No results found for '[keyword]'" with a "Clear all filters" text button immediately below

**Given** a search combined with active tag and file type filters
**When** the query executes
**Then** all active params (`q`, `tag`, `fileType`, `teamId`) are combined with `AND` logic in a single query

**Given** an empty search query (user clears the search field)
**When** the URL param `q` is absent
**Then** the gallery returns to showing all team artifacts (standard browse mode; no keyword clause added to query)

---

## Epic 5: Artifact Detail & Preview

Deliver the full artifact detail experience including stable authenticated URLs, format-specific preview, and metadata management. Depends on Epics 1–4.

### Story 5.1: Artifact Detail Page & Access Control

As a member,
I want to view the full details of an artifact on its own stable page,
So that I can review the metadata, understand its context, and share the URL with teammates.

**Acceptance Criteria:**

**Given** `app/(dashboard)/artifacts/[artifactId]/page.tsx`
**When** I navigate to an artifact detail page as a member of the artifact's team
**Then** the page renders: artifact title (`h1`), AI-generated summary, tags (as chips), source URL (linked if present), publisher name + avatar, publish date, and the artifact preview area

**Given** an artifact with `enrichmentStatus: 'pending'`
**When** the detail page loads
**Then** the summary and tags sections show animated Skeleton placeholders (not blank space or "null")

**Given** I navigate to `/artifacts/[artifactId]` for an artifact that belongs to a team I am NOT a member of
**When** `GET /api/artifacts/[artifactId]` validates team membership
**Then** the page renders the access-denied state: a centered card showing the team name, the message "You must be a member of [Team Name] to view this artifact", and a primary "Return to My Hub" button (or "Request Access" if invite mechanism exists)

**Given** the access-denied page
**When** I inspect it
**Then** it is NOT a generic 403; the team name is shown; there is always a primary action button; no raw error codes are shown to the user

**Given** an artifact URL shared via Slack
**When** a user who is not yet authenticated clicks the link
**Then** they are redirected to Clerk sign-in; after authenticating, they are returned to the original artifact URL

**Given** `GET /api/artifacts/[artifactId]`
**When** called for an existing artifact by a team member
**Then** the response JSON includes all metadata fields but NEVER includes the `fileUrl` column value

---

### Story 5.2: Format-Specific Preview Renderer

As a member,
I want to view an artifact inline on its detail page in the appropriate format,
So that I can review the content without downloading it.

**Acceptance Criteria:**

**Given** the `DocumentPreviewer` component receives an artifact with `fileType` starting with `image/`
**When** it renders
**Then** it displays a native responsive `<img>` element with `src="/api/files/[artifactId]"` and `alt` set to the artifact title; the image loads via the authenticated file proxy

**Given** the component receives `fileType: 'application/pdf'`
**When** it renders
**Then** it displays a browser-native `<embed>` or `<iframe>` with `src="/api/files/[artifactId]"`; the PDF renders inline without a download prompt on modern browsers

**Given** the component receives `fileType: 'text/html'`
**When** it renders
**Then** it displays a `<iframe>` with `src="/api/files/[artifactId]"` and the `sandbox` attribute set with NO `allow-scripts` token; JavaScript from the HTML artifact must not execute

**Given** the component receives any other MIME type (e.g. `application/zip`, `text/plain`)
**When** it renders
**Then** it displays a fallback card with the file name, file type label, and a "Download File" button that triggers file download via `/api/files/[artifactId]`

**Given** the file proxy route `/api/files/[artifactId]`
**When** called without a Vercel Blob URL in the database (artifact row exists but `fileUrl` is null or malformed)
**Then** it returns HTTP 404 with `NOT_FOUND`; the UI shows the fallback download card with an error note

---

### Story 5.3: Tags & Summary Editing + AI Regeneration

As an artifact owner or team admin,
I want to edit tags and the summary, and trigger AI regeneration,
So that I can correct poor enrichment quality or update metadata as the artifact evolves.

**Acceptance Criteria:**

**Given** the artifact detail page for an artifact I own (or I am team admin)
**When** I view the tags section
**Then** each tag appears as a removable chip with an "×" button; there is an add-tag input field; an "Edit" or pencil icon activates edit mode

**Given** I remove a tag chip and click "Save"
**When** `PUT /api/artifacts/[artifactId]/tags` executes
**Then** the removed tag is deleted from `artifact_tags`; all remaining tags are re-normalized on save; the UI updates immediately

**Given** I type a new tag in the add-tag input and press Enter
**When** the tag is added
**Then** it is normalized (lowercase, trimmed) before being sent to the API; if adding would exceed 8 tags, the API returns `VALIDATION_ERROR` and the UI shows "Maximum 8 tags allowed"

**Given** the summary section for an artifact I own
**When** I click "Edit" on the summary
**Then** the summary text becomes an editable `<textarea>` pre-populated with the current summary; "Save" and "Cancel" buttons appear

**Given** I edit the summary and save
**When** `PUT /api/artifacts/[artifactId]/summary` executes
**Then** the `summary` column is updated in Turso; the UI switches back to read mode showing the new summary

**Given** I click "Regenerate with AI"
**When** `POST /api/artifacts/[artifactId]/enrich` executes
**Then** it triggers server-side enrichment (re-reads file content, calls Claude API, replaces current tags and summary); while in progress the tags and summary areas show Skeleton loaders; upon completion the new values appear

**Given** I am a regular member (not the artifact owner and not a team admin)
**When** I view the artifact detail page
**Then** tags and summary are read-only (no edit controls, no "Regenerate" button visible)

---

## Epic 6: Comments & Feedback

Enable structured, permanent artifact comments with full author attribution. Depends on Epics 1–5.

### Story 6.1: Comment API & Data Model

As a member,
I want to post a comment on an artifact,
So that I can leave structured, permanent feedback that is attached to the artifact record.

**Acceptance Criteria:**

**Given** `POST /api/artifacts/[artifactId]/comments`
**When** called by an authenticated team member with a non-empty `content` field
**Then** it inserts a row in `comments` with a nanoid `id`, the caller's `userId`, the `artifactId`, the `content`, and `createdAt` (current timestamp); it returns the created comment object including `id`, `userId`, `content`, `createdAt`

**Given** `POST /api/artifacts/[artifactId]/comments`
**When** called with an empty or whitespace-only `content` field
**Then** it returns HTTP 400 with `{ error: "Comment cannot be empty", code: "VALIDATION_ERROR" }`

**Given** `POST /api/artifacts/[artifactId]/comments`
**When** called by a user who is NOT a member of the artifact's team
**Then** it returns HTTP 403 with `TEAM_ACCESS_DENIED`

**Given** `GET /api/artifacts/[artifactId]/comments`
**When** called by a team member
**Then** it returns all comments for the artifact ordered by `created_at ASC`, each including `id`, `userId`, `content`, `createdAt`; author display name must be resolved (from Clerk or stored at comment time)

**Given** comments exist on an artifact
**When** I inspect the database
**Then** no DELETE endpoint exists for comments; the `comments` table has no `deletedAt` column — permanence is enforced at the API layer

---

### Story 6.2: Comment Thread UI

As a member,
I want to see all comments on an artifact alongside its preview and add my own,
So that feedback is contextual, visible, and co-located with the content being discussed.

**Acceptance Criteria:**

**Given** the artifact detail page (`app/(dashboard)/artifacts/[artifactId]/page.tsx`)
**When** rendered on a wide viewport (lg+ breakpoint, ≥ 1024px)
**Then** the layout is side-by-side: artifact preview on the left, `ContextualCommentThread` pinned on the right

**Given** the same page on a mobile viewport (< 1024px)
**When** rendered
**Then** the comment thread stacks below the artifact preview in a single column

**Given** `ContextualCommentThread`
**When** comments exist
**Then** each `CommentItem` shows: user avatar (from Clerk or initials fallback), display name, relative timestamp ("2 hours ago"), and comment text; items are ordered oldest-to-newest (top to bottom)

**Given** the `CommentInput` at the bottom of the thread
**When** I type feedback and click "Add Comment"
**Then** the comment is submitted to `POST /api/artifacts/[artifactId]/comments`; on success a Toast notification "Comment Added" appears; the new comment appears at the bottom of the list

**Given** the comment submission is in flight
**When** I inspect the UI
**Then** the submit button shows a loading indicator and is disabled to prevent double submission

**Given** no comments exist on the artifact
**When** the thread renders
**Then** a friendly empty state appears: "No comments yet. Be the first to share feedback." — not a blank box

---

## Epic 7: MCP Server

Build and document the three-tool MCP server enabling in-session artifact publishing, search, and retrieval from Claude Desktop. Depends on Epics 1–6 (API routes must be deployed).

### Story 7.1: MCP Server Foundation & API Key Authentication

As a developer,
I want the MCP server scaffold with stdio transport and API key authentication working,
So that Claude Desktop can connect to the server and make authenticated calls on a user's behalf.

**Acceptance Criteria:**

**Given** `mcp-server/index.ts`
**When** the file is inspected
**Then** it creates an MCP server using `@modelcontextprotocol/sdk` with stdio transport, registers the three tool handlers, and starts listening

**Given** `mcp-server/api-client.ts`
**When** the module is inspected
**Then** it reads `ARTIFACT_HUB_API_URL` and `ARTIFACT_HUB_API_KEY` from environment variables; all HTTP calls to `/api/*` include the `Authorization: Bearer <key>` header; no Turso or DB access is present in the MCP server code

**Given** `mcp-server/package.json`
**When** inspected
**Then** it declares a `"build": "tsc"` script and the MCP server's own dependencies (`@modelcontextprotocol/sdk`, etc.); the root `package.json` has `"build:mcp": "cd mcp-server && npm install && npm run build"`

**Given** `mcp-server/tsconfig.json`
**When** inspected
**Then** it extends the root `tsconfig.json` and overrides `target: "ES2022"`, `module: "NodeNext"`, `outDir: "dist"`, `rootDir: "."`

**Given** `npm run build:mcp` is executed
**When** TypeScript compilation completes
**Then** `mcp-server/dist/index.js` is produced with no TypeScript errors

**Given** an invalid or revoked API key provided in `ARTIFACT_HUB_API_KEY`
**When** any MCP tool is invoked
**Then** the tool returns a structured MCP error response (not an unhandled exception) indicating authentication failed

---

### Story 7.2: `publish_artifact` Tool

As an MCP user (Claude Desktop),
I want to publish an artifact to Artifact Hub in a single conversational turn,
So that I can preserve AI-generated content in my team's catalog without leaving the session.

**Acceptance Criteria:**

**Given** the `publish_artifact` tool is registered in the MCP server
**When** Claude Desktop lists available tools
**Then** it shows `publish_artifact` with documented input schema: `title` (required, string), `content` (required, string or file URL), `team` (required, string — team slug), `tags` (optional, string array, max 8), `summary` (optional, string)

**Given** Claude Desktop calls `publish_artifact` with valid `title`, `content`, `team` (valid slug for the user's team), `tags`, and `summary`
**When** the MCP tool handler executes
**Then** it calls `POST /api/teams/[teamId]/artifacts` on the deployed app; the artifact is published with `enrichmentStatus: 'complete'` (skipping server enrichment since both tags and summary are provided); the tool returns `{ artifactId, url }` where `url` is the stable artifact Hub URL

**Given** Claude Desktop calls `publish_artifact` without `tags` or `summary`
**When** the MCP tool handler executes
**Then** the artifact is published and server-side enrichment is triggered asynchronously; the tool returns the artifact URL immediately without waiting for enrichment

**Given** a `team` slug that does not match any team the user belongs to
**When** the tool executes
**Then** it returns an MCP error response: "Team not found or you are not a member of this team"

**Given** successful publish
**When** the tool returns
**Then** the response includes the full stable artifact URL (e.g. `https://artifact-hub.vercel.app/artifacts/[artifactId]`), the artifact ID, and a success message that Claude can present to the user

---

### Story 7.3: `search_artifacts` & `get_artifact` Tools

As an MCP user (Claude Desktop),
I want to search the artifact catalog and retrieve artifact details with comments,
So that I can discover existing team work and surface context from the Hub within my conversation.

**Acceptance Criteria:**

**Given** the `search_artifacts` tool registered in the MCP server
**When** Claude calls it with a `query` string
**Then** the tool calls `GET /api/teams/*/artifacts?q=query` on the deployed app; it returns a structured list of matching artifacts (id, title, summary snippet, tags, team, url) capped at 50 results

**Given** `search_artifacts` is called with optional `tag`, `fileType`, and `teamSlug` parameters
**When** the API request is constructed
**Then** the applicable filters are included as query params; all constraints (team scope, 50-result cap) still apply

**Given** `search_artifacts` is called with no matching results
**When** the tool returns
**Then** it returns `{ artifacts: [], count: 0 }` — not an error

**Given** the `get_artifact` tool registered in the MCP server
**When** Claude calls it with an `artifactId`
**Then** the tool calls `GET /api/artifacts/[artifactId]` and `GET /api/artifacts/[artifactId]/comments`; it returns the full artifact metadata plus all comments (author, timestamp, text) in a single structured response

**Given** `get_artifact` is called for an artifact the user's API key does not have team access to
**When** the tool executes
**Then** it returns an MCP error: "You are not a member of the team that owns this artifact"

**Given** any MCP tool encounters an unexpected API error (5xx, network failure)
**When** the tool handler catches the error
**Then** it returns a structured MCP error response with a descriptive message; no unhandled promise rejections or process crashes occur

---

### Story 7.4: MCP Build, Claude Desktop Config & Documentation

As a developer or end user setting up Claude Desktop integration,
I want clear, tested setup instructions in the README,
So that I can configure the MCP server and start using it in under 5 minutes.

**Acceptance Criteria:**

**Given** `README.md` at the project root
**When** I find the "MCP Server Setup" section
**Then** it contains the exact `claude_desktop_config.json` JSON block with placeholder substitutions documented, the correct file paths for macOS (`~/Library/Application Support/Claude/claude_desktop_config.json`) and Windows (`%APPDATA%\Claude\claude_desktop_config.json`), and the 6 one-time setup steps from the Architecture specification verbatim

**Given** I follow the README steps on a clean machine
**When** I restart Claude Desktop after adding the config
**Then** the `artifact-hub` server appears in Claude Desktop's tools list and I can successfully invoke `publish_artifact` in a conversational turn

**Given** `mcp-server/dist/index.js` produced by `npm run build:mcp`
**When** Claude Desktop launches the process
**Then** no startup errors occur and the server responds to tool calls within 3 seconds

**Given** the MCP server is running and I invoke `publish_artifact` with a test artifact
**When** the call completes
**Then** the artifact appears in the team gallery in Artifact Hub and the returned URL is accessible by team members

---

## Epic 8: Admin Governance

Enforce admin-only artifact deletion with confirmation and proper RBAC. Depends on Epics 1–6.

### Story 8.1: Admin Artifact Deletion

As a team admin,
I want to delete any artifact in my team with an explicit confirmation step,
So that I can clean up stale or incorrect artifacts while preventing accidental permanent deletion.

**Acceptance Criteria:**

**Given** the artifact detail page for an artifact in a team where I am an admin
**When** I view the page
**Then** I see a "Delete Artifact" button (ghost/destructive style) that is NOT visible to regular members

**Given** I click "Delete Artifact"
**When** the confirmation Dialog opens
**Then** it displays: "This will permanently delete '[Artifact Title]'. This action cannot be undone." with a red "Delete Artifact" button and a grey "Cancel" button (UX-DR15)

**Given** I confirm deletion
**When** `DELETE /api/artifacts/[artifactId]` executes
**Then** it verifies the caller has `admin` role in the artifact's team via `resolveAuth()`; on success it deletes the artifact row (cascading to `artifact_tags` and `comments` via database foreign key constraints); returns HTTP 200 with `{ success: true }`

**Given** successful deletion
**When** I am redirected
**Then** I land on the gallery page; a Toast notification "Artifact Deleted" appears; the deleted artifact no longer appears in the gallery or search results

**Given** `DELETE /api/artifacts/[artifactId]`
**When** called by a user with `member` role (not admin)
**Then** it returns HTTP 403 with `{ error: "Only team admins can delete artifacts", code: "FORBIDDEN" }`

**Given** `DELETE /api/artifacts/[artifactId]`
**When** called for an artifactId that does not exist
**Then** it returns HTTP 404 with `NOT_FOUND`

---

## Epic 9: UX Polish, Accessibility & Deployment

Deliver a production-ready experience with polished empty states, toast notifications, responsive layout, WCAG 2.1 AA accessibility, Vercel deployment, and the challenge WRITEUP.md. Depends on all prior epics.

### Story 9.1: Empty States, Toast Notifications & Error UX

As a user,
I want clear, actionable states for empty content and operation feedback,
So that I always know what is happening and what to do next — never hitting a dead end.

**Acceptance Criteria:**

**Given** a team with no published artifacts
**When** a member views the gallery
**Then** the empty state renders a graphic/illustration, the heading "No artifacts yet", a primary "Publish Your First Artifact" button, and a secondary link "How to publish from Claude Desktop"

**Given** a keyword search or filter combination that returns zero results
**When** the gallery renders the empty result set
**Then** it shows "No results found for '[query]'" or "No artifacts match the active filters" with a "Clear all filters" text button immediately below

**Given** I successfully publish an artifact via the web UI
**When** I am redirected to the artifact detail page
**Then** a Toast notification "Artifact Published" appears in the bottom-right corner and auto-dismisses after 4 seconds

**Given** I copy an artifact URL (via the copy button on the detail page)
**When** the URL is written to clipboard
**Then** a Toast notification "URL Copied to Clipboard" appears

**Given** any publish, comment, tag save, or delete operation fails with a network or server error
**When** the UI handles the error
**Then** a descriptive inline error message (not a generic "Something went wrong") appears within the form or action context, with retry guidance; no silent failures

---

### Story 9.2: Responsive Layout & Accessibility

As any user,
I want the application to be usable on mobile devices and navigable by keyboard and screen readers,
So that the platform is accessible to all team members regardless of device or ability.

**Acceptance Criteria:**

**Given** a viewport width below 768px (`md` breakpoint)
**When** the gallery page renders
**Then** the sidebar collapses into a hamburger menu/drawer; the artifact list switches to a single-column stack; the floating "New Artifact" button is accessible

**Given** a viewport width of 1024px or above (`lg` breakpoint)
**When** the artifact detail page renders
**Then** the layout is side-by-side: artifact preview (left ~60%) and comment thread (right ~40%, pinned)

**Given** any interactive element (buttons, cards, inputs, tag chips, nav links)
**When** I navigate via keyboard Tab key
**Then** a clearly visible focus ring (`focus-visible:ring`) appears on the focused element; no interactive element is unreachable by keyboard

**Given** a button that uses only an icon (e.g. "×" on tag chips, "Trash" delete icon)
**When** I inspect the HTML
**Then** it includes `<span className="sr-only">[Accessible label]</span>` so screen readers announce the action correctly

**Given** the artifact detail page
**When** a screen reader user navigates by headings
**Then** the artifact title is an `<h1>`, section headings (Summary, Tags, Comments) are `<h2>`, and no heading levels are skipped

**Given** all text content (body text, labels, placeholder text)
**When** measured against WCAG 2.1 AA contrast requirements
**Then** all text passes at minimum 4.5:1 contrast ratio against its background using the monochrome zinc palette

**Given** the publish form modal
**When** it opens
**Then** focus is trapped within the dialog (handled by shadcn/ui Radix Dialog); pressing Escape closes the dialog without publishing

---

### Story 9.3: Vercel Deployment, Environment Setup & WRITEUP.md

As the challenge evaluator,
I want the application running at a public Vercel URL with all environment variables configured,
So that I can evaluate the full product experience without any local setup.

**Acceptance Criteria:**

**Given** a fresh `git push` to the main branch
**When** Vercel's Git integration triggers a build
**Then** the build completes without errors; the application is deployed to the production URL

**Given** the Vercel dashboard for the project
**When** I inspect the environment variables
**Then** all required vars are set: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `BLOB_READ_WRITE_TOKEN`, `ANTHROPIC_API_KEY`, `ENRICH_SECRET`, `NEXT_PUBLIC_APP_URL`; zero secrets are committed to the repository

**Given** the deployed production URL
**When** I visit it as an unauthenticated user
**Then** I am redirected to Clerk sign-in; after signing up, I can complete the full publish → browse → comment flow without any local setup

**Given** `WRITEUP.md` at the project root
**When** I read it
**Then** it covers: (1) what was built and why design choices were made, (2) how to run the project locally, (3) how to configure Claude Desktop for MCP, (4) what out-of-scope items were deferred and why, (5) any known limitations or rough edges

**Given** the Turso database
**When** Drizzle migrations are run on the production database
**Then** all six tables exist with correct schema; at least one demo artifact has been published so the gallery is not empty for the evaluator

**Given** `README.md`
**When** I follow the local development setup steps
**Then** I can run the app locally with `npm run dev` after copying `.env.example` to `.env.local` and filling in the values; the MCP server builds successfully with `npm run build:mcp`
