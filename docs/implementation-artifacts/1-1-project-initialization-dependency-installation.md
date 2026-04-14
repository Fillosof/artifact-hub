# Story 1.1: Project Initialization & Dependency Installation

Status: review

## Story

As a developer,
I want the project initialized from `create-next-app` with all required dependencies installed and verified,
So that every subsequent story has a consistent, correct foundation to build on.

## Acceptance Criteria

1. **Given** a clean working directory **When** I run the create-next-app command **Then** the project scaffolds with TypeScript strict mode, Tailwind CSS v4, ESLint, App Router, and the `@/*` import alias.

2. **Given** the scaffolded project **When** I install all required packages **Then** all packages install without peer dependency conflicts and the project builds cleanly (`npm run build`).

3. **Given** the installed project **When** I inspect the project structure **Then** the directory tree matches the architecture specification: `app/`, `components/`, `lib/`, `mcp-server/` directories exist with placeholder files; `middleware.ts`, `drizzle.config.ts`, `.env.example`, `.env.local` (gitignored), and `WRITEUP.md` are present at the root.

4. **Given** the project **When** I run `npm run dev` **Then** the development server starts on localhost without errors and the default Next.js landing page renders.

5. **Given** `.env.example` **When** I inspect it **Then** it contains all required variable stubs: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `BLOB_READ_WRITE_TOKEN`, `ANTHROPIC_API_KEY`, `ENRICH_SECRET`, `NEXT_PUBLIC_APP_URL`.

## Tasks / Subtasks

