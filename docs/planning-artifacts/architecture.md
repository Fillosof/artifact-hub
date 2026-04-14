---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-04-14'
inputDocuments:
  - docs/planning-artifacts/prd.md
  - docs/planning-artifacts/prd-validation-report.md
  - docs/planning-artifacts/product-brief-artifact-hub.md
  - docs/planning-artifacts/product-brief-artifact-hub-distillate.md
  - docs/artifact-hub-challenge.md
workflowType: 'architecture'
project_name: 'Yurii_Krot@epam.com-Artifact-Hub'
user_name: 'Yurii'
date: '2026-04-14'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (47 FRs across 9 domains):**

| Domain | FRs | Architectural Impact |
|--------|-----|---------------------|
| Authentication & Identity | FR1-FR4 | Dual auth surface: Clerk sessions (web) + API keys (MCP). Key generation, hashing, revocation. |
| Team Management | FR5-FR11 | Multi-team membership model, RBAC (member/admin), self-serve team creation, invite mechanism. |
| Artifact Publishing | FR12-FR18 | Dual publish path (web upload + MCP), 10MB file validation, async AI enrichment pipeline, source URL field. |
| Discovery & Browsing | FR19-FR22A | Team-scoped gallery, filtering (tag/type/team), keyword search, stable authenticated URLs, access-denied UX. |
| Detail & Preview | FR23-FR28 | Format-specific rendering (image/PDF/HTML/fallback), sandboxed HTML preview, authenticated file proxy. |
| Tags & Enrichment | FR29-FR33 | Post-publish tag/summary editing, AI re-enrichment trigger, tag normalization (lowercase, max 8). |
| Comments & Feedback | FR34-FR37 | Structured comments with attribution/timestamp, permanent record, visible on artifact detail. |
| Artifact Governance | FR38-FR40 | Admin-only delete, permanent deletion (no soft-delete in MVP). |
| MCP Server | FR41-FR46 | 3 tools (publish, search, get), API key auth, team-scoped operations, returns artifact URL on publish. |

**Non-Functional Requirements:**

- **Performance:** Gallery < 2s, publish confirmation < 3s, MCP responses < 3s, enrichment < 10s
- **Security:** Authenticated file proxy (no raw Blob URLs), hashed API keys, sandboxed HTML preview, HTTPS
- **Scalability:** 10 teams, 50 concurrent users, 500 artifacts (no caching layer needed at MVP)
- **Accessibility:** Keyboard-navigable core flows, WCAG 2.1 AA contrast, labeled form inputs
- **Reliability:** 99.9% uptime (Vercel SLA), graceful enrichment failure, structured MCP error responses
- **Maintainability:** Components < 200 lines, TypeScript strict, Drizzle migrations, zero hard-coded secrets

**Scale & Complexity:**

- Primary domain: Full-stack web platform + MCP protocol server
- Complexity level: Medium — integration complexity (dual auth, AI orchestration, file proxy) rather than data complexity
- Estimated architectural components: ~8-10 (auth layer, team model, artifact CRUD, file storage proxy, AI enrichment service, MCP server, gallery/browse UI, artifact detail UI, comment system, admin controls)

### Technical Constraints & Dependencies

| Constraint | Source | Impact |
|-----------|--------|--------|
| Next.js App Router | Stack lock (brief) | Server components, API routes, server actions shape the architecture |
| Turso + Drizzle | Stack lock | SQLite-compatible, schema-first migrations, no stored procedures |
| Vercel Blob | Stack lock | File storage; no direct client access (security requirement) |
| Clerk | Stack lock | Browser auth only; team membership/roles managed in Turso, not Clerk orgs |
| Vercel deployment | Stack lock | Serverless functions, edge runtime constraints, cold starts |
| Claude API | AI enrichment | External dependency; must handle latency, failures, rate limits gracefully |
| MCP TypeScript SDK | MCP server | Protocol compliance; tool schema contracts are externally visible |
| Solo developer, 2-day timebox | Challenge | Architecture must minimize moving parts; no over-engineering |

### Cross-Cutting Concerns Identified

1. **Authentication & Authorization** — Every route, every API call, every file access must verify identity (Clerk or API key) and team membership. This is the single most pervasive architectural concern.
2. **Team Scoping** — All data queries (browse, search, MCP) must filter by the user's team memberships. This affects database query patterns, API response shapes, and caching strategies.
3. **Async Enrichment Lifecycle** — Publish is synchronous; enrichment is async. UI must handle the "enrichment pending" state. Failure must not corrupt the artifact record.
4. **File Access Authorization** — Authenticated proxy between client and Vercel Blob. Affects every preview, download, and MCP file retrieval.
5. **Error Handling & UX** — Access-denied must be actionable (not generic 403), publish failures must be descriptive, enrichment failures must be recoverable (manual tags, re-enrich button).

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application (Next.js App Router) based on project requirements analysis.

### Starter Options Considered

| Option | Verdict | Reasoning |
|--------|---------|-----------|
| `create-next-app` (official) | Selected | Minimal, aligned with Vercel deployment, layer on what we need |
| `create-t3-app` (T3 Stack) | Rejected | Wrong ORM (Prisma), wrong auth (NextAuth) — would require ripping out more than it provides |
| Custom starter / monorepo | Rejected | Overkill for solo dev, 2-day timebox |

