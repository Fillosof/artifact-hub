# Story 1.2: Database Schema & Turso Integration

Status: done

## Story

As a developer,
I want the full Drizzle schema defined and connected to a Turso database,
So that all downstream stories have a stable, typed data layer to work with.

## Acceptance Criteria

1. **Given** `lib/schema.ts` **When** I inspect the file **Then** it defines exactly six tables: `teams`, `team_memberships`, `artifacts`, `artifact_tags`, `comments`, `api_keys` — all matching the column definitions, types, constraints, and index names specified in Architecture Gap 1.

2. **Given** `lib/db.ts` **When** the module is imported **Then** it exports a single Drizzle client connected to Turso using `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` from environment variables; no other module creates a Drizzle client or Turso connection directly.

3. **Given** `drizzle.config.ts` **When** I run `npx drizzle-kit push` **Then** all six tables are created in the Turso database without errors.

4. **Given** a TypeScript file that imports from `lib/schema.ts` **When** I access any table's `$inferSelect` or `$inferInsert` type **Then** TypeScript provides full type inference matching the schema columns with no `any` types.

5. **Given** the schema **When** I inspect ID columns across all tables **Then** all IDs are `text` type (nanoid-compatible), not auto-increment integers or UUIDs.

## Tasks / Subtasks

- [x] Task 1: Add nanoid as an explicit dependency (AC: #5)
  - [x] Run `npm install nanoid` to add it as a direct dependency (currently only a transitive dep from postcss; must be explicit per ARCH11)
  - [x] Verify `import { nanoid } from 'nanoid'` works in TypeScript with no type errors

- [x] Task 2: Implement `lib/schema.ts` with the full Drizzle schema (AC: #1, #4, #5)
  - [x] Replace the placeholder with the exact six-table schema from Architecture Gap 1
  - [x] Verify each table has correct column types, constraints, and index/unique definitions
  - [x] Confirm all ID columns are `text` (nanoid-compatible), not integer
  - [x] Confirm `timestamp_ms` mode is used for all date/timestamp columns

- [x] Task 3: Implement `lib/db.ts` — Drizzle + Turso client (AC: #2)
  - [x] Replace the placeholder with a real `createClient` call using env vars
  - [x] Export a single `db` instance via `drizzle(client, { schema })`
  - [x] Verify the module is the only place a Turso connection is created (search codebase for any other `createClient` calls)

- [x] Task 4: Verify `drizzle.config.ts` is correct (AC: #3)
  - [x] Confirm `dialect: 'turso'`, `schema: './lib/schema.ts'`, `out: './drizzle'` are set
  - [x] Confirm `dbCredentials` references `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
  - [x] No changes needed — file was created correctly in Story 1.1

- [x] Task 5: Push schema to Turso and verify (AC: #3, #4)
  - [x] Ensure `.env.local` has valid `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` values
  - [x] Run `npx drizzle-kit push` and confirm all six tables are created without errors
  - [x] Run `npm run build` to confirm TypeScript compiles without errors

- [x] Task 6: Write unit tests for schema type inference (AC: #4, #5)
  - [x] Create `lib/__tests__/schema.test.ts`
  - [x] Assert `$inferSelect` types for `artifacts`, `teams`, and `apiKeys` have the expected key shapes (use `satisfies` or type-level assertions via `expectTypeOf`)
  - [x] Assert all ID columns are typed as `string` (not `number`)
  - [x] Run `npm test` — all tests must pass with zero errors

## Dev Notes

### nanoid Installation

nanoid is currently available only as a transitive dependency from Next.js/postcss (`^3.3.11`). It **must** be added as an explicit direct dependency because all new entity IDs in this project use nanoid (ARCH11):

```bash
npm install nanoid
```

Import syntax (nanoid v3 — ESM but also CJS compatible):
```typescript
import { nanoid } from 'nanoid'
```

> [Source: docs/planning-artifacts/architecture.md#Format Patterns — IDs: nanoid (short, URL-safe)]

### lib/schema.ts — Exact Implementation

Replace the placeholder stub entirely with the schema below. **This is the canonical schema for the entire project — every subsequent story reads from this file. Do not deviate from column names, types, or index names.**

```typescript
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
  fileUrl:          text('file_url').notNull(),              // Vercel Blob URL — internal only, NEVER returned to client
  fileName:         text('file_name').notNull(),             // Original filename — used for Content-Disposition (FR27)
  fileType:         text('file_type').notNull(),             // MIME type: 'image/png', 'application/pdf', 'text/html', etc.
  sourceUrl:        text('source_url'),                      // nullable — optional originating tool link (FR13)
  summary:          text('summary'),                         // nullable — null while enrichment pending or if failed (FR23)
  enrichmentStatus: text('enrichment_status', { enum: ['pending', 'complete', 'failed'] }).notNull().default('pending'),
  createdBy:        text('created_by').notNull(),            // Clerk userId
  createdAt:        integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => ({
  idxTeamId:    index('idx_artifacts_team_id').on(t.teamId),
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

**Key design notes:**

| Detail | Explanation |
|--------|-------------|
| `timestamp_ms` mode | Drizzle stores as INTEGER (Unix epoch ms), maps to `Date` in TypeScript automatically |
| `fileUrl` | Vercel Blob internal URL — read ONLY in `app/api/files/[artifactId]/route.ts`, never serialized to client |
| `fileName` | Original filename for `Content-Disposition` header in file proxy (FR27 download fallback) |
| `enrichmentStatus` | Drives UI: `pending` → skeleton/spinner, `failed` → "Regenerate" button, `complete` → show tags+summary |
| `artifactTags` | Junction table with composite PK — no surrogate `id`; composite PK enforces uniqueness per artifact+tag |
| API key uniqueness | One active key per user is enforced at application layer (generate revokes previous before inserting new) — no DB constraint |

> [Source: docs/planning-artifacts/architecture.md#Resolved Implementation Gaps — Gap 1]

### lib/db.ts — Exact Implementation

Replace the placeholder stub with:

```typescript
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export const db = drizzle(client, { schema })
```

**Critical rules:**
- This is the **only** place in the entire codebase where `createClient` is called or a Turso connection is created
- The `schema` object is passed to `drizzle()` so that relational queries work correctly in later stories
- Do NOT add any connection pooling, retry logic, or health checks — Turso handles this server-side
- `process.env.TURSO_DATABASE_URL!` and `process.env.TURSO_AUTH_TOKEN!` use the non-null assertion because these vars are guaranteed to exist in deployed environments (Vercel env vars) and in `.env.local` locally

> [Source: docs/planning-artifacts/architecture.md#Data Boundary — Only lib/db.ts creates the Drizzle client]

### drizzle.config.ts — Already Correct

The file created in Story 1.1 is already correct:

```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
} satisfies Config
```

No changes required. `dialect: 'turso'` is required for `@libsql/client` (not `sqlite` or `postgresql`).

> [Source: docs/implementation-artifacts/1-1-project-initialization-dependency-installation.md#Task 3]

### Running drizzle-kit push

```bash
npx drizzle-kit push
```

This command creates all six tables in the Turso database directly (no migration files generated). Use this for development. For production deployments, the Vercel build pipeline should run `npx drizzle-kit push` as a pre-build step.

**Expected output:** Each table creation confirmed with no errors. If tables already exist and schema matches, no-op.

**If you get env var errors:** Ensure `.env.local` has valid values for `TURSO_DATABASE_URL` (format: `libsql://your-db.turso.io`) and `TURSO_AUTH_TOKEN`.

### TypeScript Inference Validation

After implementing the schema, TypeScript should infer all types correctly with no `any`. Example usage pattern that must compile:

```typescript
import { teams, artifacts } from '@/lib/schema'

// $inferSelect — type of a row returned from a SELECT query
type Team = typeof teams.$inferSelect        // { id: string; name: string; slug: string; createdBy: string; createdAt: Date }
type Artifact = typeof artifacts.$inferSelect // { id: string; teamId: string; title: string; ... enrichmentStatus: 'pending' | 'complete' | 'failed'; ... }

// $inferInsert — type of a row passed to an INSERT
type NewTeam = typeof teams.$inferInsert     // { id: string; name: string; slug: string; createdBy: string; createdAt: Date }
```

> [Source: docs/planning-artifacts/architecture.md#Pattern Completeness — TypeScript strict mode]

### Project Structure Notes

**Files modified in this story:**

| File | Action |
|------|--------|
| `lib/schema.ts` | Replace stub → full 6-table Drizzle schema |
| `lib/db.ts` | Replace stub → real `drizzle(createClient(...), { schema })` |
| `package.json` | Add `nanoid` as explicit direct dependency |

**Files NOT touched in this story:**

| File | Reason |
|------|--------|
| `drizzle.config.ts` | Already correct from Story 1.1 |
| `lib/auth.ts` | Stub only — full implementation in Story 1.4 |
| `lib/types.ts` | Stub only — shared types added as-needed in later stories |
| `lib/enrichment.ts` | Stub only — Claude API implementation in Story 3.3 |
| `middleware.ts` | Pass-through stub — Clerk wired in Story 1.3 |
| Any `app/` or `components/` files | No UI work in this story |

**Architecture boundary to enforce:**

> ONLY `lib/db.ts` creates the Drizzle client. If any other file calls `createClient()` or `drizzle()`, that is a violation to fix immediately.

> [Source: docs/planning-artifacts/architecture.md#Data Boundary]

### Previous Story Intelligence (Story 1.1)

**Patterns established:**
- All stubs were created correctly — replace them; do not create new files alongside them
- `@/*` import alias is configured — use `@/lib/schema`, `@/lib/db` in all imports
- TypeScript `strict: true` is set in `tsconfig.json` — no `any` allowed without documentation
- shadcn/ui installed with zinc base color — no UI components needed for this story
- `.env.local` with real Turso credentials was created in Story 1.1 — verify it exists before attempting `drizzle-kit push`

**Packages already installed (relevant to this story):**
- `drizzle-orm@^0.45.2` — ORM with `sqliteTable`, `text`, `integer`, etc. from `drizzle-orm/sqlite-core`
- `@libsql/client@^0.17.2` — Turso driver; import `createClient` from `@libsql/client`
- `drizzle-kit@^0.31.10` (dev) — for `drizzle-kit push`

**Note:** The `drizzle-orm/sqlite-core` import is correct for Turso (Turso uses the SQLite wire protocol). Do NOT use `drizzle-orm/pg-core` or any other dialect.

> [Source: docs/implementation-artifacts/1-1-project-initialization-dependency-installation.md]

### References

- [Source: docs/planning-artifacts/architecture.md#Resolved Implementation Gaps — Gap 1] — Exact column-level schema
- [Source: docs/planning-artifacts/architecture.md#Data Architecture] — Migration strategy, schema-first approach
- [Source: docs/planning-artifacts/architecture.md#Data Boundary] — Single db.ts rule
- [Source: docs/planning-artifacts/architecture.md#Naming Patterns] — DB naming conventions (snake_case tables, idx_ prefix indexes)
- [Source: docs/planning-artifacts/epics.md#Story 1.2] — Acceptance criteria
- [Source: docs/implementation-artifacts/1-1-project-initialization-dependency-installation.md] — Previous story patterns and installed packages

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Task 5: `npx drizzle-kit push` completed successfully — all 6 tables created in Turso.

### Completion Notes List

- ✅ Task 1: nanoid v5.1.7 already present as direct dep in `package.json`; confirmed `import('nanoid')` works at runtime.
- ✅ Task 2: `lib/schema.ts` replaced with exact 6-table schema (teams, teamMemberships, artifacts, artifactTags, comments, apiKeys) matching Architecture Gap 1 exactly. All IDs are `text`, all timestamps use `timestamp_ms` mode, composite PK on `artifact_tags`, proper uniqueIndex/index definitions.
- ✅ Task 3: `lib/db.ts` replaced with real Drizzle+Turso client. `createClient` is called only here — no other file creates a Turso connection.
- ✅ Task 4: `drizzle.config.ts` already correct — `dialect: 'turso'`, `schema: './lib/schema.ts'`, correct dbCredentials.
- ✅ Task 5: `npx drizzle-kit push` succeeded — all 6 tables created in Turso without errors.
- ✅ Task 6: `lib/__tests__/schema.test.ts` created with 8 tests. All pass. Tests assert `$inferSelect`/`$inferInsert` shapes for teams, artifacts, apiKeys; all ID types are `string`; enrichmentStatus and role are narrowed union types; artifactTags has no surrogate id.

### File List

- `lib/schema.ts` — replaced stub with full 6-table Drizzle schema
- `lib/db.ts` — replaced stub with real `drizzle(createClient(...), { schema })` client
- `lib/__tests__/schema.test.ts` — new: 8 schema type-inference unit tests