- [x] Task 1: Initialize Next.js project (AC: #1)
  - [x] Run `npx create-next-app@latest artifact-hub --typescript --tailwind --eslint --app --turbopack --import-alias "@/*"` in the workspace root
  - [x] Verify the dev server starts (`npm run dev`) and renders the default landing page

- [x] Task 2: Install all layered dependencies (AC: #2)
  - [x] Install auth: `npm install @clerk/nextjs`
  - [x] Install database: `npm install drizzle-orm @libsql/client && npm install -D drizzle-kit`
  - [x] Install file storage: `npm install @vercel/blob`
  - [x] Install MCP SDK: `npm install @modelcontextprotocol/sdk`
  - [x] Install AI: `npm install @anthropic-ai/sdk`
  - [x] Initialize shadcn/ui: `npx shadcn@latest init` (accept defaults, use zinc as base color)
  - [x] Verify `npm run build` succeeds with no errors

- [x] Task 3: Create the required directory structure with placeholder files (AC: #3)
  - [x] Create `components/` with a `.gitkeep` placeholder
  - [x] Create `lib/auth.ts` placeholder (export stub `resolveAuth`)
  - [x] Create `lib/db.ts` placeholder (export stub `db`)
  - [x] Create `lib/schema.ts` placeholder (empty exports)
  - [x] Create `lib/types.ts` placeholder (empty exports)
  - [x] Create `lib/enrichment.ts` placeholder (export stub `enrichArtifact`)
  - [x] Create `mcp-server/` directory with `index.ts`, `tools.ts`, `api-client.ts` placeholders and its own `package.json` + `tsconfig.json`
  - [x] Create `middleware.ts` at root with a pass-through stub (Clerk middleware wire-up done in Story 1.3)
  - [x] Create `drizzle.config.ts` with correct Turso connection config (real implementation in Story 1.2)
  - [x] Add `WRITEUP.md` at root with a challenge placeholder entry

- [x] Task 4: Create environment variable files (AC: #5)
  - [x] Create `.env.example` with all 8 required variable stubs (empty values)
  - [x] Create `.env.local` with actual dev values (gitignored)
  - [x] Confirm `.gitignore` includes `.env.local`

- [x] Task 5: Final verification (AC: #2, #3, #4)
  - [x] Run `npm run build` — must pass with 0 errors
  - [x] Run `npm run dev` — dev server starts cleanly on localhost:3000

## Dev Notes

### Exact Initialization Command

```bash
npx create-next-app@latest artifact-hub --typescript --tailwind --eslint --app --turbopack --import-alias "@/*"
```

Run this command from the workspace root. When prompted interactively, answer:
- **Use src/ directory?** → No
- **Customize import alias?** → `@/*` (already set by flag, just confirm)

> [Source: docs/planning-artifacts/architecture.md#Selected Starter]

### Dependency Installation Order and Commands

```bash
# Auth
npm install @clerk/nextjs

# Database (ORM + driver + dev tooling)
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit

# File storage
npm install @vercel/blob

# MCP server
npm install @modelcontextprotocol/sdk

# AI enrichment
npm install @anthropic-ai/sdk

# UI component library — run interactive init, choose zinc base color
npx shadcn@latest init
```

> [Source: docs/planning-artifacts/architecture.md#Selected Starter]

### Verified Package Versions (April 2026)

| Package | Version | Notes |
|---------|---------|-------|
| Next.js | 16.2.3 | App Router, React 19, Turbopack |
| @clerk/nextjs | 7.0.11 | Core 3 API — **not** v4/v5 patterns |
| drizzle-orm + drizzle-kit | latest | Schema-first |
| @libsql/client | latest | Turso/libSQL driver |
| @vercel/blob | ≥ 2.3 | Private storage support required |
| @modelcontextprotocol/sdk | 1.29.0 | MCP protocol compliance |
| shadcn/ui CLI | v4 (March 2026) | Tailwind v4, React 19 compat |
| TypeScript | 5.x | Strict mode |
| Tailwind CSS | v4 | Bundled in create-next-app |

> [Source: docs/planning-artifacts/architecture.md#Verified Current Versions]

**CRITICAL:** Clerk 7.x (Core 3) has different APIs from v4 and v5. Do NOT copy Clerk examples from docs predating March 2026. The correct import is `@clerk/nextjs`, middleware setup uses `clerkMiddleware()` from `@clerk/nextjs/server`.

### Required Directory Structure

After this story, the repo must match exactly:

```

├── app/
│   ├── globals.css
│   ├── layout.tsx                          # Root layout (ClerkProvider added in Story 1.3)
│   ├── page.tsx                            # Default Next.js landing (replaced in Epic 4)
│   ├── sign-in/[[...sign-in]]/
│   │   └── page.tsx                        # Placeholder (implemented in Story 1.3)
│   └── sign-up/[[...sign-up]]/
│       └── page.tsx                        # Placeholder (implemented in Story 1.3)
├── components/
│   └── ui/                                 # shadcn installs base components here
├── lib/
│   ├── auth.ts                             # Stub only — full implementation in Story 1.4
│   ├── db.ts                               # Stub only — full implementation in Story 1.2
│   ├── schema.ts                           # Stub only — full implementation in Story 1.2
│   ├── types.ts                            # Stub only — full types added as needed
│   └── enrichment.ts                       # Stub only — full implementation in Story 3.3
├── mcp-server/
│   ├── index.ts                            # Stub
│   ├── tools.ts                            # Stub
│   ├── api-client.ts                       # Stub
│   ├── package.json                        # Separate deps
│   └── tsconfig.json                       # Separate TS config (extends root)
├── middleware.ts                            # Pass-through stub — Clerk wired in Story 1.3
├── drizzle.config.ts                       # Config skeleton referencing env vars
├── next.config.ts                          # Default from create-next-app
├── tailwind.config.ts                      # Default (Tailwind v4)
├── tsconfig.json                           # TypeScript strict mode (verify strict: true)
├── package.json
├── .env.local                              # Gitignored, real dev vars
├── .env.example                            # All 8 variable stubs, empty values
├── .gitignore                              # Must include .env.local
└── WRITEUP.md                              # Challenge deliverable placeholder
```

> [Source: docs/planning-artifacts/architecture.md#Complete Project Directory Structure]

### Placeholder File Content Stubs

**`lib/auth.ts`** (stub — full implementation in Story 1.4):
```typescript
// Placeholder: Full resolveAuth implementation in Story 1.4
export async function resolveAuth(_request: Request): Promise<{ userId: string; teamIds: string[] }> {
  throw new Error('resolveAuth not yet implemented')
}
```

**`lib/db.ts`** (stub — full implementation in Story 1.2):
```typescript
// Placeholder: Drizzle + Turso client in Story 1.2
export const db = null as unknown as import('drizzle-orm/libsql').LibSQLDatabase
```

**`lib/schema.ts`** (stub — full Drizzle schema in Story 1.2):
```typescript
// Placeholder: Full schema defined in Story 1.2
// See docs/planning-artifacts/architecture.md#Gap 1 for exact column definitions
```

**`lib/enrichment.ts`** (stub — full implementation in Story 3.3):
```typescript
// Placeholder: Claude API enrichment in Story 3.3
export async function enrichArtifact(_artifactId: string): Promise<void> {
  throw new Error('enrichArtifact not yet implemented')
}
```

**`middleware.ts`** (pass-through stub — Clerk wired in Story 1.3):
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Placeholder: Clerk middleware added in Story 1.3
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**`drizzle.config.ts`** (skeleton — push command used in Story 1.2):
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

**`mcp-server/package.json`**:
```json
{
  "name": "artifact-hub-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "index.ts",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "1.29.0"
  }
}
```

**`mcp-server/tsconfig.json`**:
```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": ".",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["./**/*.ts"]
}
```

**`.env.example`**:
```
# Turso database
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# Clerk authentication
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

# Vercel Blob storage
BLOB_READ_WRITE_TOKEN=

# AI enrichment
ANTHROPIC_API_KEY=

# Internal enrichment route protection (generate: openssl rand -hex 32)
ENRICH_SECRET=

# Absolute app URL (e.g. https://artifact-hub.vercel.app or http://localhost:3000)
NEXT_PUBLIC_APP_URL=
```

**`WRITEUP.md`**:
```markdown
# Artifact Hub — Challenge Write-Up

_To be completed at submission._

## What I Built

## Technical Decisions

## Trade-offs and What I'd Do Differently

## Running Locally
```

### TypeScript Strict Mode Verification

After scaffolding, open `tsconfig.json` and confirm:
```json
{
  "compilerOptions": {
    "strict": true
    ...
  }
}
```

`create-next-app` sets this by default. Do NOT weaken it. All subsequent stories depend on strict mode being active.

> [Source: docs/planning-artifacts/architecture.md#Implementation Patterns — NFR25]

### shadcn/ui Init Configuration

When running `npx shadcn@latest init`, configure as follows:
- **Style:** Default (New York or Default — either is fine)
- **Base color:** Zinc (matches UX-DR10 monochrome zinc color system)
- **CSS variables:** Yes
- **Tailwind config:** Existing (do not overwrite if already configured)

The init command adds `components/ui/` directory. Do NOT manually add shadcn components beyond what the init installs — individual components are added in later stories when they are needed.

> [Source: docs/planning-artifacts/ux-design-specification.md — UX-DR10]

### What NOT to Build in This Story

This story is ONLY about scaffolding and dependencies. Do **not** implement:
- Clerk middleware or auth routes (Story 1.3)
- Drizzle schema or DB connection (Story 1.2)
- Any API routes (Stories 1.4+)
- Any UI pages beyond the default Next.js landing page
- The `resolveAuth` helper logic (Story 1.4)

Placeholder stubs are explicit "not yet implemented" — resist the urge to implement early.

### Project Structure Notes

- `app/` — Next.js 16 App Router convention; all pages and API routes go here. Do **not** create a `src/` directory (the `--no-src-dir` behavior is already the default when not specifying `--src-dir`).
- `lib/` — All shared server-side logic; no `utils/` or `helpers/` junk-drawer files.
- `mcp-server/` — Standalone Node process; lives at the repo root alongside `app/`, not inside it.
- `components/ui/` — Created by shadcn init; never edit these files directly, use the shadcn CLI to add/update components.
- File naming convention throughout the project: `kebab-case.ts` / `kebab-case.tsx` for files; `PascalCase` for exported components.

> [Source: docs/planning-artifacts/architecture.md#Structure Patterns]

### References

- [Source: docs/planning-artifacts/architecture.md#Selected Starter] — Initialization command and dependency list
- [Source: docs/planning-artifacts/architecture.md#Verified Current Versions] — Locked package versions
- [Source: docs/planning-artifacts/architecture.md#Complete Project Directory Structure] — Full directory tree
- [Source: docs/planning-artifacts/architecture.md#Gap 1] — Drizzle schema (referenced in Story 1.2)
- [Source: docs/planning-artifacts/architecture.md#Gap 2] — ENRICH_SECRET mechanism
- [Source: docs/planning-artifacts/epics.md#Story 1.1] — Acceptance criteria source
- [Source: docs/planning-artifacts/ux-design-specification.md — UX-DR10] — Zinc base color for shadcn

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Build output: `next build` → 0 errors, 0 type errors. Deprecation warning: `middleware.ts` → `proxy.ts` in Next.js 16.2.3 (advisory only, non-blocking; Story 1.3 will address when wiring Clerk).
- `shadcn@latest init --defaults` uses `base-nova` style with `neutral` color by default; manually updated `components.json` `baseColor` to `zinc` per UX-DR10.
- `.gitignore` uses `.env*` wildcard — covers `.env.local`.

### Completion Notes List

- ✅ Project scaffolded: Next.js 16.2.3, TypeScript strict mode, Tailwind v4, ESLint, App Router, `@/*` alias.
- ✅ All dependencies installed: `@clerk/nextjs`, `drizzle-orm`, `@libsql/client`, `drizzle-kit`, `@vercel/blob`, `@modelcontextprotocol/sdk`, `@anthropic-ai/sdk`, `shadcn/ui`.
- ✅ Directory structure matches architecture spec: `app/`, `components/ui/`, `lib/`, `mcp-server/`.
- ✅ Placeholder stubs created for `lib/auth.ts`, `lib/db.ts`, `lib/schema.ts`, `lib/types.ts`, `lib/enrichment.ts`, `mcp-server/index.ts`, `mcp-server/tools.ts`, `mcp-server/api-client.ts`, `middleware.ts`, `drizzle.config.ts`.
- ✅ `.env.example` with all 8 required stubs; `.env.local` created (gitignored via `.env*`).
- ✅ `WRITEUP.md` placeholder at repo root.
- ✅ `npm run build` succeeds in 2.2s; dev server ready in 310ms.
- ⚠️ Note for Story 1.3: Next.js 16.2.3 deprecates `middleware.ts` in favour of `proxy.ts`. Verify Clerk 7.x convention before renaming.

### File List

- `app/layout.tsx` (scaffolded)
- `app/page.tsx` (scaffolded)
- `app/globals.css` (modified by shadcn init)
- `app/sign-in/[[...sign-in]]/page.tsx` (created)
- `app/sign-up/[[...sign-up]]/page.tsx` (created)
- `components/ui/button.tsx` (created by shadcn)
- `lib/utils.ts` (created by shadcn)
- `lib/auth.ts` (created — stub)
- `lib/db.ts` (created — stub)
- `lib/schema.ts` (created — stub)
- `lib/types.ts` (created — stub)
- `lib/enrichment.ts` (created — stub)
- `mcp-server/index.ts` (created — stub)
- `mcp-server/tools.ts` (created — stub)
- `mcp-server/api-client.ts` (created — stub)
- `mcp-server/package.json` (created)
- `mcp-server/tsconfig.json` (created)
- `middleware.ts` (created — pass-through stub)
- `drizzle.config.ts` (created)
- `components.json` (created by shadcn; baseColor updated to zinc)
- `.env.example` (created)
- `.env.local` (created — gitignored)
- `WRITEUP.md` (created)
- `package.json` (scaffolded + packages added)
- `tsconfig.json` (scaffolded)
- `.gitignore` (scaffolded)