### Selected Starter: `create-next-app` with layered dependencies

**Rationale:** The official starter gives the cleanest foundation. We add Clerk, Drizzle+Turso, Vercel Blob, shadcn/ui, and the MCP SDK as explicit dependencies. This avoids fighting an opinionated starter and keeps the dependency tree transparent.

**Initialization Command:**

```bash
npx create-next-app@latest artifact-hub --typescript --tailwind --eslint --app --turbopack --import-alias "@/*"
```

Then layer dependencies:

```bash
# Auth
npm install @clerk/nextjs

# Database
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit

# File storage
npm install @vercel/blob

# MCP server
npm install @modelcontextprotocol/sdk

# UI components
npx shadcn@latest init

# AI enrichment
npm install @anthropic-ai/sdk
```

**Verified Current Versions (April 2026):**

| Package | Version | Purpose |
|---------|---------|---------|
| Next.js | 16.2.3 | Framework (App Router, React 19, Turbopack) |
| @clerk/nextjs | 7.0.11 | Browser authentication (Core 3) |
| drizzle-orm + drizzle-kit | latest | ORM + migration tooling |
| @libsql/client | latest | Turso/libSQL driver |
| @vercel/blob | >= 2.3 | File storage (private storage support) |
| @modelcontextprotocol/sdk | 1.29.0 | MCP server implementation |
| shadcn/ui (CLI v4) | March 2026 | Component library (Tailwind v4, React 19) |
| TypeScript | 5.x | Language (strict mode) |
| Tailwind CSS | v4 | Styling (included in create-next-app defaults) |

**Architectural Decisions Provided by Starter:**

**Language & Runtime:** TypeScript 5.x strict, React 19, Node.js runtime for API routes

**Styling Solution:** Tailwind CSS v4 (utility-first) + shadcn/ui for composable, accessible components

**Build Tooling:** Turbopack (dev), Webpack (production), automatic code splitting, server/client component boundaries

**Testing Framework:** Not included — given 2-day timebox, testing is minimal

**Code Organization:** Next.js App Router conventions — `app/` directory, file-based routing, server components by default, `"use client"` directive for interactive components

**Development Experience:** Turbopack hot reload, TypeScript type checking, ESLint, `@/*` import aliases

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- API pattern: REST-like API Routes for all operations
- MCP server transport: stdio (standalone process, calls deployed API)
- Dual auth: Clerk sessions (web) + hashed API keys (MCP)
- File proxy: authenticated `/api/files/[id]` route, no raw Blob URLs to client
- Async enrichment: separate `/api/enrich` route, fire-and-forget from publish

**Important Decisions (Shape Architecture):**
- Server Components for data-fetching pages, Client Components only for interactivity
- URL search params for filter/search state (no state management library)
- Schema-first Drizzle with `push` for dev, `generate+migrate` for production

**Deferred Decisions (Post-MVP):**
- Caching layer (not needed at 500 artifacts / 50 users)
- Rate limiting (internal tool, trusted users)
- Monitoring/APM (Vercel built-in analytics sufficient for MVP)

### Data Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | Turso (libSQL) via Drizzle ORM | Stack lock. SQLite-compatible, schema-first TypeScript types. |
| Schema approach | Drizzle schema-first | Types derived from schema, single source of truth. |
| Migration strategy | `drizzle-kit push` (dev), `generate+migrate` (prod) | Speed during build, safety for deployment. |
| API key storage | SHA-256 hash in Turso | Hash on store, hash on validate, show raw key once on generation. |
| Tag normalization | Application-layer on write | Lowercase, trim, deduplicate, cap at 8 — enforced before DB insert. |

### Authentication & Security

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Browser auth | Clerk 7.x (@clerk/nextjs) | Stack lock. Middleware-based session validation on all routes. |
| MCP auth | Per-user API keys (SHA-256 hashed) | Separate from Clerk. Stateless validation on every MCP request. |
| Auth middleware | Clerk middleware for web routes; custom API key validation for `/api/*` MCP-facing endpoints | Dual auth surfaces coexist cleanly. |
| File access | Authenticated proxy via `/api/files/[id]` | Verifies Clerk session or API key + team membership, then proxies from Vercel Blob. Raw Blob URLs never reach the client. |
| HTML preview | Sandboxed iframe (`sandbox` attribute, no `allow-scripts`) | Untrusted HTML content must never execute JavaScript. |

### API & Communication Patterns

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API pattern | REST-like API Routes (`/api/*`) for all operations | Single consistent pattern. Same endpoints serve web UI and MCP server. |
| MCP transport | Stdio (standalone Node.js process) | Claude Desktop launches the MCP server locally. Server authenticates to deployed app via API key over HTTP. |
| MCP ↔ App communication | HTTP calls to deployed `/api/*` endpoints | MCP server is an API client. Clean separation — MCP server has no direct DB access. |
| Async enrichment | Separate `/api/enrich` route, fire-and-forget | Publish route fires non-awaited fetch to `/api/enrich` after returning success. Independent serverless invocation. Enrichment failure is fully isolated from publish. |
| Error handling | Structured JSON error responses: `{ error: string, code: string, detail?: string }` | Consistent across web and MCP consumers. Access-denied includes team name and next step. |

### Frontend Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rendering strategy | Server Components by default; `"use client"` only for interactive elements | Minimizes client JS. Gallery, artifact detail, comments list are server-rendered. |
| Client Components | Upload form, comment form, filter controls, tag editor, delete confirmation | Only where user interaction requires it. |
| State management | URL search params for filters/search; no state management library | Server re-renders on param change. Simple, shareable URLs. |
| Gallery layout | Grid of artifact cards, server-rendered | Filters update URL params → server re-render. |
| Form handling | Controlled forms in Client Components, submit to API Routes via fetch | Consistent with API-first pattern. |
| Component library | shadcn/ui (CLI v4, Tailwind v4, React 19) | Composable, accessible, copy-paste ownership. |

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hosting | Vercel (serverless) | Stack lock. Zero-config deployment for Next.js. |
| Environment variables | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `BLOB_READ_WRITE_TOKEN`, `ANTHROPIC_API_KEY`, `ENRICH_SECRET` | All in Vercel dashboard, never committed. `ENRICH_SECRET` protects the internal enrich endpoint (see Resolved Gaps). |
| MCP server distribution | Bundled in repo, user runs via `npx` or direct node invocation | Claude Desktop config references the local entry point. Setup documented in repo. |
| CI/CD | Vercel Git integration (push-to-deploy) | Automatic preview + production deployments. No custom pipeline needed. |

### Decision Impact Analysis

**Implementation Sequence:**
1. Project init + Drizzle schema + Turso connection
2. Clerk auth middleware + protected routes
3. API Routes: teams, artifacts (CRUD), file proxy
4. Web UI: publish form, gallery, artifact detail, comments
5. AI enrichment: `/api/enrich` route + Claude API integration
6. MCP server: stdio process with `publish_artifact`, `search_artifacts`, `get_artifact`
7. Polish: error states, access-denied UX, tag editing, admin delete

**Cross-Component Dependencies:**
- API Routes are the backbone — both web UI and MCP server depend on them
- File proxy must exist before artifact detail/preview can work
- Clerk middleware must be in place before any protected route
- Enrichment route must exist before publish can trigger it
- MCP server depends on all API Routes being functional

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 12 areas where AI agents could make different choices, all resolved below.

### Naming Patterns

**Database Naming Conventions:**
- Tables: `snake_case`, plural — `teams`, `artifacts`, `team_memberships`, `artifact_tags`, `comments`, `api_keys`
- Columns: `snake_case` — `created_at`, `team_id`, `file_url`, `created_by`
- Foreign keys: `{referenced_table_singular}_id` — `team_id`, `artifact_id`, `user_id`
- Indexes: `idx_{table}_{column}` — `idx_artifacts_team_id`, `idx_team_memberships_user_id`
- Drizzle maps to camelCase in TypeScript automatically; no manual mapping needed

**API Naming Conventions:**
- Endpoints: plural nouns, nested under team scope
- `GET /api/teams` — list user's teams
- `POST /api/teams` — create team
- `GET /api/teams/[teamId]/artifacts` — list team artifacts
- `POST /api/teams/[teamId]/artifacts` — publish artifact
- `GET /api/artifacts/[artifactId]` — get artifact detail (team membership verified server-side)
- `POST /api/artifacts/[artifactId]/comments` — add comment
- `GET /api/files/[artifactId]` — authenticated file proxy
- `POST /api/enrich` — trigger AI enrichment (internal)
- `POST /api/keys` — generate API key
- `DELETE /api/keys` — revoke API key
- Query params: `camelCase` — `?tag=strategy&fileType=pdf`
- Route params: `camelCase` in brackets — `[teamId]`, `[artifactId]`

**Code Naming Conventions:**
- Files: `kebab-case.ts` / `kebab-case.tsx` — `artifact-card.tsx`, `team-selector.tsx`
- Exported components: `PascalCase` — `ArtifactCard`, `TeamSelector`
- Functions: `camelCase` — `getArtifact`, `resolveAuth`, `enrichArtifact`
- Variables/constants: `camelCase` — `teamId`, `currentUser`
- Types/interfaces: `PascalCase` — `Artifact`, `TeamMembership`, `ApiError`
- Environment variables: `SCREAMING_SNAKE_CASE` — `TURSO_DATABASE_URL`, `ANTHROPIC_API_KEY`

### Structure Patterns

**Project Organization:**
- Feature logic in `lib/` — `lib/db.ts`, `lib/auth.ts`, `lib/enrichment.ts`
- Drizzle schema in `lib/schema.ts` (single file for MVP, split if it exceeds 200 lines)
- Shared types in `lib/types.ts`
- API routes in `app/api/` following Next.js conventions
- UI components in `components/` — flat structure (no deep nesting for MVP)
- MCP server in `mcp-server/` at repo root (separate entry point, not inside `app/`)

**File Structure Rules:**
- One component per file
- Components stay under 200 lines
- Co-locate route-specific components with the page only if used nowhere else
- Shared components go in top-level `components/`
- No `utils/` or `helpers/` junk drawer — name the module after what it does (`lib/auth.ts`, not `lib/utils.ts`)

### Format Patterns

**API Response Formats:**

Success — direct response (no wrapper):
```json
{ "id": "abc123", "title": "Q3 Strategy", "tags": ["strategy", "q3"] }
```

Success list — direct array with optional metadata:
```json
{ "artifacts": [...], "count": 42 }
```

Error — structured object:
```json
{ "error": "You are not a member of this team", "code": "TEAM_ACCESS_DENIED" }
```

**Error Codes (standardized):**
- `AUTH_REQUIRED` — no valid session or API key
- `TEAM_ACCESS_DENIED` — authenticated but not a team member
- `NOT_FOUND` — resource doesn't exist
- `FORBIDDEN` — authenticated but insufficient role (e.g., member trying to delete)
- `VALIDATION_ERROR` — bad input (include `detail` field with specifics)
- `FILE_TOO_LARGE` — upload exceeds 10MB
- `ENRICHMENT_FAILED` — AI enrichment error (non-blocking, logged)
- `INTERNAL_ERROR` — unexpected server error

**Data Formats:**
- Dates in JSON: ISO 8601 strings — `"2026-04-14T10:30:00Z"`
- IDs: nanoid (short, URL-safe) — not UUIDs, not auto-increment integers
- Booleans: `true`/`false` (never 1/0)
- Null fields: include with `null` value, don't omit the key
- Tags: always an array, even if empty — `"tags": []`

### Process Patterns

**Auth Checking Pattern (cross-cutting, must be identical everywhere):**

Shared helper: `resolveAuth(request) → { userId, teamIds }`
- Checks Clerk session first (web requests)
- Falls back to `Authorization: Bearer <apiKey>` header (MCP requests)
- Returns userId and list of team IDs the user belongs to
- Throws structured error if neither auth method succeeds
- Every API route calls this as its first operation

**Team membership verification:**
```
resolveAuth(req) → { userId, teamIds }
verify teamId in teamIds → or return TEAM_ACCESS_DENIED
proceed with operation
```

**Error Handling Patterns:**
- API routes: try/catch at route level, return structured JSON error
- Never expose stack traces or internal details to client
- Log full error server-side with `console.error` (Vercel captures these)
- Enrichment failures: log and continue, never block publish response
- File proxy failures: return appropriate HTTP status with error JSON

**Loading State Patterns (frontend):**
- Server Components: Next.js `loading.tsx` for route-level suspense
- Client Components: local `isLoading` state within the component
- No global loading state — each component manages its own
- Skeleton UI for gallery grid (server-side `loading.tsx`)
- Inline spinner for form submissions (client-side `isLoading`)

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow naming conventions exactly — no ad-hoc variations
- Use `resolveAuth()` for every API route — no inline auth checks
- Return structured error JSON for all failure cases — no plain text errors
- Keep components under 200 lines — extract if approaching limit
- Use nanoid for all new entity IDs
- Never expose Vercel Blob URLs to the client

**Anti-Patterns to Avoid:**
- `utils.ts` or `helpers.ts` catch-all files
- Inline auth checking duplicated across routes
- Mixing snake_case and camelCase in API responses
- Silent failures (swallowing errors without logging)
- Direct Vercel Blob URL construction in client components

### Testing Standards

**Testing is mandatory for every story. Every story file MUST include a final task: "Write unit tests".**

**Framework:** Vitest (`npm test` / `npm run test:watch`)
- Config: `vitest.config.ts` at repo root
- Test files: `lib/__tests__/*.test.ts` for lib modules; `app/api/**/__tests__/*.test.ts` for API routes

**What to test per story (mandatory):**

| Story produces | Required test | Location |
|---|---|---|
| `lib/` function (auth, enrichment, tags, etc.) | Unit test — pure logic, mock external deps | `lib/__tests__/{module}.test.ts` |
| API route (`app/api/**`) | Integration test — mock `resolveAuth`, assert response shape and status | co-located `__tests__/` beside route file |
| UI component only (no lib/API) | Type-check via `npm run build` is sufficient; no Vitest test required | — |

**Mandatory final task template** — every story's Tasks section MUST end with:

```
- [ ] Task N: Write unit tests (AC: all)
  - [ ] Create test file at [appropriate path per table above]
  - [ ] Cover happy path and key error/edge cases for each function/endpoint introduced
  - [ ] Run `npm test` — all tests must pass with zero failures before marking story done
```

**All AI agents devving a story MUST NOT mark a story done until `npm test` passes.**

## Project Structure & Boundaries

### Complete Project Directory Structure

```
./   (repo root)
├── app/
│   ├── globals.css
│   ├── layout.tsx                          # Root layout: ClerkProvider, global styles
│   ├── page.tsx                            # Landing → redirect to /gallery
│   ├── sign-in/[[...sign-in]]/
│   │   └── page.tsx                        # Clerk sign-in page
│   ├── sign-up/[[...sign-up]]/
│   │   └── page.tsx                        # Clerk sign-up page
│   ├── (dashboard)/
│   │   ├── layout.tsx                      # Authenticated layout: nav header, team context
│   │   ├── gallery/
│   │   │   ├── page.tsx                    # Gallery/catalog browse (FR19-FR21)
│   │   │   └── loading.tsx                 # Skeleton grid while loading
│   │   ├── publish/
│   │   │   └── page.tsx                    # Upload form (FR12-FR14)
│   │   ├── artifacts/
│   │   │   └── [artifactId]/
│   │   │       └── page.tsx                # Artifact detail + preview + comments (FR22-FR37)
│   │   ├── teams/
│   │   │   ├── page.tsx                    # Team list (FR11)
│   │   │   ├── new/
│   │   │   │   └── page.tsx                # Create team (FR5)
│   │   │   └── [teamId]/
│   │   │       └── page.tsx                # Team settings + members (FR6-FR10)
│   │   └── settings/
│   │       └── page.tsx                    # API key management (FR2-FR3)
│   └── api/
│       ├── teams/
│       │   ├── route.ts                    # GET list, POST create
│       │   └── [teamId]/
│       │       ├── route.ts                # GET detail, DELETE team (FR9)
│       │       ├── members/
│       │       │   └── route.ts            # GET list, POST invite, DELETE remove (FR6-FR8)
│       │       └── artifacts/
│       │           └── route.ts            # GET list, POST publish (FR12-FR18)
│       ├── artifacts/
│       │   └── [artifactId]/
│       │       ├── route.ts                # GET detail, DELETE admin (FR23, FR38-FR40)
│       │       ├── tags/
│       │       │   └── route.ts            # PUT update tags (FR29-FR30, FR33)
│       │       ├── summary/
│       │       │   └── route.ts            # PUT update summary (FR31)
│       │       ├── enrich/
│       │       │   └── route.ts            # POST re-enrich (FR32)
│       │       └── comments/
│       │           └── route.ts            # GET list, POST add (FR34-FR37)
│       ├── files/
│       │   └── [artifactId]/
│       │       └── route.ts                # GET authenticated file proxy (FR28)
│       ├── enrich/
│       │   └── route.ts                    # POST trigger enrichment (FR15-FR17, internal)
│       └── keys/
│           └── route.ts                    # POST generate, DELETE revoke (FR2-FR3)
├── components/
│   ├── ui/                                 # shadcn/ui base components (Button, Card, Dialog, etc.)
│   ├── artifact-card.tsx                   # Gallery card: thumbnail, title, tags, team
│   ├── artifact-preview.tsx                # Format-specific preview (FR24-FR27)
│   ├── comment-form.tsx                    # Add comment (FR34)
│   ├── comment-list.tsx                    # Comments display (FR35-FR36)
│   ├── gallery-filters.tsx                 # Filter controls: tag, type, team (FR20)
│   ├── gallery-grid.tsx                    # Responsive artifact grid (FR19)
│   ├── nav-header.tsx                      # Main navigation + team switcher
│   ├── publish-form.tsx                    # Upload: file + title + source URL (FR12-FR13)
│   ├── tag-editor.tsx                      # Tag chips: add, remove, regenerate (FR29-FR32)
│   ├── team-selector.tsx                   # Team picker dropdown
│   └── team-members.tsx                    # Member list + role management (FR6-FR8)
├── lib/
│   ├── auth.ts                             # resolveAuth(), API key hash/validate
│   ├── db.ts                               # Drizzle client + Turso connection
│   ├── schema.ts                           # Drizzle schema: all tables
│   ├── enrichment.ts                       # Claude API: generate tags + summary
│   └── types.ts                            # Shared TypeScript types
├── mcp-server/
│   ├── index.ts                            # Entry point: stdio transport, tool registration
│   ├── tools.ts                            # publish_artifact, search_artifacts, get_artifact
│   ├── api-client.ts                       # HTTP client wrapping /api/* endpoints
│   └── package.json                        # Separate deps (MCP SDK, fetch)
├── middleware.ts                            # Clerk auth middleware (FR4)
├── drizzle.config.ts                       # Drizzle Kit: Turso connection, schema path
├── next.config.ts                          # Next.js config
├── tailwind.config.ts                      # Tailwind v4 config
├── tsconfig.json                           # TypeScript strict mode
├── package.json
├── .env.local                              # Local env vars (gitignored)
├── .env.example                            # Required env var template
├── .gitignore
├── WRITEUP.md                              # Challenge deliverable
└── README.md
```

### Architectural Boundaries

**API Boundaries:**

| Boundary | External Consumers | Internal Only |
|----------|-------------------|---------------|
| `/api/teams/**` | Web UI, MCP server | — |
| `/api/artifacts/**` | Web UI, MCP server | — |
| `/api/files/[artifactId]` | Web UI (previews/downloads) | — |
| `/api/keys` | Web UI (settings page) | — |
| `/api/enrich` | — | Called by publish route (fire-and-forget) |

**Auth Boundary:**
- `middleware.ts` (Clerk) protects all routes except `/sign-in`, `/sign-up`, `/api/files/*`, and `/api/teams/*/artifacts` (which accept both Clerk and API key auth)
- Every `/api/*` route calls `resolveAuth(req)` as first operation
- MCP server authenticates via `Authorization: Bearer <apiKey>` header against all API routes

**Data Boundary:**
- Only `lib/db.ts` creates the Drizzle client — no direct Turso connections elsewhere
- Only `lib/enrichment.ts` calls the Claude API — no scattered Anthropic SDK usage
- Only `app/api/files/[artifactId]/route.ts` accesses Vercel Blob — raw URLs never leave this boundary

**Component Boundary:**
- Server Components: `page.tsx` files, `gallery-grid.tsx`, `comment-list.tsx` — fetch data, render HTML
- Client Components: `publish-form.tsx`, `comment-form.tsx`, `gallery-filters.tsx`, `tag-editor.tsx` — handle user interaction, submit to API Routes via fetch

### Requirements to Structure Mapping

| FR Domain | API Routes | Pages | Components | Lib |
|-----------|-----------|-------|------------|-----|
| Auth & Identity (FR1-FR4) | `/api/keys` | `/settings`, `/sign-in`, `/sign-up` | — | `auth.ts` |
| Team Management (FR5-FR11) | `/api/teams/**` | `/teams`, `/teams/new`, `/teams/[teamId]` | `team-selector`, `team-members` | — |
| Publishing (FR12-FR18) | `/api/teams/[teamId]/artifacts` | `/publish` | `publish-form` | `enrichment.ts` |
| Discovery (FR19-FR22A) | `/api/teams/[teamId]/artifacts` | `/gallery` | `gallery-grid`, `gallery-filters`, `artifact-card` | — |
| Detail & Preview (FR23-FR28) | `/api/artifacts/[id]`, `/api/files/[id]` | `/artifacts/[artifactId]` | `artifact-preview` | — |
| Tags & Enrichment (FR29-FR33) | `/api/artifacts/[id]/tags`, `/summary`, `/enrich` | — | `tag-editor` | `enrichment.ts` |
| Comments (FR34-FR37) | `/api/artifacts/[id]/comments` | — | `comment-form`, `comment-list` | — |
| Governance (FR38-FR40) | `/api/artifacts/[id]` (DELETE) | `/artifacts/[artifactId]` | — | — |
| MCP Server (FR41-FR46) | All `/api/*` (as consumer) | — | — | `mcp-server/*` |

### Data Flow

```
Web UI Flow:
  Browser → Clerk middleware → page.tsx (Server Component)
    → fetch /api/* → resolveAuth() → Drizzle query → Turso
    → return JSON → render

MCP Flow:
  Claude Desktop → stdio → mcp-server/index.ts
    → api-client.ts → HTTP → /api/* → resolveAuth(apiKey)
    → Drizzle query → Turso → return JSON → MCP response

Enrichment Flow:
  /api/teams/[teamId]/artifacts (POST)
    → save artifact to Turso + file to Blob
    → return success to client
    → fire fetch to /api/enrich (non-awaited)
      → /api/enrich → lib/enrichment.ts → Claude API
      → update artifact tags + summary in Turso

File Access Flow:
  Browser/MCP → /api/files/[artifactId]
    → resolveAuth() → verify team membership
    → fetch file_url from Turso → proxy from Vercel Blob
    → stream file bytes to client
```

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All technology versions verified compatible. No conflicts between Next.js 16.2.3, Clerk 7.x, Drizzle/Turso, Vercel Blob, MCP SDK 1.29.0, and shadcn/ui CLI v4.

**Pattern Consistency:** Naming, structure, and format patterns align with the chosen technology stack. No contradictions between patterns and decisions.

**Structure Alignment:** Project directory structure directly supports all architectural decisions and cleanly separates concerns.

### Requirements Coverage Validation

**Functional Requirements:** All 47 FRs mapped to specific API routes, pages, components, and library modules. No orphan requirements.

**Non-Functional Requirements:** All NFR categories (performance, security, scalability, accessibility, reliability, maintainability) addressed by architectural decisions.

### Implementation Readiness Validation

**Decision Completeness:** All critical decisions documented with verified versions. Implementation patterns include concrete examples and anti-patterns.

**Structure Completeness:** Complete project tree with every file mapped to specific FRs. All integration points documented with data flow diagrams.

**Pattern Completeness:** 12 conflict points identified and resolved. Enforcement guidelines and anti-patterns documented.

### Gap Analysis Results

**Critical Gaps:** 0

**Important Gaps:** All 4 gaps resolved — see [Resolved Implementation Gaps](#resolved-implementation-gaps) section below.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (medium — integration complexity)
- [x] Technical constraints identified (8 constraints documented)
- [x] Cross-cutting concerns mapped (5 concerns)

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified (9 packages, all verified)
- [x] Integration patterns defined (API-first, stdio MCP, async enrichment)
- [x] Performance considerations addressed (server components, async enrichment, file streaming)

**Implementation Patterns**
- [x] Naming conventions established (DB, API, code, files)
- [x] Structure patterns defined (project organization, file rules)
- [x] Format patterns specified (API responses, error codes, data formats)
- [x] Process patterns documented (auth checking, error handling, loading states)

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established (server/client, data/auth/file)
- [x] Integration points mapped (4 data flow diagrams)
- [x] Requirements to structure mapping complete (all 47 FRs)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Single API surface serves both web UI and MCP server — one set of endpoints to build and test
- Clean separation of concerns — auth, data, files, enrichment each isolated in dedicated modules
- Async enrichment pattern prevents the most likely performance bottleneck
- Project structure maps 1:1 to functional requirements — clear implementation targets

**Areas for Future Enhancement:**
- Caching layer if gallery performance degrades beyond 1,000 artifacts
- Rate limiting if/when exposed to broader user base
- Vector search via Turso native capability for natural language search
- Monitoring/APM beyond Vercel built-in analytics

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- Reference the PRD for detailed functional requirement specifications

**First Implementation Priority:**
```bash
npx create-next-app@latest artifact-hub --typescript --tailwind --eslint --app --turbopack --import-alias "@/*"
```
Then follow the implementation sequence: schema → auth → API routes → UI → enrichment → MCP → polish.

## Resolved Implementation Gaps

_These four gaps were identified during architecture validation and resolved before implementation began._

### Gap 1 — Database Column-Level Schema

**Decision:** Full Drizzle schema defined here. All agent-generated code must match this schema exactly — no ad-hoc column additions.

```typescript
// lib/schema.ts
import { text, integer, sqliteTable, primaryKey, uniqueIndex, index } from 'drizzle-orm/sqlite-core'

export const teams = sqliteTable('teams', {
  id:        text('id').primaryKey(),                        // nanoid
  name:      text('name').notNull(),
  slug:      text('slug').notNull().unique(),                 // URL-safe; used by MCP team slug param
  createdBy: text('created_by').notNull(),                   // Clerk userId
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const teamMemberships = sqliteTable('team_memberships', {
  id:       text('id').primaryKey(),                         // nanoid
  teamId:   text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId:   text('user_id').notNull(),                       // Clerk userId
  role:     text('role', { enum: ['member', 'admin'] }).notNull().default('member'),
  joinedAt: integer('joined_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => ({
  uniqTeamUser: uniqueIndex('idx_team_memberships_team_user').on(t.teamId, t.userId),
  idxUserId:    index('idx_team_memberships_user_id').on(t.userId),
}))

export const artifacts = sqliteTable('artifacts', {
  id:               text('id').primaryKey(),                 // nanoid
  teamId:           text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  title:            text('title').notNull(),
  fileUrl:          text('file_url').notNull(),              // Vercel Blob URL — internal only, never returned to client
  fileName:         text('file_name').notNull(),             // Original filename — used for download fallback (FR27)
  fileType:         text('file_type').notNull(),             // MIME type: 'image/png', 'application/pdf', 'text/html', etc.
  sourceUrl:        text('source_url'),                      // nullable — optional originating tool link (FR13)
  summary:          text('summary'),                         // nullable — null while enrichment pending or if failed (FR23)
  enrichmentStatus: text('enrichment_status', { enum: ['pending', 'complete', 'failed'] }).notNull().default('pending'),
  createdBy:        text('created_by').notNull(),            // Clerk userId
  createdAt:        integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => ({
  idxTeamId:   index('idx_artifacts_team_id').on(t.teamId),
  idxCreatedBy: index('idx_artifacts_created_by').on(t.createdBy),
}))

export const artifactTags = sqliteTable('artifact_tags', {
  artifactId: text('artifact_id').notNull().references(() => artifacts.id, { onDelete: 'cascade' }),
  tag:        text('tag').notNull(),                         // always lowercase + trimmed (normalized on write — FR33)
}, (t) => ({
  pk: primaryKey({ columns: [t.artifactId, t.tag] }),
}))

export const comments = sqliteTable('comments', {
  id:         text('id').primaryKey(),                       // nanoid
  artifactId: text('artifact_id').notNull().references(() => artifacts.id, { onDelete: 'cascade' }),
  userId:     text('user_id').notNull(),                     // Clerk userId
  content:    text('content').notNull(),
  createdAt:  integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => ({
  idxArtifactId: index('idx_comments_artifact_id').on(t.artifactId),
}))

export const apiKeys = sqliteTable('api_keys', {
  id:        text('id').primaryKey(),                        // nanoid
  userId:    text('user_id').notNull(),                      // Clerk userId
  keyHash:   text('key_hash').notNull().unique(),            // SHA-256 hex of raw key; raw key never stored
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),  // null = active
}, (t) => ({
  idxUserId: index('idx_api_keys_user_id').on(t.userId),
}))
```

**Column design notes:**
- `timestamp_ms` mode: Drizzle stores as INTEGER (Unix epoch ms), maps to `Date` in TypeScript automatically
- `fileUrl` is the Vercel Blob internal URL — it is read only in `app/api/files/[artifactId]/route.ts` and never serialized into any API response
- `fileName` is the original filename needed to set `Content-Disposition` in the file proxy (FR27 download fallback)
- `enrichmentStatus` drives the UI state: `pending` shows a spinner, `failed` shows the "Regenerate" button, `complete` shows tags and summary
- `artifactTags` is a junction table (no surrogate key); composite PK enforces uniqueness and enables efficient lookups by artifact
- One active API key per user is enforced at the application layer (generate revokes the previous key before inserting a new one) — not a DB constraint, for simplicity

---

### Gap 2 — `/api/enrich` Internal Protection

**Decision:** Add a shared secret (`ENRICH_SECRET`) to guard the internal enrichment endpoint against external invocation.

**Mechanism:**
- `ENRICH_SECRET` is a hex string generated once per deployment (`openssl rand -hex 32`) and stored in Vercel env vars (and `.env.local` locally)
- The publish route passes it as a request header when firing the non-awaited enrichment call:
  ```typescript
  // Inside POST /api/teams/[teamId]/artifacts — fire-and-forget
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/enrich`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Enrich-Secret': process.env.ENRICH_SECRET!,
    },
    body: JSON.stringify({ artifactId }),
  }) // intentionally not awaited
  ```
- `/api/enrich` validates the header as its first operation:
  ```typescript
  if (request.headers.get('X-Enrich-Secret') !== process.env.ENRICH_SECRET) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 401 })
  }
  ```
- `ENRICH_SECRET` is added to `.env.example` alongside the other required variables
- The `NEXT_PUBLIC_APP_URL` env var (e.g. `https://artifact-hub.vercel.app`) is also required and already needed to construct absolute URLs in serverless functions where `request.url` may not be reliable

**Rationale:** The endpoint triggers a Claude API call per invocation. Without protection, any external actor with knowledge of the API could generate unbounded AI costs. The shared secret is trivial to implement and removes the risk entirely. The endpoint remains idempotent (safe to call multiple times), but now requires proof of internal origin.

**Environment variable additions:**
```
ENRICH_SECRET=        # openssl rand -hex 32
NEXT_PUBLIC_APP_URL=  # https://your-deployment.vercel.app
```

---

### Gap 3 — Keyword Search Mechanism (FR21)

**Decision:** SQL `LIKE` search across `title`, `summary`, and `tag` fields, team-scoped, with a 50-result cap.

**Query pattern (pseudocode — implement via Drizzle query builder):**

```sql
SELECT DISTINCT artifacts.*
FROM artifacts
LEFT JOIN artifact_tags ON artifacts.id = artifact_tags.artifact_id
WHERE artifacts.team_id IN (:userTeamIds)
  AND (
    artifacts.title   LIKE '%' || :query || '%'
    OR artifacts.summary LIKE '%' || :query || '%'
    OR artifact_tags.tag LIKE '%' || :query || '%'
  )
ORDER BY artifacts.created_at DESC
LIMIT 50
```

**Search rules:**

| Rule | Decision |
|------|----------|
| Search fields | `title`, `summary`, `artifact_tags.tag` — all three |
| Case sensitivity | SQLite `LIKE` is case-insensitive for ASCII by default — no preprocessing needed |
| Team scope | Always filters to `artifacts.team_id IN (user's teamIds)` — never cross-team (FR21) |
| Combined with filters | Keyword search is additive with tag/fileType/team filters via `AND` — all can be combined in one query |
| Empty query string | Returns all team artifacts (standard gallery browse — FR19); no keyword clause added |
| Result limit | 50 artifacts max — no pagination at MVP scale of 500 artifacts |
| MCP `search_artifacts` | Same query, same 50-result limit; returns `{ artifacts: [...], count: N }` |
| Post-MVP path | Replace `LIKE` with Turso native vector search for semantic/natural language queries |

**API endpoint:** `GET /api/teams/[teamId]/artifacts?q=keyword&tag=strategy&fileType=pdf` — all params optional and composable.

**MCP tool signature (search_artifacts):**
```json
{
  "name": "search_artifacts",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query":    { "type": "string", "description": "Keyword to search in title, summary, and tags" },
      "tag":      { "type": "string", "description": "Filter by a specific tag (exact match after normalization)" },
      "fileType": { "type": "string", "description": "Filter by MIME type (e.g. application/pdf)" },
      "teamSlug": { "type": "string", "description": "Restrict results to a specific team slug (optional — defaults to all user teams)" }
    }
  }
}
```

---

### Gap 4 — MCP Server Build Process & Claude Desktop Configuration

**Decision:** Local TypeScript build, documented setup, environment-variable-based configuration.

**`mcp-server/` structure and build:**

```
mcp-server/
├── index.ts          # Entry point: stdio transport, tool registration
├── tools.ts          # publish_artifact, search_artifacts, get_artifact
├── api-client.ts     # HTTP client wrapping deployed /api/* endpoints
├── tsconfig.json     # Extends root; target ES2022, module NodeNext, outDir dist/
└── package.json      # { "build": "tsc", "start": "node dist/index.js" }
```

**`mcp-server/tsconfig.json`:**
```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["*.ts"]
}
```

**Build commands:**
```bash
# Build MCP server only
cd mcp-server && npm install && npm run build

# Convenience script added to root package.json
"build:mcp": "cd mcp-server && npm install && npm run build"
```

**MCP server runtime environment variables** (passed via Claude Desktop config `env` block):

| Variable | Description |
|----------|-------------|
| `ARTIFACT_HUB_API_URL` | Base URL of deployed app, e.g. `https://artifact-hub.vercel.app` |
| `ARTIFACT_HUB_API_KEY` | User's personal API key generated from Hub settings page |

**Claude Desktop config** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
```json
{
  "mcpServers": {
    "artifact-hub": {
      "command": "node",
      "args": ["/absolute/path/to/repo-root/mcp-server/dist/index.js"],
      "env": {
        "ARTIFACT_HUB_API_URL": "https://your-deployment.vercel.app",
        "ARTIFACT_HUB_API_KEY": "your-api-key-from-settings-page"
      }
    }
  }
}
```

> On Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**One-time setup steps** (to be reproduced verbatim in `README.md`):
1. Clone the repo and run `npm install` from the root
2. Run `npm run build:mcp` to compile the MCP server
3. Log into Artifact Hub and generate an API key from the Settings page
4. Locate or create the Claude Desktop config file at the path above
5. Add the `mcpServers.artifact-hub` block, substituting the absolute path to `mcp-server/dist/index.js` and your API key
6. Restart Claude Desktop — the `artifact-hub` server appears in the tools list

**Post-MVP option (npx):** Publish `@artifact-hub/mcp-server` to npm; replace `command`/`args` with `"command": "npx"` and `"args": ["--yes", "@artifact-hub/mcp-server"]` to eliminate build step for end users. Deferred — local build is fastest for 2-day timebox.
